"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import {calculateORR} from '@/lib/actions/riskEngine'

/**
 * Director -> DD: Initial Assignment
 * Moves point to Technical DD Review
*/
// @/lib/actions/director.ts

// export async function assignToDDD(
//   appId: number, 
//   divisions: string[], 
//   comment: string, 
//   headId?: string
// ) {
//   try {
//     // 1. Prepare the Director's Minute object
//     const directorMinute = {
//       from: "Director",
//       role: "Director",
//       text: comment,
//       round: 1,
//       action: "TECHNICAL_DIRECTION",
//       timestamp: new Date().toISOString()
//     };

//     /**
//      * 2. Update Application State
//      * We perform two JSONB operations:
//      * - Update 'assignedDivisions' with the Director's choice (overwrite).
//      * - Append the new minute to the 'comments' array.
//      */
//     await db.update(applications)
//       .set({ 
//         currentPoint: 'Technical DD Review',
//         details: sql`
//           jsonb_set(
//             jsonb_set(
//               COALESCE(details, '{}'::jsonb), 
//               '{assignedDivisions}', 
//               ${JSON.stringify(divisions)}::jsonb
//             ),
//             '{comments}',
//             (COALESCE(details->'comments', '[]'::jsonb)) || ${JSON.stringify([directorMinute])}::jsonb
//           )
//         `
//       })
//       .where(eq(applications.id, appId));

//     // 3. Close Director's Timeline (Stop the clock on Sequence 2)
//     await db.update(qmsTimelines)
//       .set({ endTime: sql`now()` })
//       .where(and(
//         eq(qmsTimelines.applicationId, appId),
//         eq(qmsTimelines.point, 'Director Review'),
//         isNull(qmsTimelines.endTime)
//       ));

//     // 4. Start Divisional Deputy Director's Timeline (Sequence 3)
//     // We use the headId passed from the client dropdown to avoid NULL staff_id
//     await db.insert(qmsTimelines).values({
//       applicationId: appId,
//       staffId: headId || null, 
//       division: divisions[0],
//       point: 'Technical DD Review',
//       startTime: sql`now()`,
//     });

//     // 5. Refresh the UI
//     revalidatePath("/dashboard/director");
    
//     return { success: true };
//   } catch (error) {
//     console.error("QMS Assignment Error:", error);
//     return { success: false };
//   }
// }

// @/lib/actions/director.ts

/**
 * Moves application from Director to the Technical DD
 * Handles the QMS Handover Clock and updates JSONB details.
 */

/**
 * Moves application from Director to the Technical DD (Divisional Deputy Director)
 * Handles the QMS Handover Clock and updates JSONB details for both Round 1 & 2.
 */
/**
 * Moves application from Director to the Technical DD
 * Handles the QMS Handover Clock and updates JSONB details for Round 1 & Round 2.
 */
export async function assignToDDD(
  appId: number, 
  divisions: string[], 
  comment: string, 
  headId?: string
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
 * Final Clearance
 * Moves Point to COMPLETED
 */

// Helper for Risk Matrix (Ensure this matches your logic)
// function calculateORR(intrinsic: string, compliance: string) {
//   const matrix: Record<string, Record<string, { rating: string; interval: number }>> = {
//     High: {
//       High: { rating: "A", interval: 18 },
//       Medium: { rating: "B", interval: 12 },
//       Low: { rating: "C", interval: 6 },
//     },
//     Medium: {
//       High: { rating: "A", interval: 24 },
//       Medium: { rating: "B", interval: 18 },
//       Low: { rating: "C", interval: 12 },
//     },
//     Low: {
//       High: { rating: "A", interval: 36 },
//       Medium: { rating: "B", interval: 24 },
//       Low: { rating: "C", interval: 18 },
//     },
//   };

//   const i = intrinsic || "Medium";
//   const c = compliance || "Medium";
//   return matrix[i]?.[c] || { rating: "B", interval: 12 };
// }

/**
 * Final Clearance Action
 * Triggered by the Director to conclude a round.
 * Pass 1: Moves to Registry/Hub for Pass 2 prep.
 * Pass 2: Finalizes Risk and completes the application.
 */

/**
 * issueFinalClearance
 * Finalizes the Director's sign-off, handles disparate archival keys,
 * and dynamically assigns the "from" name based on the actual user.
 */

/**
 * issueFinalClearance
 * Finalizes the Director's sign-off, handles disparate archival keys,
 * and dynamically assigns the "from" name based on the actual user record.
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

    // 4. Update the DB with the merged details
    await db.update(applications)
      .set({
        details: {
          ...currentDetails,
          ...metadataUpdate, 
          comments: [...currentComments, newComment]
        },
        // Both passes mark status as CLEARED so they appear in the Archive
        status: "CLEARED",
        updatedAt: new Date()
      })
      .where(eq(applications.id, appId));

    revalidatePath('/dashboard/director');
    revalidatePath('/dashboard/lod');

    return { success: true };
  } catch (error: any) {
    console.error("Issuance Error:", error);
    return { success: false, error: error.message };
  }
}
/**
 * Director -> DD or Staff: Return for Rework
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

      // ✅ Map Item 8 Logic:
      // If sending to a DD (Divisional Deputy Director), use 'Technical DD Review'
      // If sending to Staff, use 'Staff Technical Review'
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

      // Stop Director's current clock (could be Review or Final Review)
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