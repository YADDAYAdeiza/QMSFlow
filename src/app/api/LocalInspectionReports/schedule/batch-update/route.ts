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
      updates = [], 
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

    // Determine working boundary dates from active update rows or fallback to body range
    const allScheduledDates = updates.map((u) => u.scheduledDate).filter(Boolean);
    const calculatedStartDate = allScheduledDates.length > 0 
      ? allScheduledDates.reduce((min, p) => p < min ? p : min, allScheduledDates[0])
      : startDate;
    const calculatedEndDate = allScheduledDates.length > 0 
      ? allScheduledDates.reduce((max, p) => p > max ? p : max, allScheduledDates[0])
      : endDate;

    // 1. Resolve or Create Batch Container if missing
    // 1. Resolve or Create Batch Container if missing
      if (!targetBatchId) {
        // Check A: Are any of the active schedule IDs already linked to a batch?
        if (activeScheduleIds.length > 0) {
          const [linkedSchedule] = await db
            .select({ batchId: inspectionSchedules.batchId })
            .from(inspectionSchedules)
            .where(
              and(
                inArray(inspectionSchedules.id, activeScheduleIds),
                sql`${inspectionSchedules.batchId} IS NOT NULL`
              )
            )
            .limit(1);

          if (linkedSchedule?.batchId) {
            targetBatchId = linkedSchedule.batchId;
          }
        }

        // Check B: Look for an existing batch by date range if not found by schedule link
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
          }
        }

        // Check C: Create new batch only if no existing container was resolved
        if (!targetBatchId) {
          const uniqueReference = `SCHEDULE-${calculatedStartDate}-${calculatedEndDate}-${Date.now().toString(36)}`;
          const [newBatch] = await db
            .insert(scheduleBatches)
            .values({
              batchReference: uniqueReference,
              title: `VMAP Inspection Schedule (${calculatedStartDate} to ${calculatedEndDate})`,
              startDate: calculatedStartDate,
              endDate: calculatedEndDate,
              status: draftStep.statusLabel,
              currentPoint: draftStep.currentPoint,
              history: [],
            })
            .returning({ id: scheduleBatches.id });

          targetBatchId = newBatch.id;
        }
      }
    // 2. Database Operations inside Transaction
    await db.transaction(async (tx) => {
      // Step A: Upsert Schedules & Bind Inspectors under targetBatchId
      const activeScheduleDbIds: string[] = [];

      for (const item of updates) {
        let currentScheduleId = item.scheduleId;

        if (currentScheduleId) {
          // UPDATE existing schedule row and associate with batchId
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
          // INSERT new schedule row with inherited targetBatchId
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

        // Sync inspector team assignments
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

      // Step B: Unlink Removed / Filtered Out Inspections
      const validActiveScheduleIds = [
        ...activeScheduleIds.filter((id): id is string => Boolean(id)),
        ...activeScheduleDbIds,
      ];

      if (targetBatchId) {
        const hasActiveIds = validActiveScheduleIds.length > 0;

        // Query removed schedules attached to this batch
        const removedSchedules = await tx
          .select({ 
            id: inspectionSchedules.id,
            applicationId: inspectionSchedules.applicationId 
          })
          .from(inspectionSchedules)
          .where(
            and(
              eq(inspectionSchedules.batchId, targetBatchId),
              hasActiveIds 
                ? notInArray(inspectionSchedules.id, validActiveScheduleIds)
                : sql`1=1` // Select all existing items if no active IDs remain
            )
          );

        const unlinkedAppIds = removedSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (removedSchedules.length > 0) {
          // Unlink schedule rows from batch (set batchId to NULL)
          await tx
            .update(inspectionSchedules)
            .set({ batchId: null })
            .where(
              and(
                eq(inspectionSchedules.batchId, targetBatchId),
                hasActiveIds 
                  ? notInArray(inspectionSchedules.id, validActiveScheduleIds)
                  : sql`1=1`
              )
            );
        }

        // Revert status of unlinked applications back to PENDING_SCHEDULE
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

        // Step C: Expand Batch Date Boundaries if Inspections Shifted
        // Note: batchReference is omitted to preserve the initial tracking reference key
        if (allScheduledDates.length > 0) {
          await tx
            .update(scheduleBatches)
            .set({
              startDate: calculatedStartDate,
              endDate: calculatedEndDate,
              title: `VMAP Inspection Schedule (${calculatedStartDate} to ${calculatedEndDate})`,
              updatedAt: new Date(),
            })
            .where(eq(scheduleBatches.id, targetBatchId));
        }
      }

      // Step D: Sync Application Statuses for Active Scheduled Items
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
      message: "Batch schedule updated and unlinked inspections reset successfully." 
    });
  } catch (error: any) {
    console.error("Error in batch-update route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}