"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
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

export async function assignToDDD(
  appId: number, 
  divisions: string[], 
  comment: string, 
  headId?: string
) {
  try {
    const directorMinute = {
      from: "Director",
      role: "Director",
      text: comment,
      round: 1,
      action: "TECHNICAL_DIRECTION",
      division: divisions[0],
      timestamp: new Date().toISOString()
    };

    /**
     * ✅ QMS JSONB UPDATE:
     * We explicitly set 'division' at the top level of details.
     * This ensures 'appDetails.division' is no longer undefined.
     */
    await db.update(applications)
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

    // Stop Director's initial clock
    await db.update(qmsTimelines)
      .set({ endTime: sql`now()` })
      .where(and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.point, 'Director Review'),
        isNull(qmsTimelines.endTime)
      ));

    // Start Technical DD clock
    await db.insert(qmsTimelines).values({
      applicationId: appId,
      staffId: headId || null, 
      division: divisions[0],
      point: 'Technical DD Review',
      startTime: sql`now()`,
    });

    revalidatePath("/dashboard/director");
    return { success: true };
  } catch (error) {
    console.error("QMS Assignment Error:", error);
    return { success: false };
  }
}

/**
 * Final Clearance
 * Moves Point to COMPLETED
 */
export async function issueFinalClearance(
  appId: number, 
  remarks: string, 
  storagePath: string
) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};

      const finalEntry = {
        from: "Director General",
        role: "Director",
        text: remarks,
        timestamp: new Date().toISOString(),
        action: "FINAL_CLEARANCE_ISSUED",
        archive_path: storagePath
      };

      await tx.update(applications)
        .set({
          status: 'CLEARED',
          currentPoint: 'COMPLETED', // Final terminal state
          details: {
            ...oldDetails,
            archived_path: storagePath,
            final_approval_date: new Date().toISOString(),
            comments: [...(oldDetails.comments || []), finalEntry]
          },
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // Stop Director's FINAL clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Director Final Review'), // Updated to match Map Item 7
          isNull(qmsTimelines.endTime)
        ));

      revalidatePath('/dashboard/director');
      return { success: true };
    });
  } catch (err: any) {
    console.error("CLEARANCE_ACTION_ERROR:", err);
    return { success: false, error: err.message };
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