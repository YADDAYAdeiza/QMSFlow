"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getWorkflowStep } from "@/config/workflows/facilityVerificationWorkflow";

export async function processDDRecommendation(appId: number, decision: 'FORWARD' | 'RETURN', comments: string) {
  try {
    // Resolve workflow step configurations dynamically
    const currentStep = getWorkflowStep("VMAP", "DDD_TECHNICAL_ASSIGNMENT");
    const currentPointTitle = currentStep ? currentStep.title : "Divisional Deputy Director";

    // 1. Close the current DD Timeline segment
    // This records exactly when the DD finished their vetting
    await db.update(qmsTimelines)
      .set({ 
        endTime: sql`now()`,
        comments: comments 
      })
      .where(and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.point, currentPointTitle),
        isNull(qmsTimelines.endTime)
      ));

    if (decision === 'FORWARD') {
      const nextStep = getWorkflowStep("VMAP", "DIRECTOR_FINAL_SIGN_OFF");
      const nextPointTitle = nextStep ? nextStep.title : "Director Final Review";
      const nextStatusLabel = nextStep ? nextStep.statusLabel : "PENDING_DIRECTOR_APPROVAL";

      // 2. MOVE TO DIRECTOR
      await db.update(applications)
        .set({ 
          currentPoint: nextPointTitle, 
          status: nextStatusLabel 
        })
        .where(eq(applications.id, appId));

      // 3. Start Director Timeline segment
      await db.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPointTitle,
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