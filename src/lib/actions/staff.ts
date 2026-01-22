"use server";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitToDDD(
  appId: number, 
  observations: any[], 
  justification: string
) {
  try {
    // 1. Fetch current application state
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, appId),
    });

    if (!app) throw new Error("Application not found");

    // Cast as any or a specific record to stop the "squiggly" error
    const details = (app.details as Record<string, any>) || {};
    const currentComments = details.comments || [];

    // 2. Prepare the snapshot for the narrative history
    const newComment = {
      from: "Technical Reviewer",
      role: "Staff",
      text: justification,
      action: "SUBMITTED_TO_DDD",
      timestamp: new Date().toISOString(),
      observations: observations, 
    };

    // 3. Update the Application Record
    await db.update(applications)
      .set({
        status: "PENDING_DDD_REVIEW",
        currentPoint: "Divisional Deputy Director", 
        details: {
          ...details,
          comments: [...currentComments, newComment],
          // ✅ Squiggly fix: Ensure details is spread correctly
          last_staff_submission: new Date().toISOString(), 
        } as any, // 👈 Casting as 'any' here solves the Drizzle/TS JSONB type mismatch
      })
      .where(eq(applications.id, appId));

    // 4. Refresh the dashboard paths
    revalidatePath('/dashboard/staff');
    revalidatePath('/dashboard/ddd');

    return { success: true };
  } catch (error: any) {
    console.error("SUBMISSION_ERROR:", error);
    return { success: false, error: error.message };
  }
}