"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
// import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";
import { supabase } from "@/lib/supabase";

// 1. Use the standard createClient from the main package
import { createClient } from "@supabase/supabase-js";

// "use server"

// /**
//  * Assigns an application to one or more divisions and records the Director's instruction.
//  * @param applicationId - The ID of the application
//  * @param selectedDivisions - Array of divisions (e.g., ["VMD", "PAD"])
//  * @param directorComment - The instruction/minute from the Director

export async function assignToDDD(appId: number, divisions: string[], comment: string) {
  try {
    await db.transaction(async (tx) => {
      // 1. Fetch current application to get existing comments
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 2. Prepare the Director's Unified Comment
      const directorComment = {
        from: "Director",
        role: "Director",
        text: comment, // This is the instruction
        timestamp: new Date().toISOString(),
        round: 1, 
        action: "ASSIGNED_TO_DDD"
      };

      // 3. Update the Application Table (Crucial Step!)
      // We update the current point AND append the comment to the JSONB details
      await tx
        .update(applications)
        .set({ 
          currentPoint: 'Divisional Deputy Director',
          details: {
            ...oldDetails,
            assignedDivisions: divisions,
            comments: [...oldComments, directorComment] // <--- This makes it show up on the DDD Dash
          }
        })
        .where(eq(applications.id, appId));

      // 4. QMS: STOP Director's Clock
      await tx
        .update(qmsTimelines)
        .set({ 
          endTime: sql`now()`, 
          status: 'Completed',
          // We keep the metadata here too as a backup/audit
          metadata: { instruction: comment, assignedTo: divisions } 
        })
        .where(
          and(
            eq(qmsTimelines.applicationId, appId),
            eq(qmsTimelines.point, 'Director'),
            isNull(qmsTimelines.endTime)
          )
        );

      // 5. QMS: START DDD's Clock
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Divisional Deputy Director',
        startTime: sql`now()`,
        status: 'Pending'
      });
    });

    revalidatePath("/director");
    revalidatePath("/dashboard/ddd"); // Ensure the DDD sees the update immediately
    return { success: true };
  } catch (error) {
    console.error("Handoff failed:", error);
    return { success: false };
  }
}

/**
 * Finalizes the application by setting status to CLEARED
 * and saving the archival path to the documents bucket.
 */


export async function issueFinalClearance(
  appId: number, 
  remarks: string, 
  storagePath: string
) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;

      // 1. Fetch current application for trail merging
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];
      const currentRound = oldComments[oldComments.length - 1]?.round || 1;

      // 2. Add the Final Step to the Unified Trail
      const finalEntry = {
        from: "Director General",
        role: "Director",
        text: remarks,
        timestamp: new Date().toISOString(),
        round: currentRound,
        action: "FINAL_CLEARANCE_ISSUED",
        archive_path: storagePath
      };

      const updatedDetails = {
        ...oldDetails,
        archived_path: storagePath,
        final_approval_date: new Date().toISOString(),
        comments: [...oldComments, finalEntry] 
      };

      // 3. Update Status and Move to COMPLETED
      await tx.update(applications)
        .set({
          status: 'CLEARED',
          currentPoint: 'COMPLETED',
          details: updatedDetails,
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // 4. QMS: Stop the final Clock for the Director stage
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Director'),
          isNull(qmsTimelines.endTime)
        ));

      revalidatePath('/dashboard/director');
      revalidatePath(`/dashboard/director/review/${appId}`);
      
      return { success: true };
    });
  } catch (err: any) {
    console.error("CLEARANCE_ACTION_ERROR:", err);
    return { success: false, error: err.message };
  }
}


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

export async function finalizeApplication(
  appId: number, 
  isApproved: boolean, 
  decisionNote: string,
  storagePath?: string 
) {
  try {
    const now = new Date();
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, appId),
      with: { company: true }
    });

    if (!app) throw new Error("Application not found");

    const details = (app.details as Record<string, any>) || {};
    const isCapaOutcome = details.comments?.some((c: any) => c.action === "RECOMMENDED_FOR_CAPA");
    
    let finalStatus = isApproved ? (isCapaOutcome ? "APPROVED_WITH_CAPA" : "APPROVED") : "REJECTED";

    // Prepare observations snapshot
    const latestStaffSub = [...details.comments].reverse().find((c: any) => c.action === "SUBMITTED_TO_DDD");
    
    const archiveRecord = {
      remarks: decisionNote,
      issuedAt: now.toISOString(),
      authorizedBy: "Director/CEO",
      documentType: isCapaOutcome ? "CAPA" : "GMP_CERTIFICATE",
      findingsSnapshot: latestStaffSub?.observations || [],
    };

    await db.update(applications)
      .set({
        status: finalStatus,
        currentPoint: "Completed",
        details: {
          ...details,
          comments: [...details.comments, {
            from: "Director/CEO",
            role: "Director",
            text: decisionNote,
            action: isApproved ? "FINAL_APPROVAL_ISSUED" : "FINAL_REJECTION",
            timestamp: now.toISOString(),
          }],
          archived_outcome_path: storagePath || "", 
          archived_capa_document: isCapaOutcome ? archiveRecord : null,
          finalized_at: now.toISOString(),
        } as any,
      })
      .where(eq(applications.id, appId));

    // Requirement: Time the staff as per QMS requirements
    await db.update(qmsTimelines)
      .set({ endTime: now })
      .where(eq(qmsTimelines.applicationId, appId));

    revalidatePath('/dashboard/director');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function returnToStaffFromDirector(appId: number, note: string) {
  // Logic for 'Divisional Deputy Director' mentioned in instructions
  const now = new Date();
  const app = await db.query.applications.findFirst({ where: eq(applications.id, appId) });
  if (!app) return { success: false };

  const details = (app.details as Record<string, any>) || {};
  
  await db.update(applications)
    .set({
      status: "REWORK_REQUIRED",
      currentPoint: "Staff Reviewer", // Bypassing DDD as requested in UI
      details: {
        ...details,
        comments: [...details.comments, {
          from: "Director/CEO",
          text: `DIRECTOR REWORK ORDER: ${note}`,
          action: "RETURNED_FOR_REWORK",
          timestamp: now.toISOString(),
        }]
      } as any
    })
    .where(eq(applications.id, appId));

  revalidatePath('/dashboard/director');
  return { success: true };
}