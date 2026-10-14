import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  scheduleBatches,
  applications,
  qmsTimelines,
  companies,
  facilities
} from "@/db/schema";
import { eq, inArray, notInArray, and, isNull, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";
import { sendOversightEmail } from "@/lib/utils/mail";

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
    const draftStep = inspectionScheduleBatchWorkflow.steps.DDD_SCHEDULE_ROUTING;
    const pendingStep = inspectionScheduleBatchWorkflow.steps.INSPECTION_PENDING;
    const now = new Date();

    const allScheduledDates = updates.map((u) => u.scheduledDate).filter(Boolean);
    const calculatedStartDate = allScheduledDates.length > 0 
      ? allScheduledDates.reduce((min, p) => p < min ? p : min, allScheduledDates[0])
      : startDate;
    const calculatedEndDate = allScheduledDates.length > 0 
      ? allScheduledDates.reduce((max, p) => p > max ? p : max, allScheduledDates[0])
      : endDate;

    // 1. Resolve or Create Batch Container if missing
    if (!targetBatchId) {
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

    const emailDispatchQueue: Array<{
      appNumber: string;
      type: string;
      companyName: string;
      facilityName: string;
      scheduledDate: string;
      notificationEmail?: string;
    }> = [];

    // 2. Database Operations inside Transaction
    await db.transaction(async (tx) => {
      const activeScheduleDbIds: string[] = [];
      const newlyLinkedAppIds: number[] = [];

      for (const item of updates) {
        let currentScheduleId = item.scheduleId;

        if (!currentScheduleId && item.applicationId) {
          const [existingSchedule] = await tx
            .select({ id: inspectionSchedules.id })
            .from(inspectionSchedules)
            .where(eq(inspectionSchedules.applicationId, item.applicationId))
            .limit(1);

          if (existingSchedule) {
            currentScheduleId = existingSchedule.id;
          }
        }

        if (currentScheduleId) {
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
              updatedAt: now,
            })
            .where(eq(inspectionSchedules.id, currentScheduleId));
        } else {
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
          newlyLinkedAppIds.push(item.applicationId);
        }

        activeScheduleDbIds.push(currentScheduleId);

        await tx
          .delete(inspectionTeamAssignments)
          .where(eq(inspectionTeamAssignments.scheduleId, currentScheduleId));

        if (item.inspectors.length > 0) {
          const assignmentValues = item.inspectors.map((ins) => ({
            scheduleId: currentScheduleId!,
            inspectorId: ins.inspectorId,
            role: ins.role,
          }));

          await tx.insert(inspectionTeamAssignments).values(assignmentValues);
        }
      }

      const remainingIds = activeScheduleDbIds.filter(Boolean);

      if (targetBatchId) {
        const removedSchedules = await tx
          .select({ 
            id: inspectionSchedules.id,
            applicationId: inspectionSchedules.applicationId 
          })
          .from(inspectionSchedules)
          .where(
            and(
              eq(inspectionSchedules.batchId, targetBatchId),
              remainingIds.length > 0 
                ? notInArray(inspectionSchedules.id, remainingIds)
                : sql`1=1`
            )
          );

        const unlinkedAppIds = removedSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (removedSchedules.length > 0) {
          await tx
            .update(inspectionSchedules)
            .set({ 
              batchId: null,
              scheduledDate: null,
              updatedAt: now,
            })
            .where(
              and(
                eq(inspectionSchedules.batchId, targetBatchId),
                remainingIds.length > 0 
                  ? notInArray(inspectionSchedules.id, remainingIds)
                  : sql`1=1`
              )
            );
        }

        if (unlinkedAppIds.length > 0) {
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, unlinkedAppIds),
                isNull(qmsTimelines.endTime)
              )
            );

          for (const appId of unlinkedAppIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              staff_id: user.id,
              point: pendingStep.currentPoint,
              division: pendingStep.division,
              startTime: now,
              details: { reverted_from: draftStep.key },
            });
          }

          await tx
            .update(applications)
            .set({
              currentPoint: pendingStep.currentPoint,
              status: pendingStep.statusLabel,
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(pendingStep.key)}::jsonb
              )`,
              updatedAt: now,
            })
            .where(inArray(applications.id, unlinkedAppIds));
        }
      }

      if (allScheduledDates.length > 0) {
        await tx
          .update(scheduleBatches)
          .set({
            startDate: calculatedStartDate,
            endDate: calculatedEndDate,
            title: `VMAP Inspection Schedule (${calculatedStartDate} to ${calculatedEndDate})`,
            updatedAt: now,
          })
          .where(eq(scheduleBatches.id, targetBatchId));
      }

      if (activeScheduleDbIds.length > 0) {
        const activeSchedules = await tx
          .select({ 
            applicationId: inspectionSchedules.applicationId,
            scheduledDate: inspectionSchedules.scheduledDate 
          })
          .from(inspectionSchedules)
          .where(inArray(inspectionSchedules.id, activeScheduleDbIds));

        const activeAppIds = activeSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (activeAppIds.length > 0) {
          if (newlyLinkedAppIds.length > 0) {
            await tx
              .update(qmsTimelines)
              .set({ endTime: now })
              .where(
                and(
                  inArray(qmsTimelines.applicationId, newlyLinkedAppIds),
                  isNull(qmsTimelines.endTime)
                )
              );

            for (const appId of newlyLinkedAppIds) {
              await tx.insert(qmsTimelines).values({
                applicationId: appId,
                staff_id: user.id,
                point: draftStep.currentPoint,
                division: draftStep.division,
                startTime: now,
                details: { routed_from: pendingStep.key, assigned_role: draftStep.role },
              });
            }
          }

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
              updatedAt: now,
            })
            .where(inArray(applications.id, activeAppIds));

          for (const sch of activeSchedules) {
            if (!sch.applicationId) continue;
            const [appData] = await tx
              .select()
              .from(applications)
              .where(eq(applications.id, sch.applicationId));

            if (appData) {
              const [comp] = await tx
                .select({ name: companies.name })
                .from(companies)
                .where(eq(companies.id, appData.companyId));

              const [fac] = await tx
                .select({ name: facilities.name })
                .from(facilities)
                .where(eq(facilities.id, appData.facilityId));

              emailDispatchQueue.push({
                appNumber: appData.applicationNumber,
                type: appData.type,
                companyName: comp?.name || "Registered Establishment",
                facilityName: fac?.name || "Manufacturing Facility",
                scheduledDate: sch.scheduledDate || calculatedStartDate,
                notificationEmail: (appData.details as any)?.notificationEmail,
              });
            }
          }
        }
      }
    });

    // 🚀 Trigger Context-Aware Batch Email Notifications Post-Transaction
    for (const item of emailDispatchQueue) {
      await sendOversightEmail({
        appNumber: item.appNumber,
        type: item.type || 'Pre-Registration',
        companyName: item.companyName,
        facilityName: item.facilityName,
        lodRemarks: `Batch inspection scheduled for ${item.scheduledDate}. Team assignments synced and routed to Divisional Deputy Director Schedule Preparation.`,
        customRecipient: item.notificationEmail || undefined,
        emailTitle: "Inspection Batch Scheduled & Routed",
      });
    }

    return NextResponse.json({ 
      success: true, 
      batchId: targetBatchId,
      message: "Batch schedule updated, team assignments synced, and QMS timelines recorded successfully." 
    });
  } catch (error: any) {
    console.error("Error in batch-update route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}