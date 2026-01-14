"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitStaffReview(appId: number, division: string, findings: string, staffId: string) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;

      // 1. Fetch current application to get existing details
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("Application not found");

      const oldDetails = JSON.parse(JSON.stringify(app.details || {}));

      // 2. CUMULATIVE LOGIC: Push findings into an array
      const updatedDetails = {
        ...oldDetails,
        staff_reviewer_id: staffId, // <--- ADD THIS LINE to lock the ID in the JSON
        staff_technical_findings: findings, // Latest for quick display
        staff_submitted_at: new Date().toISOString(),
        technical_history: [
          ...(oldDetails.technical_history || []),
          { 
            findings, 
            submitted_at: new Date().toISOString(),
            round: (oldDetails.technical_history?.length || 0) + 1 
          }
        ]
      };

      // 3. Update Application Table
      await tx.update(applications)
        .set({
          currentPoint: 'Divisional Deputy Director',
          status: 'UNDER_DDD_REVIEW',
          details: updatedDetails,
          updatedAt: dbNow,
        })
        .where(eq(applications.id, appId));

      // 4. Close the Time Clock for Staff
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.staffId, staffId),
          isNull(qmsTimelines.endTime)
        ));

      // 5. Open the Time Clock for DDD
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
    console.error(error);
    return { success: false };
  }
}