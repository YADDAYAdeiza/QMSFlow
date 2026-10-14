import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, applications, qmsTimelines, companies, facilities } from "@/db/schema";
import { eq, inArray, notInArray, and, gte, lte, isNull, sql } from "drizzle-orm";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { sendOversightEmail } from "@/lib/utils/mail";

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

    const now = new Date();
    let emailDispatchQueue: Array<{
      appNumber: string;
      type: string;
      companyName: string;
      facilityName: string;
      notificationEmail?: string;
      emailTitle: string;
      remarks: string;
    }> = [];

    // --- ACTION HANDLER 1: Endorsements & Resubmissions (DDD -> Director) ---
    if (action === "RECOMMEND" || action === "RESUBMIT" || action === "RECOMMEND_RESUBMIT") {
      const auditAction =
        action === "RESUBMIT" ? "RESUBMITTED_AFTER_REWORK" : "RECOMMENDED_FOR_APPROVAL";

      const previousStep = inspectionScheduleBatchWorkflow.steps.DDD_SCHEDULE_ROUTING;
      const targetStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;

      const newHistoryEntry = {
        action: auditAction,
        actorRole: userRole || targetStep.role,
        actorId: userId || "SYSTEM",
        comments: comments || "No comments provided.",
        timestamp: now.toISOString(),
      };

      await db.transaction(async (tx) => {
        // 1. Update batch status and history
        await tx
          .update(scheduleBatches)
          .set({
            status: inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL,
            currentPoint: targetStep.currentPoint,
            endorsedBy: validUserId,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: now,
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

        const applicationIds = await getBatchApplicationIds(tx, batch.id);

        if (applicationIds.length > 0) {
          // Close active QMS timelines for previous step
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, applicationIds),
                isNull(qmsTimelines.endTime)
              )
            );

          // Open new QMS timelines for Director review step
          for (const appId of applicationIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              staff_id: validUserId,
              point: targetStep.currentPoint,
              division: targetStep.division,
              startTime: now,
              details: {
                routed_from: previousStep.key,
                assigned_role: targetStep.role,
                comments,
              },
            });
          }

          // Update Applications Table
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
              updatedAt: now,
            })
            .where(inArray(applications.id, applicationIds));

          // Fetch details for email queue
          for (const appId of applicationIds) {
            const [appData] = await tx.select().from(applications).where(eq(applications.id, appId));
            if (appData) {
              const [comp] = await tx.select({ name: companies.name }).from(companies).where(eq(companies.id, appData.companyId));
              const [fac] = await tx.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, appData.facilityId));

              emailDispatchQueue.push({
                appNumber: appData.applicationNumber,
                type: appData.type,
                companyName: comp?.name || "Registered Establishment",
                facilityName: fac?.name || "Manufacturing Facility",
                notificationEmail: (appData.details as any)?.notificationEmail,
                emailTitle: "Schedule Batch Recommended for Approval",
                remarks: comments || "Batch submitted to Director for final review.",
              });
            }
          }
        }
      });

      // Dispatch Emails Post-Transaction
      for (const item of emailDispatchQueue) {
        await sendOversightEmail({
          appNumber: item.appNumber,
          type: item.type || 'Pre-Registration',
          companyName: item.companyName,
          facilityName: item.facilityName,
          lodRemarks: item.remarks,
          customRecipient: item.notificationEmail || undefined,
          emailTitle: item.emailTitle,
        });
      }

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
      const currentStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;
      const targetStep = inspectionScheduleBatchWorkflow.steps.INSPECTION_SCHEDULED;
      const nextAppStep = inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW;

      const newHistoryEntry = {
        action: targetStep.statusLabel,
        actorRole: userRole || "Director",
        actorId: userId || "SYSTEM",
        comments: comments || "Batch approved.",
        timestamp: now.toISOString(),
      };

      await db.transaction(async (tx) => {
        await tx
          .update(scheduleBatches)
          .set({
            status: targetStep.statusLabel,
            currentPoint: targetStep.currentPoint,
            approvedBy: validUserId,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: now,
          })
          .where(eq(scheduleBatches.id, batchId));

        const applicationIds = await getBatchApplicationIds(tx, batchId);

        if (applicationIds.length > 0) {
          // Close active QMS timelines for Director review step
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, applicationIds),
                isNull(qmsTimelines.endTime)
              )
            );

          // Open new QMS timeline using config workflow references
          for (const appId of applicationIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              staff_id: validUserId,
              point: nextAppStep.currentPoint,
              division: nextAppStep.division,
              startTime: now,
              details: {
                routed_from: currentStep.key,
                assigned_role: nextAppStep.role,
              },
            });
          }

          await tx
            .update(applications)
            .set({
              currentPoint: nextAppStep.title,
              status: targetStep.statusLabel,
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                ${JSON.stringify(nextAppStep.key)}::jsonb
              )`,
              updatedAt: now,
            })
            .where(inArray(applications.id, applicationIds));

          for (const appId of applicationIds) {
            const [appData] = await tx.select().from(applications).where(eq(applications.id, appId));
            if (appData) {
              const [comp] = await tx.select({ name: companies.name }).from(companies).where(eq(companies.id, appData.companyId));
              const [fac] = await tx.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, appData.facilityId));

              emailDispatchQueue.push({
                appNumber: appData.applicationNumber,
                type: appData.type,
                companyName: comp?.name || "Registered Establishment",
                facilityName: fac?.name || "Manufacturing Facility",
                notificationEmail: (appData.details as any)?.notificationEmail,
                emailTitle: "Inspection Batch Approved & Dispatched",
                remarks: comments || "Batch approved by Director and dispatched to inspection team.",
              });
            }
          }
        }
      });

      for (const item of emailDispatchQueue) {
        await sendOversightEmail({
          appNumber: item.appNumber,
          type: item.type || 'Pre-Registration',
          companyName: item.companyName,
          facilityName: item.facilityName,
          lodRemarks: item.remarks,
          customRecipient: item.notificationEmail || undefined,
          emailTitle: item.emailTitle,
        });
      }

      return NextResponse.json({
        success: true,
        message: "Batch approved and dispatched to inspectors.",
      });
    }

    // --- ACTION HANDLER 3: Director Return for Rework ---
    if (action === "REWORK") {
      const currentStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;
      const targetStep = inspectionScheduleBatchWorkflow.steps.REWORK_REQUIRED;

      const newHistoryEntry = {
        action: targetStep.statusLabel,
        actorRole: userRole || "Director",
        actorId: userId || "SYSTEM",
        comments: comments || "Revision required.",
        timestamp: now.toISOString(),
      };

      await db.transaction(async (tx) => {
        await tx
          .update(scheduleBatches)
          .set({
            status: targetStep.statusLabel,
            currentPoint: targetStep.currentPoint,
            history: [...currentHistory, newHistoryEntry],
            updatedAt: now,
          })
          .where(eq(scheduleBatches.id, batchId));

        const applicationIds = await getBatchApplicationIds(tx, batchId);

        if (applicationIds.length > 0) {
          // Close active QMS timelines for Director review step
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, applicationIds),
                isNull(qmsTimelines.endTime)
              )
            );

          // Open new QMS timeline for DDD rework step
          for (const appId of applicationIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              staff_id: validUserId,
              point: targetStep.currentPoint,
              division: targetStep.division,
              startTime: now,
              details: {
                routed_from: currentStep.key,
                assigned_role: targetStep.role,
                directive: comments,
              },
            });
          }

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
              updatedAt: now,
            })
            .where(inArray(applications.id, applicationIds));

          for (const appId of applicationIds) {
            const [appData] = await tx.select().from(applications).where(eq(applications.id, appId));
            if (appData) {
              const [comp] = await tx.select({ name: companies.name }).from(companies).where(eq(companies.id, appData.companyId));
              const [fac] = await tx.select({ name: facilities.name }).from(facilities).where(eq(facilities.id, appData.facilityId));

              emailDispatchQueue.push({
                appNumber: appData.applicationNumber,
                type: appData.type,
                companyName: comp?.name || "Registered Establishment",
                facilityName: fac?.name || "Manufacturing Facility",
                notificationEmail: (appData.details as any)?.notificationEmail,
                emailTitle: "Schedule Batch Returned for Rework",
                remarks: comments || "Revision required by Director.",
              });
            }
          }
        }
      });

      for (const item of emailDispatchQueue) {
        await sendOversightEmail({
          appNumber: item.appNumber,
          type: item.type || 'Pre-Registration',
          companyName: item.companyName,
          facilityName: item.facilityName,
          lodRemarks: item.remarks,
          customRecipient: item.notificationEmail || undefined,
          emailTitle: item.emailTitle,
        });
      }

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