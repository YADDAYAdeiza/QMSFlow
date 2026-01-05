"use server"

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitStaffReview(appId: number, division: string, commentText: string) {
  // 1. Move Back to DDD and Save Findings
  await db.update(applications)
    .set({
      currentPoint: 'Divisional Deputy Director',
      details: sql`jsonb_set(
        details, 
        '{comments}', 
        (details->'comments') || jsonb_build_array(jsonb_build_object(
          'from', ${division.toUpperCase()},
          'role', 'Technical Staff',
          'text', ${commentText},
          'timestamp', ${new Date().toISOString()}
        ))
      )`
    })
    .where(eq(applications.id, appId));

  // 2. STOP QMS Clock for this division
  await db.update(qmsTimelines)
    .set({ endTime: new Date() })
    .where(
      and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.division, division),
        isNull(qmsTimelines.endTime)
      )
    );

  revalidatePath('/dashboard/[division]', 'layout');
}