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

    if (!batchId || !action || !userId) {
      return NextResponse.json(
        { success: false, error: "Missing required approval payload parameters." },
        { status: 400 }
      );
    }

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
    const newHistoryEntry = {
      action,
      actorRole: userRole || "Divisional Deputy Director (IRSD)",
      actorId: userId,
      comments: comments || "No comments provided.",
      timestamp: new Date().toISOString(),
    };

    // 💡 Unified action handler supporting Recommendation, Resubmission, Approval, and Rework
    if (action === "RECOMMEND_RESUBMIT") {
      await db
        .update(scheduleBatches)
        .set({
          status: inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL,
          currentPoint: inspectionScheduleBatchWorkflow.steps.DIRECTOR_APPROVAL_REVIEW.currentPoint,
          endorsedBy: userId,
          history: [...currentHistory, newHistoryEntry],
          updatedAt: new Date(),
        })
        .eq("id", batchId);

      return NextResponse.json({
        success: true,
        message: "Schedule batch successfully routed/resubmitted to the Director for approval.",
      });
    }

    if (action === "APPROVE") {
      // 1. Mark batch as APPROVED
      await db
        .update(scheduleBatches)
        .set({
          status: inspectionScheduleBatchWorkflow.statuses.APPROVED,
          currentPoint: inspectionScheduleBatchWorkflow.steps.FINAL_APPROVED.currentPoint,
          approvedBy: userId,
          history: [...currentHistory, newHistoryEntry],
          updatedAt: new Date(),
        })
        .eq("id", batchId);

      // 2. Fetch all scheduled applications within this date window
      const scheduledItems = await db
        .select({ applicationId: inspectionSchedules.applicationId })
        .from(inspectionSchedules)
        .where(
          and(
            gte(inspectionSchedules.scheduledDate, batch.startDate),
            lte(inspectionSchedules.scheduledDate, batch.endDate)
          )
        );

      const applicationIds = scheduledItems.map((item) => item.applicationId);

      // 3. 🚀 UNLOCK WORKFLOW: Advance applications to Staff Technical Field Review
      if (applicationIds.length > 0) {
        await db
          .update(applications)
          .set({
            currentPoint: inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title,
            status: inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.statusLabel,
          })
          .where(inArray(applications.id, applicationIds));
      }

      return NextResponse.json({ success: true, message: "Batch approved and dispatched to inspectors." });
    }

    if (action === "REWORK") {
      await db
        .update(scheduleBatches)
        .set({
          status: inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED,
          currentPoint: inspectionScheduleBatchWorkflow.steps.REWORK_REQUIRED.currentPoint,
          history: [...currentHistory, newHistoryEntry],
          updatedAt: new Date(),
        })
        .eq("id", batchId);

      return NextResponse.json({ success: true, message: "Batch returned to Head IRSD for rework." });
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