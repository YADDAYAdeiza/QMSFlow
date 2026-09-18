import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, applications } from "@/db/schema";
import { eq, inArray, notInArray, and, gte, lte, isNull, sql } from "drizzle-orm";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batchId, action, comments, userId, userRole } = body;

    if (!batchId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required approval payload parameters." },
        { status: 400 }
      );
    }

    const isUuid = (id?: string | null) =>
      Boolean(id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id));

    const validUserId = isUuid(userId) ? userId : null;

    const [batch] = await db
      .select()
      .from(scheduleBatches)
      .where(eq(scheduleBatches.id, batchId));

    if (!batch) {
      return NextResponse.json(
        { success: false, error: "Target schedule batch record not found." },
        { status: 404 }
      );
    }

    const currentHistory = Array.isArray(batch.history) ? batch.history : [];

    const getBatchApplicationIds = async (tx: any, targetBatchId: string) => {
      const scheduledItems = await tx
        .select({ applicationId: inspectionSchedules.applicationId })
        .from(inspectionSchedules)
        .where(eq(inspectionSchedules.batchId, targetBatchId));

      return scheduledItems
        .map((item) => item.applicationId)
        .filter((id): id is number => id !== null);
    };

    // --- ACTION HANDLER 1: Endorsements & Resubmissions ---
    if (action === "RECOMMEND" || action === "RESUBMIT" || action === "RECOMMEND_RESUBMIT") {
      const auditAction =
        action === "RESUBMIT" ? "RESUBMITTED_AFTER_REWORK" : "RECOMMENDED_FOR_APPROVAL";

      const targetStep = inspectionScheduleBatchWorkflow.steps.DIRECTOR_APPROVAL_REVIEW;

      const newHistoryEntry = {
        action: auditAction,
        actorRole: userRole || targetStep.role,
        actorId: userId || "SYSTEM",
        comments: comments || "No comments provided.",
        timestamp: new Date().toISOString(),
      };

      await db.transaction(async (tx) => {
        // 1. Update batch status and history using config values
        await tx
          .update(scheduleBatches)
          .set({
            status: inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL,
            currentPoint: targetStep.currentPoint,
            endorsedBy: validUserId,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: new Date(),
          })
          .where(eq(scheduleBatches.id, batchId));

        // 2. Scoped Batch Binding & Cleanup
        if (Array.isArray(body.activeScheduleIds) && body.activeScheduleIds.length > 0) {
          await tx
            .update(inspectionSchedules)
            .set({ batchId: null })
            .where(
              and(
                eq(inspectionSchedules.batchId, batch.id),
                notInArray(inspectionSchedules.id, body.activeScheduleIds)
              )
            );

          await tx
            .update(inspectionSchedules)
            .set({ batchId: batch.id })
            .where(inArray(inspectionSchedules.id, body.activeScheduleIds));
        } else {
          await tx
            .update(inspectionSchedules)
            .set({ batchId: batch.id })
            .where(
              and(
                gte(inspectionSchedules.scheduledDate, batch.startDate),
                lte(inspectionSchedules.scheduledDate, batch.endDate),
                isNull(inspectionSchedules.batchId)
              )
            );
        }

        // 3. Update Applications Table dynamically via workflow config
        const applicationIds = await getBatchApplicationIds(tx, batch.id);

        if (applicationIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: targetStep.title,
              status: targetStep.statusLabel,
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(targetStep.key)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(inArray(applications.id, applicationIds));
        }
      });

      return NextResponse.json({
        success: true,
        message:
          action === "RESUBMIT"
            ? "Schedule batch successfully resubmitted to the Director for approval."
            : "Schedule batch successfully routed to the Director for approval.",
      });
    }

    // --- ACTION HANDLER 2: Final Director Approval ---
    if (action === "APPROVE") {
      const targetStep = inspectionScheduleBatchWorkflow.steps.FINAL_APPROVED;
      const nextAppStep = inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW;

      const newHistoryEntry = {
        action: inspectionScheduleBatchWorkflow.statuses.APPROVED,
        actorRole: userRole || "Director",
        actorId: userId || "SYSTEM",
        comments: comments || "Batch approved.",
        timestamp: new Date().toISOString(),
      };

      await db.transaction(async (tx) => {
        // 1. Mark batch as APPROVED
        await tx
          .update(scheduleBatches)
          .set({
            status: inspectionScheduleBatchWorkflow.statuses.APPROVED,
            currentPoint: targetStep.currentPoint,
            approvedBy: validUserId,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: new Date(),
          })
          .where(eq(scheduleBatches.id, batchId));

        // 2. Fetch linked application IDs
        const applicationIds = await getBatchApplicationIds(tx, batchId);

        // 3. Advance linked applications to Staff Technical Review using inspectionReportWorkflow config
        if (applicationIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: nextAppStep.title,
              status: "INSPECTION_SCHEDULED",
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(nextAppStep.key)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(inArray(applications.id, applicationIds));
        }
      });

      return NextResponse.json({
        success: true,
        message: "Batch approved and dispatched to inspectors.",
      });
    }

    // --- ACTION HANDLER 3: Director Return for Rework ---
    if (action === "REWORK") {
      const targetStep = inspectionScheduleBatchWorkflow.steps.REWORK_REQUIRED;

      const newHistoryEntry = {
        action: targetStep.statusLabel,
        actorRole: userRole || "Director",
        actorId: userId || "SYSTEM",
        comments: comments || "Revision required.",
        timestamp: new Date().toISOString(),
      };

      await db.transaction(async (tx) => {
        // 1. Update batch status
        await tx
          .update(scheduleBatches)
          .set({
            status: inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED,
            currentPoint: targetStep.currentPoint,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: new Date(),
          })
          .where(eq(scheduleBatches.id, batchId));

        // 2. Update Applications Table for REWORK using config values
        const applicationIds = await getBatchApplicationIds(tx, batchId);

        if (applicationIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: targetStep.title,
              status: targetStep.statusLabel,
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(targetStep.key)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(inArray(applications.id, applicationIds));
        }
      });

      return NextResponse.json({
        success: true,
        message: "Batch returned to Divisional Deputy Director for rework.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    console.error("Director Batch Action Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}