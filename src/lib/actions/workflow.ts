"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function processDDRecommendation(appId: number, decision: 'FORWARD' | 'RETURN', comments: string) {
  try {
    // 1. Close the current DD Timeline segment
    // This records exactly when the DD finished their vetting
    await db.update(qmsTimelines)
      .set({ 
        endTime: sql`now()`,
        comments: comments 
      })
      .where(and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.point, 'Divisional Deputy Director'),
        isNull(qmsTimelines.endTime)
      ));

    if (decision === 'FORWARD') {
      // 2. MOVE TO DIRECTOR
      await db.update(applications)
        .set({ 
          currentPoint: 'Director', 
          status: 'PENDING_DIRECTOR' 
        })
        .where(eq(applications.id, appId));

      // 3. Start Director Timeline segment
      await db.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Director',
        startTime: sql`now()`,
      });
      
      revalidatePath("/dashboard/ddd");
      return { success: true };
    } 
    
    // If decision is 'RETURN', we do nothing here because the 
    // RejectionModal calls returnToStaff() directly instead.
    return { success: true };

  } catch (error) {
    console.error("Workflow Error:", error);
    return { success: false };
  }
}