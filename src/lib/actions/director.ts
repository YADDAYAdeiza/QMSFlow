"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateORR } from '@/lib/actions/riskEngine';
import { sendOversightEmail } from "@/lib/utils/mail"; // Wired email pipeline

/**
 * Moves application from Director to the Technical DD (Divisional Deputy Director)
 * Handles the QMS Handover Clock and updates JSONB details for both Round 1 & 2.
 */
export async function assignToDDD(
  appId: number, 
  divisions: string[], 
  comment: string, 
  headId?: string,
  sendEmail: boolean = false // Captured state flag from toggle slider
) {
  try {
    return await db.transaction(async (tx) => {
      
      // 1. Fetch current application to detect context (Round 1 vs Round 2)
      const currentApp = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });

      if (!currentApp) throw new Error("Application not found");

      const isRound2 = currentApp.type === "Inspection Report Review (Foreign)";
      
      const directorMinute = {
        from: "Director",
        role: "Director",
        text: comment,
        round: isRound2 ? 2 : 1,
        action: isRound2 ? "COMPLIANCE_REVIEW_DIRECTION" : "TECHNICAL_DIRECTION",
        division: divisions[0],
        timestamp: new Date().toISOString()
      };

      // 2. Update Application Point and JSONB Details
      await tx.update(applications)
        .set({ 
          currentPoint: 'Technical DD Review',
          details: sql`
            jsonb_set(
              jsonb_set(
                jsonb_set(
                  COALESCE(details, '{}'::jsonb), 
                  '{assignedDivisions}', 
                  ${JSON.stringify(divisions)}::jsonb
                ),
                '{division}', 
                ${JSON.stringify(divisions[0])}::jsonb
              ),
              '{comments}',
              (COALESCE(details->'comments', '[]'::jsonb)) || ${JSON.stringify([directorMinute])}::jsonb
            )
          `
        })
        .where(eq(applications.id, appId));

      // 3. Close Director's Timeline
      await tx.update(qmsTimelines)
        .set({ endTime: sql`now()` })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Director Review'),
          isNull(qmsTimelines.endTime)
        ));

      // 4. Start DD Review Timeline
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: headId || null, 
        division: divisions[0],
        point: 'Technical DD Review',
        startTime: sql`now()`,
        details: {
          previousStep: 'Director Review',
          actionRequested: isRound2 ? 'Compliance Report Vetting' : 'Technical Review',
          handoverBy: 'Director'
        }
      });

      // 5. Fire Optional Email Dispatch if toggle slider was enabled
      if (sendEmail) {
        let recipientEmail: string | undefined = undefined;
        
        if (headId) {
          const headUser = await tx.query.users.findFirst({
            where: eq(users.id, headId)
          });
          if (headUser?.email) recipientEmail = headUser.email;
        }

        const appDetails = (currentApp.details as any) || {};

        await sendOversightEmail({
          appNumber: currentApp.appNumber || `APP-${currentApp.id}`,
          type: isRound2 ? "Compliance Review Order" : "Technical Dossier Review",
          companyName: appDetails.companyName || "Regulatory Applicant",
          facilityName: appDetails.facilityName || "Inspected Facility Site",
          lodRemarks: comment,
          customRecipient: recipientEmail // Dispatches explicitly to the targeted Divisional Deputy Director
        });
      }

      revalidatePath("/dashboard/director");
      revalidatePath("/dashboard/ddd"); 
      
      return { success: true };
    });
  } catch (error: any) {
    console.error("QMS Handover Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Final Clearance Action
 * Triggered by the Director to conclude a round.
 * Pass 1: Moves to Registry/Hub for Pass 2 prep.
 * Pass 2: Finalizes Risk and completes the application.
 */
export async function issueFinalClearance(
  appId: number, 
  remarks: string, 
  publicUrl: string, 
  metadataUpdate: any,
  directorId: string 
) {
  try {
    // 1. Fetch current application and the Director's user record in parallel
    const [app, directorRecord] = await Promise.all([
      db.query.applications.findFirst({ where: eq(applications.id, appId) }),
      db.query.users.findFirst({ where: eq(users.id, directorId) })
    ]);

    if (!app) throw new Error("Application not found");
    if (!directorRecord) throw new Error("Director user record not found");

    const currentDetails = (app.details as any) || {};
    const currentComments = currentDetails.comments || [];

    // 2. Identify the action for the trail
    const isPass2 = !!metadataUpdate.gmp_certificate_url;
    const actionLabel = isPass2 ? "FINAL_CLEARANCE_ISSUED" : "TECHNICAL_PASS_CLEARED";

    // 3. Create the audit trail entry using the real Director's name
    const newComment = {
      from: directorRecord.name, 
      role: directorRecord.role || "Director",
      text: remarks,
      action: actionLabel,
      timestamp: new Date().toISOString(),
      attachmentUrl: publicUrl
    };

    // 4. Update the DB with the merged details and complete the QMS timeline
    await Promise.all([
      // A. Update application status to archive it out
      db.update(applications)
        .set({
          details: {
            ...currentDetails,
            ...metadataUpdate, 
            comments: [...currentComments, newComment]
          },
          status: "CLEARED",
          updatedAt: new Date()
        })
        .where(eq(applications.id, appId)),

      // B. Clock out the active QMS timeline tracker for the Director's current view
      db.update(qmsTimelines)
        .set({
          endTime: new Date() // Concludes the desk time tracking metric session
        })
        .where(
          and(
            eq(qmsTimelines.applicationId, appId),
            isNull(qmsTimelines.endTime) // Safely targeted only at the open tracker session
          )
        )
    ]);

    revalidatePath('/dashboard/director');
    revalidatePath('/dashboard/lod');

    return { success: true };
  } catch (error: any) {
    console.error("Issuance Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Rejects application and moves back to LOD with CAPA requirements.
 */
export async function rejectAndIssueCAPA(
  appId: number, 
  directorRemarks: string, 
  storagePath: string
) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;

      // 1. Fetch current application
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 2. Create the Rejection Entry for the Audit Trail
      const rejectionEntry = {
        from: "Director General",
        role: "Director",
        text: directorRemarks,
        timestamp: new Date().toISOString(),
        action: "REJECTED_WITH_CAPA",
        archive_path: storagePath
      };

      const updatedDetails = {
        ...oldDetails,
        capa_letter_path: storagePath,
        rejection_date: new Date().toISOString(),
        comments: [...oldComments, rejectionEntry] 
      };

      // 3. Update Status and Move back to LOD
      await tx.update(applications)
        .set({
          status: 'REJECTED_PENDING_CAPA',
          currentPoint: 'LOD', // Pushes back to intake for communication
          details: updatedDetails,
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // 4. QMS: Stop Director's Clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 5. QMS: Start LOD Clock (Follow-up phase)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "LOD",
        startTime: dbNow,
        details: { status: "Awaiting Company CAPA Response" }
      });

      revalidatePath('/dashboard/director');
      return { success: true };
    });
  } catch (err: any) {
    console.error("REJECTION_ACTION_ERROR:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Return to Staff or DD for rework tracking mechanisms.
 */
export async function returnToStaffFromDirector(
  appId: number, 
  note: string, 
  targetUserId: string, 
  directorUserId: string 
) {
  try {
    return await db.transaction(async (tx) => {
      const targetUser = await tx.query.users.findFirst({
        where: eq(users.id, targetUserId),
      });

      if (!targetUser) throw new Error("Target recipient not found");

      // Use 'Divisional Deputy Director' matching profile requirements explicitly
      const isSendingToDD = targetUser.role === 'Divisional Deputy Director';
      const nextPoint = isSendingToDD ? "Technical DD Review" : "Staff Technical Review";

      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};

      const newEntry = {
        from: "Director/CEO",
        role: "Directorate",
        text: `DIRECTORATE REWORK ORDER: ${note}`,
        action: "RETURNED_FOR_REWORK",
        target: targetUser.name,
        timestamp: new Date().toISOString(),
      };

      await tx.update(applications)
        .set({
          status: "REWORK_REQUIRED",
          currentPoint: nextPoint,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), newEntry]
          },
          updatedAt: sql`now()`
        })
        .where(eq(applications.id, appId));

      const timestamp = sql`now()`;

      // Stop Director's current clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      // Start Recipient's Clock at the correct Point
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: targetUserId,
        point: nextPoint,
        startTime: timestamp,
        details: { instructionFrom: "Directorate" }
      });

      revalidatePath('/dashboard/director');
      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      return { success: true };
    });
  } catch (error: any) {
    console.error("DIRECTOR_RETURN_ERROR:", error);
    return { success: false, error: error.message };
  }
}