"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql, or, ilike } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateORR } from '@/lib/actions/riskEngine';
import { sendOversightEmail } from "@/lib/utils/mail"; // Wired email pipeline
import { 
  getWorkflowStep, 
  Directorate 
} from "@/config/workflows/facilityVerificationWorkflow";


/**
 * Moves application from Director to the Technical DD (Divisional Deputy Director)
 * Handles the QMS Handover Clock and updates JSONB details for both Round 1 & 2.
 */
export async function assignToDDD(
  appId: number, 
  divisions: string[], 
  comment: string, 
  headId?: string,
  sendEmail: boolean = false 
) {
  try {
    return await db.transaction(async (tx) => {
      
      // 1. Fetch current application to detect context (Round 1 vs Round 2)
      const currentApp = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });

      if (!currentApp) throw new Error("Application not found");

      // Dynamically extract the directorate from the application record
      const appDirectorate = currentApp.directorate || "VMAP";

     // Resolve step titles dynamically using the application's actual directorate
      const intakeStep = getWorkflowStep(appDirectorate, "DIRECTOR_INTAKE");
      const assignmentStep = getWorkflowStep(appDirectorate, "DDD_TECHNICAL_ASSIGNMENT");

      const intakePointTitle = intakeStep ? intakeStep.title : "Director Initial Assignment";
      const assignmentPointTitle = assignmentStep ? assignmentStep.title : "Divisional Deputy Director Technical Assignment";
      const nextStatusLabel = assignmentStep ? assignmentStep.statusLabel : "PENDING_TECHNICAL_ASSIGNMENT";

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

      // 2. Update Application Status, Point, and JSONB Details
      await tx.update(applications)
        .set({ 
          currentPoint: assignmentPointTitle,
          status: nextStatusLabel,
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

      // 3. Close Director's Intake Timeline
      await tx.update(qmsTimelines)
        .set({ endTime: sql`now()` })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, intakePointTitle),
          isNull(qmsTimelines.endTime)
        ));

      // 4. Start Divisional Deputy Director Technical Assignment Timeline
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: headId || null, 
        division: divisions[0] as any,
        point: assignmentPointTitle,
        startTime: sql`now()`,
        details: {
          previousStep: intakePointTitle,
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
          appNumber: currentApp.applicationNumber || `APP-${currentApp.id}`,
          type: isRound2 ? "Compliance Review Order" : "Technical Dossier Review",
          companyName: appDetails.companyName || "Regulatory Applicant",
          facilityName: appDetails.facilityName || "Inspected Facility Site",
          lodRemarks: comment,
          customRecipient: recipientEmail 
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




/**
 * Rejects application and moves back to LOD with CAPA requirements.
 */
export async function issueFinalClearance(
  appId: number, 
  remarks: string, 
  publicUrl: string, 
  metadataUpdate: any,
  directorId: string 
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch current application and Director record
      const [app, directorRecord] = await Promise.all([
        tx.query.applications.findFirst({ where: eq(applications.id, appId) }),
        tx.query.users.findFirst({ where: eq(users.id, directorId) })
      ]);

      if (!app) throw new Error("Application not found");
      if (!directorRecord) throw new Error("Director user record not found");

      // 2. Resolve Directorate & Terminal Steps from JSON details
      const currentDetails = (app.details as Record<string, any>) || {};
      const rawDirectorate = app.directorate || currentDetails.directorate || "VMAP";
      const directorateKey: Directorate = rawDirectorate.includes("FSAN") ? "FSAN" : "VMAP";

      const currentStepKey = currentDetails.currentStepKey || "DIRECTOR_FINAL_SIGN_OFF";
      const currentStep = getWorkflowStep(directorateKey, currentStepKey);

      // Resolve final step (defaults to 'FINALIZED')
      const nextStepKey = currentStep?.nextStepKey || "FINALIZED";
      const nextStep = getWorkflowStep(directorateKey, nextStepKey);

      // 3. Construct Audit Trail Minute
      const isPass2 = !!metadataUpdate.gmp_certificate_url;
      const actionLabel = isPass2 ? "GMP_CERTIFICATE_ISSUED" : "FINAL_CLEARANCE_ISSUED";

      const newComment = {
        from: directorRecord.name, 
        role: "Director",
        text: remarks,
        action: actionLabel,
        timestamp: new Date().toISOString(),
        attachmentUrl: publicUrl
      };

      // 4. Update Application Record dynamically in JSONB details & top-level fields
      await tx.update(applications)
        .set({
          status: nextStep?.statusLabel || "APPROVED_AND_ARCHIVED",
          currentPoint: nextStep?.title || "Report Approved and Archived",
          updatedAt: new Date(),
          details: sql`
            jsonb_set(
              jsonb_set(
                COALESCE(details, '{}'::jsonb) || ${JSON.stringify(metadataUpdate)}::jsonb,
                '{comments}',
                (COALESCE(details->'comments', '[]'::jsonb)) || ${JSON.stringify([newComment])}::jsonb
              ),
              '{currentStepKey}',
              ${JSON.stringify(nextStep?.key || "FINALIZED")}::jsonb
            )
          `
        })
        .where(eq(applications.id, appId));

      // 5. Clock out active Director's QMS Timeline session
      await tx.update(qmsTimelines)
        .set({ endTime: sql`now()` })
        .where(
          and(
            eq(qmsTimelines.applicationId, appId),
            isNull(qmsTimelines.endTime)
          )
        );

      // 6. Record final archived event entry in QMS Timeline
      if (nextStep) {
        await tx.insert(qmsTimelines).values({
          applicationId: appId,
          staffId: directorId,
          division: nextStep.division, // "ARCHIVE"
          point: nextStep.title,
          startTime: sql`now()`,
          endTime: sql`now()`, // Instant completion for terminal archive step
          details: {
            previousStepKey: currentStep?.key || "DIRECTOR_FINAL_SIGN_OFF",
            nextStepKey: nextStep.key,
            actionPerformed: actionLabel,
            signOffBy: directorRecord.name
          }
        });
      }

      revalidatePath("/dashboard/director");
      revalidatePath("/dashboard/lod");

      return { success: true, nextStep: nextStep?.key || "FINALIZED" };
    });
  } catch (error: any) {
    console.error("Issuance Error:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Return to Staff or DD for rework tracking mechanisms.
 */
export async function returnToStaffFromDirector(
  appId: number, 
  note: string, 
  targetUserId: string, 
  directorUserId: string,
  returnStepKey: string = "DIRECTOR_INTAKE",
  targetDivision: string = "VMD"
) {
  try {
    return await db.transaction(async (tx) => {
      const targetUser = await tx.query.users.findFirst({
        where: eq(users.id, targetUserId),
      });

      if (!targetUser) throw new Error("Target recipient not found");

      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};

      let nextPoint = "Director Initial Assignment";
      if (returnStepKey === "DDD_TECHNICAL_ASSIGNMENT") {
        nextPoint = "Divisional Deputy Director Technical Assignment";
      } else if (returnStepKey === "DDD_IRSD_INTAKE") {
        nextPoint = "Divisional Deputy Director IRSD Routing";
      }

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

      // Fixed: Removed the trailing semicolon from the SQL template tag
      const timestamp = sql`now()`;

      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: targetUserId,
        division: targetDivision,
        point: nextPoint,
        startTime: timestamp,
        details: { instructionFrom: "Directorate", stepKey: returnStepKey }
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


export async function fetchDivisionalDeputyDirector(divisionKey: string) {
  try {
    const normalizedDiv = divisionKey.trim().toUpperCase();

    const ddRecord = await db
      .select({ id: users.id })
      .from(users)
      .where(
        and(
          eq(users.division, normalizedDiv),
          or(
            ilike(users.role, "%Divisional Deputy Director%"),
            ilike(users.role, "%DDD%")
          )
        )
      )
      .limit(1)
      .then(res => res[0]);

    return { success: true, ddId: ddRecord?.id || null };
  } catch (error) {
    console.error("Failed to resolve Divisional Deputy Director:", error);
    return { success: false, ddId: null };
  }
}