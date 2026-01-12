"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitStaffReview(appId: number, division: string, findings: string, staffId: string) {
  try {
    // We use a transaction so if one step fails, the clock doesn't get messed up
    return await db.transaction(async (tx) => {
      
      const dbNow = sql`now()`; // ✅ The "Source of Truth" for your Audit Trail

      // 1. Fetch current details using the transaction client (tx)
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });

      if (!app) throw new Error("Application not found");

      // 2. Update Application Table (Standard JS Spread)
      await tx.update(applications)
        .set({ 
          currentPoint: 'Divisional Deputy Director',
          status: 'PENDING_VETTING',
          details: {
            ...(app.details as object || {}), // Safely preserve LOD data
            staff_technical_findings: findings,
            staff_reviewer_id: staffId,
            staff_submitted_at: new Date().toISOString() // String label for JSON
          }
        })
        .where(eq(applications.id, appId));

      // 3. Close the Staff's segment in the Audit Trail
      await tx.update(qmsTimelines)
        .set({ 
          endTime: dbNow, // ✅ Database Clock
          comments: findings 
        })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.staffId, staffId),
          isNull(qmsTimelines.endTime)
        ));

      // 4. Open the DDD's segment (The next step in the QMS)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Divisional Deputy Director', 
        division: division.toUpperCase(),
        startTime: dbNow, // ✅ Matches the endTime above perfectly
      });

      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/staff`);
      
      return { success: true };
    });
  } catch (error) {
    console.error("Staff Review Error:", error);
    return { success: false, error: "Failed to submit review" };
  }
}