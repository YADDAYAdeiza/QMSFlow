// @/lib/actions/inspectionReportsEngine.ts
"use server"

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";

interface TransitionPayload {
  applicationId: number;
  currentStepKey: keyof typeof inspectionReportWorkflow.steps;
  direction: "FORWARD" | "REWORK" | "RECALL";
  actingUserId: string;
  actingUserName: string;
  targetUserId: string | null; // Desk officer receiving the file
  remarks: string;
}

export async function executeInspectionReportTransition({
  applicationId,
  currentStepKey,
  direction,
  actingUserId,
  actingUserName,
  targetUserId,
  remarks
}: TransitionPayload) {
  try {
    const config = inspectionReportWorkflow;
    const activeStep = config.steps[currentStepKey];
    if (!activeStep) throw new Error(`Step ${currentStepKey} is not configured.`);

    // 1. Resolve Target State Node using the routing path direction
    let targetStepKey: keyof typeof config.steps | null;
    if (direction === "FORWARD") {
      targetStepKey = activeStep.nextStepKey;
    } else if (direction === "REWORK") {
      targetStepKey = activeStep.prevStepKey;
    } else {
      targetStepKey = currentStepKey; 
    }

    if (!targetStepKey) throw new Error(`Invalid destination logic route.`);
    const nextStep = config.steps[targetStepKey];

    return await db.transaction(async (tx) => {
      // 2. Locate Application parameters
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, applicationId)
      });
      if (!app) throw new Error("Application record not found.");

      const oldDetails = (app.details as any) || {};
      const timestamp = new Date();

      let finalStatusLabel = nextStep.statusLabel;
      let finalTitle = nextStep.title;

      // --- 🌟 STRATEGIC INTERCEPTOR: MOVING OUT OF FIELD INSPECTION 🌟 ---
      // When field review checklist reports are pushed forward to management tracking
      if (currentStepKey === "STAFF_TECHNICAL_REVIEW" && direction === "FORWARD") {
        finalStatusLabel = "UNDER_DD_REVIEW";
      }

      // --- 🌟 STRATEGIC INTERCEPTOR FOR TERMINAL STATUS FORK 🌟 ---
      // If we are moving FORWARD from the Director's Final Sign-Off step:
      if (currentStepKey === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
        const recommendation = oldDetails.savedChecklistSnapshot?.final_recommendation || "PENDING";
        
        if (recommendation === "CAPA_PENDING") {
          finalStatusLabel = "AWAITING_CAPA";
          finalTitle = "Applicant Notification Hub - CAPA Request Issued";
          
          // Execute your notification dispatcher safely inside the runtime
          console.log(`[QMS MAIL]: Dispatching CAPA directive to ${oldDetails.notificationEmail || 'applicant'}`);
        } else {
          finalStatusLabel = "APPROVED";
          finalTitle = "Applicant Notification Hub - Final Approval Certified";
        }
      }
      // -------------------------------------------------------------

      // 3. Build standardized, title-compliant audit notation
      const systemLogEntry = {
        fromStep: activeStep.title,
        toStep: finalTitle,
        actorName: actingUserName,
        actorId: actingUserId,
        assignedToId: targetUserId,
        action: direction,
        text: remarks,
        timestamp: timestamp.toISOString()
      };

      // 4. Update application state matching JSON config parameters
      await tx.update(applications)
        .set({
          currentPoint: finalTitle, 
          status: finalStatusLabel, // Dynamically intercepted for UNDER_DD_REVIEW or terminal forks
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), systemLogEntry],
            inspectionWorkflowMeta: {
              currentStepKey: targetStepKey,
              currentOwnerId: targetUserId,
              lastAction: direction
            }
          }
        })
        .where(eq(applications.id, applicationId));

      // 5. Close previous QMS Session tracking session clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          isNull(qmsTimelines.endTime)
        ));

      // 6. Start new QMS timing interval customized to current step definitions
      await tx.insert(qmsTimelines).values({
        applicationId,
        point: finalTitle,
        division: nextStep.division,
        staffId: targetUserId || actingUserId,
        startTime: timestamp,
      });

      // 7. Refresh dashboard views instantly
      revalidatePath("/dashboard/ddd");
      revalidatePath("/dashboard/staff");
      revalidatePath("/dashboard/director");

      return { success: true, arrivedAt: targetStepKey, currentStatus: finalStatusLabel };
    });
  } catch (error: any) {
    console.error("INSPECTION_ROUTING_ENGINE_ERROR:", error);
    return { success: false, error: error.message };
  }
}