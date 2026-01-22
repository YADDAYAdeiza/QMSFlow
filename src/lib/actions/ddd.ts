"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function assignToStaff(
  applicationId: number, 
  staffId: string, 
  instruction: string
) {
  const timestamp = sql`now()`;

  try {
    return await db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, applicationId) 
      });
      
      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 1. Calculate the current round
      // If the last action was a "return", increment. Else stay same.
      const lastAction = oldComments[oldComments.length - 1]?.action;
      const currentRound = lastAction === "RETURNED_TO_LOD" 
        ? (oldComments[oldComments.length - 1].round || 1) + 1 
        : (oldComments[oldComments.length - 1]?.round || 1);

      // 2. Build the Unified Entry
      const newEntry = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        text: instruction,
        timestamp: new Date().toISOString(),
        round: currentRound,
        action: "ASSIGNED_TO_STAFF",
        assigned_to_id: staffId
      };

      const updatedDetails = {
        ...oldDetails,
        staff_reviewer_id: staffId, 
        comments: [...oldComments, newEntry] // Appending to the unified array
      };

      // 3. Update Application Table
      await tx.update(applications)
        .set({ 
          currentPoint: 'Technical Review',
          details: updatedDetails 
        })
        .where(eq(applications.id, applicationId));

      // 4. QMS: Close DDD clock, Open Staff clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId,
        point: 'Technical Review',
        division: oldDetails.assignedDivisions?.[0] || 'VMD', 
        staffId: staffId,
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error) {
    console.error("DDD_ASSIGNMENT_ERROR:", error);
    return { success: false, error: "Failed to assign staff member." };
  }
}

export async function approveToDirector(appId: number, recommendationNote: string) {
  try {
    return await db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });
      if (!app) throw new Error("App not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 1. Determine if this is an Approval Recommendation or a CAPA Recommendation
      const reviewerEntry = [...oldComments].reverse().find(c => c.action === "SUBMITTED_TO_DDD");
      const hasDeficiencies = (reviewerEntry?.observations?.length > 0);

      // 2. Build the Entry using your 'Divisional Deputy Director' naming convention
      const newEntry = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        text: recommendationNote,
        timestamp: new Date().toISOString(),
        round: oldDetails.currentRound || 1,
        // DYNAMIC ACTION: This tells the Director what to expect
        action: hasDeficiencies ? "RECOMMENDED_FOR_CAPA" : "RECOMMENDED_FOR_APPROVAL"
      };

      const updatedDetails = {
        ...oldDetails,
        comments: [...oldComments, newEntry]
      };

      // 3. Update Application State
      await tx.update(applications)
        .set({
          currentPoint: 'Director',
          details: updatedDetails,
          updatedAt: sql`now()`
        })
        .where(eq(applications.id, appId));

      const timestamp = sql`now()`;
      
      // 4. QMS: Stop Divisional Deputy Director Clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 5. QMS: Start Director Clock
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Director',
        startTime: timestamp,
        details: { status: "Awaiting Final Executive Decision" }
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error) {
    console.error("DDD_SUBMIT_ERROR:", error);
    return { success: false };
  }
}