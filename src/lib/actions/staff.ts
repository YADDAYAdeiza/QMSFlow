"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitStaffReview(appId: number, division: string, findings: string, staffId: string) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;

      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];
      
      // Determine the current round (if last comment was a rejection in Rd 1, this submission is still Rd 1)
      const currentRound = oldComments[oldComments.length - 1]?.round || 1;

      // Create the Unified Entry
      const newEntry = {
        from: "Technical Reviewer", 
        role: "Staff",
        text: findings,
        timestamp: new Date().toISOString(),
        round: currentRound, // ✅ Persists the round set by the previous step
        action: "SUBMITTED_TO_DDD",
        staff_id: staffId
      };

      const updatedDetails = {
        ...oldDetails,
        staff_reviewer_id: staffId,
        comments: [...oldComments, newEntry]
      };

      await tx.update(applications)
        .set({
          currentPoint: 'Divisional Deputy Director',
          status: 'UNDER_DDD_REVIEW',
          details: updatedDetails,
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // Close Staff Clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.staffId, staffId),
          isNull(qmsTimelines.endTime)
        ));

      // Open DDD Clock
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Divisional Deputy Director',
        division: division.toUpperCase(),
        startTime: dbNow,
      });

      revalidatePath(`/dashboard/${division.toLowerCase()}`);
      revalidatePath(`/dashboard/ddd`);
      return { success: true };
    });
  } catch (error) {
    console.error("STAFF_SUBMIT_ERROR:", error);
    return { success: false };
  }
}