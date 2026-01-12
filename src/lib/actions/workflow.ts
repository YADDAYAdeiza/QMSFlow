"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function processDDRecommendation(appId: number, decision: 'FORWARD' | 'RETURN', comments: string) {
  try {
    // 1. Close the current DD Timeline segment
    await db.update(qmsTimelines)
      .set({ 
        endTime: sql`now()`,
        comments: comments // Save the DD's vetting remarks
      })
      .where(and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.point, 'Divisional Deputy Director'),
        isNull(qmsTimelines.endTime)
      ));

    if (decision === 'FORWARD') {
      // MOVE TO DIRECTOR
      await db.update(applications)
        .set({ currentPoint: 'Director', status: 'PENDING_DIRECTOR' })
        .where(eq(applications.id, appId));

      // Start Director Timeline
      await db.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Director',
        startTime: sql`now()`,
      });
    } else {
      // RETURN TO STAFF
      await db.update(applications)
        .set({ currentPoint: 'Staff', status: 'REWORK_REQUIRED' })
        .where(eq(applications.id, appId));

      // Re-open Staff Timeline
      await db.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Technical Review', // Change 'Staff' to 'Technical Review'
        startTime: sql`now()`,
        comments: `Rework requested by DD: ${comments}`
      });
    }

    revalidatePath("/dashboard/ddd");
    revalidatePath(`/dashboard/ddd/review/${appId}`);
    return { success: true };
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}

