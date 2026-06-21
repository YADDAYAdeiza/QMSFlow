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
      // RECALL: Pulls it back to the current step from the next step
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

      // 3. Build standardized, title-compliant audit notation
      const systemLogEntry = {
        fromStep: activeStep.title,
        toStep: nextStep.title,
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
          currentPoint: nextStep.title, // 'Divisional Deputy Director' compliant title matches
          status: nextStep.statusLabel,
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), systemLogEntry],
            // Kept separate to prevent facility verification overlaps
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
        point: nextStep.title,
        division: nextStep.division,
        staffId: targetUserId || actingUserId, // If finalized or recalled, maps cleanly
        startTime: timestamp,
      });

      // 7. Refresh dashboard views instantly
      revalidatePath("/dashboard/ddd");
      revalidatePath("/dashboard/staff");
      revalidatePath("/dashboard/director");

      return { success: true, arrivedAt: targetStepKey };
    });
  } catch (error: any) {
    console.error("INSPECTION_ROUTING_ENGINE_ERROR:", error);
    return { success: false, error: error.message };
  }
}