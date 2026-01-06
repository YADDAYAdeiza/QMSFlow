"use server"

import { db } from "@/db";
import { qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitStaffReview(
  applicationId: number, 
  division: string, 
  findings: string,
  staffId: string // ADDED: Passing the staffId for validation
) {
  try {
    const completionTime = new Date();

    // 1. Update ONLY the row that matches App, Division, AND the assigned Staff
    const result = await db.update(qmsTimelines)
      .set({ 
        endTime: completionTime,
        point: 'Technical Review Completed', 
        details: {
          staff_observations: findings,
          submitted_at: completionTime.toISOString(),
          reviewer_id: staffId, // Logged in the JSONB for easy auditing
          version: 1
        }
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.division, division.toUpperCase()),
        eq(qmsTimelines.staffId, staffId), // SECURE: Staff can only close their own tasks
        isNull(qmsTimelines.endTime)
      ));

    // 2. Revalidate affected dashboards
    revalidatePath(`/dashboard/${division.toLowerCase()}`);
    revalidatePath(`/dashboard/ddd`);
    
    return { success: true };
  } catch (error) {
    console.error("QMS Action Error:", error);
    throw new Error("Failed to secure and stop QMS clock.");
  }
}