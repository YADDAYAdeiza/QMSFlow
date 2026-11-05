// @/app/api/LocalInspectionReports/PRS/schedule/prs-action/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, applications, qmsTimelines, companies, facilities } from "@/db/schema";
import { eq, inArray, and, isNull, sql } from "drizzle-orm";
import { prsInspectionWorkflow } from "@/config/workflows/prsInspectionWorkflow";
import { sendOversightEmail } from "@/lib/utils/mail";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { batchId, action, comments, workloadVerified, userId, userRole } = body;

    if (!batchId || !action) {
      return NextResponse.json(
        { success: false, error: "Missing required PRS action payload parameters." },
        { status: 400 }
      );
    }

    if (action === "FORWARD_TO_DG" && !workloadVerified) {
      return NextResponse.json(
        { success: false, error: "Workload verification certification is required before forwarding to the DG." },
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

    const getBatchApplicationIds = async (tx: any, targetBatchId: string) => {
      const scheduledItems = await tx
        .select({ applicationId: inspectionSchedules.applicationId })
        .from(inspectionSchedules)
        .where(eq(inspectionSchedules.batchId, targetBatchId));

      return scheduledItems
        .map((item: any) => item.applicationId)
        .filter((id: any): id is number => id !== null);
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

    // --- ACTION HANDLER 1: PRS Forward to DG ---
    if (action === "FORWARD_TO_DG") {
      const currentStep = prsInspectionWorkflow.steps.PRS_SCHEDULE;
      const targetStep = prsInspectionWorkflow.steps.DG_SCHEDULE;

      const newHistoryEntry = {
        action: "PRS_STATISTICAL_VERIFIED",
        actorRole: userRole || "Director PRS",
        actorId: userId || "PRS_SYSTEM",
        comments: comments || "Workload and competencies verified by PRS.",
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
          // Close active QMS timelines for PRS schedule step
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, applicationIds),
                isNull(qmsTimelines.endTime)
              )
            );

          // Open new QMS timelines for DG approval step
          for (const appId of applicationIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              point: targetStep.currentPoint,
              division: targetStep.division,
              startTime: now,
              details: {
                routed_from: currentStep.key,
                assigned_role: targetStep.role,
                prs_remarks: comments,
                workload_verified: workloadVerified,
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
                emailTitle: "Foreign Inspection Schedule Verified by PRS & Forwarded to DG",
                remarks: comments || "Statistical packet compiled for Director General review.",
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
        message: "Schedule batch successfully verified by PRS and forwarded to the DG.",
      });
    }

    // --- ACTION HANDLER 2: PRS Return for Rework ---
    if (action === "REWORK") {
      const newHistoryEntry = {
        action: "PRS_REWORK_REQUESTED",
        actorRole: userRole || "Director PRS",
        actorId: userId || "PRS_SYSTEM",
        comments: comments || "Workload conflict or revision required.",
        timestamp: now.toISOString(),
      };

      await db.transaction(async (tx) => {
        await tx
          .update(scheduleBatches)
          .set({
            status: "REWORK_REQUIRED",
            currentPoint: "Schedule Rework & Modification",
            history: [...currentHistory, newHistoryEntry],
            updatedAt: now,
          })
          .where(eq(scheduleBatches.id, batchId));

        const applicationIds = await getBatchApplicationIds(tx, batchId);

        if (applicationIds.length > 0) {
          await tx
            .update(qmsTimelines)
            .set({ endTime: now })
            .where(
              and(
                inArray(qmsTimelines.applicationId, applicationIds),
                isNull(qmsTimelines.endTime)
              )
            );

          for (const appId of applicationIds) {
            await tx.insert(qmsTimelines).values({
              applicationId: appId,
              point: "Schedule Rework & Modification",
              division: "IRSD",
              startTime: now,
              details: {
                routed_from: "PRS_SCHEDULE",
                assigned_role: "Divisional Deputy Director",
                directive: comments,
              },
            });
          }

          await tx
            .update(applications)
            .set({
              currentPoint: "Schedule Rework & Modification",
              status: "REWORK_REQUIRED",
              details: sql`jsonb_set(
                COALESCE(${applications.details}, '{}'::jsonb), 
                '{inspectionWorkflowMeta,currentStepKey}', 
                '"REWORK_REQUIRED"'::jsonb
              )`,
              updatedAt: now,
            })
            .where(inArray(applications.id, applicationIds));
        }
      });

      return NextResponse.json({
        success: true,
        message: "Batch returned for rework.",
      });
    }

    return NextResponse.json({ success: false, error: "Invalid action type." }, { status: 400 });
  } catch (error: any) {
    console.error("PRS Action Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal server error." },
      { status: 500 }
    );
  }
}