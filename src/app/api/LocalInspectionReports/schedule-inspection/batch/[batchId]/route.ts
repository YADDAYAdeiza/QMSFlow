import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, inspectionTeamAssignments, applications } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

interface RouteParams {
  params: Promise<{ batchId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const batchId = resolvedParams?.batchId;
    const body = await request.json();
    const { title, startDate, endDate, inspectors, facilities } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: "Batch ID is required." }, { status: 400 });
    }

    const draftStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;

    await db.transaction(async (tx) => {
      // 1. Update batch main details and reset workflow back to draft for review
      await tx
        .update(scheduleBatches)
        .set({
          title: title || `Inspection Batch`,
          startDate,
          endDate,
          status: draftStep.statusLabel,
          currentPoint: draftStep.currentPoint,
          updatedAt: new Date(),
        })
        .where(eq(scheduleBatches.id, batchId));

      // 2. Surgical Facility UUID Resolution
      let targetAppIds: number[] = [];
      if (Array.isArray(facilities) && facilities.length > 0) {
        // Keep facility IDs as clean strings (UUIDs) matching facilities.id / applications.facility_id
        const parsedFacilityIds = facilities.map(id => String(id)).filter(Boolean);

        if (parsedFacilityIds.length > 0) {
          const matchingApps = await tx
            .select({ id: applications.id })
            .from(applications)
            .where(inArray(applications.facilityId, parsedFacilityIds));

          targetAppIds = Array.from(new Set(matchingApps.map(app => app.id)));
        }
      }

      // 🛡️ CRITICAL GUARD: Never allow an update that results in zero schedules (orphaned batch shell)
      if (targetAppIds.length === 0) {
        throw new Error("Batch Update Failed: The selected facilities do not map to any active regulatory applications.");
      }

      // 3. Clean up stale schedules for this batch ID or target apps
      const existingBatchSchedules = await tx
        .select({ id: inspectionSchedules.id })
        .from(inspectionSchedules)
        .where(eq(inspectionSchedules.batchId, batchId));
      
      const batchSchedIds = existingBatchSchedules.map(s => s.id);
      if (batchSchedIds.length > 0) {
        await tx.delete(inspectionTeamAssignments).where(inArray(inspectionTeamAssignments.scheduleId, batchSchedIds));
        await tx.delete(inspectionSchedules).where(eq(inspectionSchedules.batchId, batchId));
      }

      const conflictingSchedules = await tx
        .select({ id: inspectionSchedules.id })
        .from(inspectionSchedules)
        .where(inArray(inspectionSchedules.applicationId, targetAppIds));

      const confScheduleIds = conflictingSchedules.map(s => s.id);
      if (confScheduleIds.length > 0) {
        await tx.delete(inspectionTeamAssignments).where(inArray(inspectionTeamAssignments.scheduleId, confScheduleIds));
        await tx.delete(inspectionSchedules).where(inArray(inspectionSchedules.applicationId, targetAppIds));
      }

      // 4. Insert fresh schedules and team assignments
      for (const appId of targetAppIds) {
        const [newSchedule] = await tx.insert(inspectionSchedules).values({
          batchId,
          applicationId: appId,
          scheduledDate: startDate,
          status: "SCHEDULED",
        }).returning({ id: inspectionSchedules.id });

        if (Array.isArray(inspectors)) {
          for (const ins of inspectors) {
            await tx.insert(inspectionTeamAssignments).values({
              scheduleId: newSchedule.id,
              inspectorId: ins.inspectorId,
              role: ins.role,
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: "Inspection batch successfully updated and resubmitted!" });
  } catch (error: any) {
    console.error("Batch Patch Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}