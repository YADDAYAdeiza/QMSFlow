import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, applications } from "@/db/schema";
import { eq, and, gte, lte, inArray } from "drizzle-orm";
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

    // --- ACTION HANDLER 1: Endorsements & Resubmissions ---
    if (action === "RECOMMEND" || action === "RESUBMIT" || action === "RECOMMEND_RESUBMIT") {
      const auditAction = action === "RESUBMIT" 
        ? "RESUBMITTED_AFTER_REWORK" 
        : "RECOMMENDED_FOR_APPROVAL";

      const newHistoryEntry = {
        action: auditAction,
        actorRole: userRole || "Divisional Deputy Director",
        actorId: userId || "SYSTEM",
        comments: comments || "No comments provided.",
        timestamp: new Date().toISOString(),
      };

      await db
        .update(scheduleBatches)
        .set({
          status: inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL,
          currentPoint: inspectionScheduleBatchWorkflow.steps.DIRECTOR_APPROVAL_REVIEW.currentPoint,
          endorsedBy: validUserId,
          history: [...currentHistory, newHistoryEntry],
          updatedAt: new Date(),
        })
        .where(eq(scheduleBatches.id, batchId));

      return NextResponse.json({
        success: true,
        message: action === "RESUBMIT" 
          ? "Schedule batch successfully resubmitted to the Director for approval."
          : "Schedule batch successfully routed to the Director for approval.",
      });
    }

    // --- ACTION HANDLER 2: Final Director Approval ---
    if (action === "APPROVE") {
      const newHistoryEntry = {
        action: "APPROVED",
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
            currentPoint: inspectionScheduleBatchWorkflow.steps.FINAL_APPROVED.currentPoint,
            approvedBy: validUserId,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: new Date(),
          })
          .where(eq(scheduleBatches.id, batchId));

        // 2. Locate all linked inspection schedules in batch range
        const scheduledItems = await tx
          .select({ 
            scheduleId: inspectionSchedules.id,
            applicationId: inspectionSchedules.applicationId 
          })
          .from(inspectionSchedules)
          .where(
            and(
              gte(inspectionSchedules.scheduledDate, batch.startDate),
              lte(inspectionSchedules.scheduledDate, batch.endDate)
            )
          );

        const applicationIds = scheduledItems
          .map((item) => item.applicationId)
          .filter((id): id is number => id !== null);

        // 3. Advance applications to Staff Technical Review desk
        if (applicationIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title,
              status: "INSPECTION_SCHEDULED",
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
      const newHistoryEntry = {
        action: "REWORK_REQUIRED",
        actorRole: userRole || "Director",
        actorId: userId || "SYSTEM",
        comments: comments || "Revision required.",
        timestamp: new Date().toISOString(),
      };

      await db
        .update(scheduleBatches)
        .set({
          status: inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED,
          currentPoint: inspectionScheduleBatchWorkflow.steps.REWORK_REQUIRED.currentPoint,
          history: [...currentHistory, newHistoryEntry],
          updatedAt: new Date(),
        })
        .where(eq(scheduleBatches.id, batchId));

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