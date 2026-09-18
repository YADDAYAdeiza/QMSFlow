import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  scheduleBatches,
  applications 
} from "@/db/schema";
import { eq, inArray, notInArray, and, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

export async function PUT(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { 
      batchId, 
      updates, 
      activeScheduleIds = [], 
      startDate, 
      endDate 
    } = body as {
      batchId?: string;
      updates: Array<{
        scheduleId?: string | null;
        applicationId: number;
        scheduledDate: string;
        driver?: string;
        inspectors: Array<{
          inspectorId: string;
          role: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
        }>;
      }>;
      activeScheduleIds?: string[];
      startDate: string;
      endDate: string;
    };

    let targetBatchId = batchId;
    const draftStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;

    // 1. Resolve or Create Batch Shell if not provided
    if (!targetBatchId) {
      const [existingBatch] = await db
        .select({ id: scheduleBatches.id })
        .from(scheduleBatches)
        .where(
          and(
            eq(scheduleBatches.startDate, startDate),
            eq(scheduleBatches.endDate, endDate)
          )
        )
        .limit(1);

      if (existingBatch) {
        targetBatchId = existingBatch.id;
      } else {
        const [newBatch] = await db
          .insert(scheduleBatches)
          .values({
            batchReference: `SCHEDULE-${startDate}-${endDate}`,
            title: `VMAP Inspection Schedule (${startDate} to ${endDate})`,
            startDate,
            endDate,
            status: draftStep.statusLabel,
            currentPoint: draftStep.currentPoint,
            history: [],
          })
          .returning({ id: scheduleBatches.id });

        targetBatchId = newBatch.id;
      }
    }

    // 2. Perform Database Operations in Transaction
    await db.transaction(async (tx) => {
      // -------------------------------------------------------------
      // Step A: Upsert Schedules & Bind Inspectors
      // -------------------------------------------------------------
      const activeScheduleDbIds: string[] = [];

      for (const item of updates) {
        let currentScheduleId = item.scheduleId;

        if (currentScheduleId) {
          // UPDATE existing schedule record
          await tx
            .update(inspectionSchedules)
            .set({
              scheduledDate: item.scheduledDate,
              batchId: targetBatchId,
              ...(item.driver !== undefined && {
                details: sql`jsonb_set(
                  COALESCE(${inspectionSchedules.details}, '{}'::jsonb), 
                  '{assignedDriver}', 
                  ${JSON.stringify(item.driver)}::jsonb
                )`,
              }),
            })
            .where(eq(inspectionSchedules.id, currentScheduleId));
        } else {
          // INSERT new schedule record
          const [insertedSchedule] = await tx
            .insert(inspectionSchedules)
            .values({
              applicationId: item.applicationId,
              batchId: targetBatchId,
              scheduledDate: item.scheduledDate,
              status: "SCHEDULED",
              ...(item.driver !== undefined && {
                details: { assignedDriver: item.driver },
              }),
            })
            .returning({ id: inspectionSchedules.id });

          currentScheduleId = insertedSchedule.id;
        }

        activeScheduleDbIds.push(currentScheduleId);

        // Re-bind team assignments for the schedule UUID
        await tx
          .delete(inspectionTeamAssignments)
          .where(eq(inspectionTeamAssignments.scheduleId, currentScheduleId));

        if (item.inspectors.length > 0) {
          const assignmentValues = item.inspectors.map((ins) => ({
            scheduleId: currentScheduleId,
            inspectorId: ins.inspectorId,
            role: ins.role,
          }));

          await tx.insert(inspectionTeamAssignments).values(assignmentValues);
        }
      }

      // -------------------------------------------------------------
      // Step B: Handle Unlinked / Removed Schedules
      // -------------------------------------------------------------
      const validActiveScheduleIds = [
        ...activeScheduleIds.filter((id): id is string => Boolean(id)),
        ...activeScheduleDbIds,
      ];

      if (targetBatchId && validActiveScheduleIds.length > 0) {
        // Query unlinked schedules belonging to this batch that are no longer active
        const removedSchedules = await tx
          .select({ 
            id: inspectionSchedules.id,
            applicationId: inspectionSchedules.applicationId 
          })
          .from(inspectionSchedules)
          .where(
            and(
              eq(inspectionSchedules.batchId, targetBatchId),
              notInArray(inspectionSchedules.id, validActiveScheduleIds)
            )
          );

        const unlinkedAppIds = removedSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (removedSchedules.length > 0) {
          // Unlink schedule rows from batch
          await tx
            .update(inspectionSchedules)
            .set({ batchId: null })
            .where(
              and(
                eq(inspectionSchedules.batchId, targetBatchId),
                notInArray(inspectionSchedules.id, validActiveScheduleIds)
              )
            );
        }

        // Revert status of unlinked applications back to unscheduled draft
        if (unlinkedAppIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: draftStep.currentPoint,
              status: "PENDING_SCHEDULE",
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                '"PENDING_SCHEDULE"'::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(inArray(applications.id, unlinkedAppIds));
        }
      }

      // -------------------------------------------------------------
      // Step C: Update Active Applications to Scheduled Workflow State
      // -------------------------------------------------------------
      if (activeScheduleDbIds.length > 0) {
        const activeSchedules = await tx
          .select({ applicationId: inspectionSchedules.applicationId })
          .from(inspectionSchedules)
          .where(inArray(inspectionSchedules.id, activeScheduleDbIds));

        const activeAppIds = activeSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (activeAppIds.length > 0) {
          await tx
            .update(applications)
            .set({
              currentPoint: draftStep.currentPoint,
              status: draftStep.statusLabel,
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(draftStep.key)}::jsonb
              )`,
              updatedAt: new Date(),
            })
            .where(inArray(applications.id, activeAppIds));
        }
      }
    });

    return NextResponse.json({ 
      success: true, 
      batchId: targetBatchId,
      message: "Batch schedule and application statuses updated successfully." 
    });
  } catch (error: any) {
    console.error("Error in batch-update route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}