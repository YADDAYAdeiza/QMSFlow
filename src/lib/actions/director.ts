"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
// import { createClient } from "@/utils/supabase/server";
import { revalidatePath } from "next/cache";


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

      // 1. Fetch current application using Drizzle
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];
      
      // Determine the final round
      const currentRound = oldComments[oldComments.length - 1]?.round || 1;

      // 2. Create the Final Authorization Entry for the Unified Trail
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
        director_final_notes: remarks,
        archived_path: storagePath,
        final_approval_date: new Date().toISOString(),
        comments: [...oldComments, finalEntry] 
      };

      // 3. Update Application Table
      await tx.update(applications)
        .set({
          status: 'CLEARED',
          currentPoint: 'COMPLETED',
          details: updatedDetails,
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // 4. QMS: Close the final Director Clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 5. Revalidate paths to refresh the UI
      revalidatePath('/dashboard/director');
      revalidatePath(`/dashboard/director/review/${appId}`);
      
      return { success: true };
    });
  } catch (err: any) {
    console.error("DRIZZLE_CLEARANCE_ERROR:", err);
    return { success: false, error: err.message };
  }
}