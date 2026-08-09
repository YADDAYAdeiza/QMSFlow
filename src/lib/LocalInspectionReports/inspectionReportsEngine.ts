"use server"

import { db } from "@/db";
import { 
  applications, 
  qmsTimelines, 
  localInspectionReports, 
  inspectionObservationsAnalytics 
} from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";

interface TransitionPayload {
  applicationId: number;
  currentStepKey: keyof typeof inspectionReportWorkflow.steps;
  direction: "FORWARD" | "REWORK" | "RECALL" | "TARGETED_REWORK";
  targetStepKey?: keyof typeof inspectionReportWorkflow.steps;
  actingUserId: string;
  actingUserRole: string;
  actingUserName: string;
  targetUserId: string | null;
  remarks: string;
  checklistSnapshot?: any;
}

export async function executeInspectionReportTransition({
  applicationId,
  currentStepKey,
  direction,
  targetStepKey: customTargetStepKey,
  actingUserId,
  actingUserRole,
  actingUserName,
  targetUserId,
  remarks,
  checklistSnapshot
}: TransitionPayload) {
  try {
    const config = inspectionReportWorkflow;
    const activeStep = config.steps[currentStepKey];
    if (!activeStep) throw new Error(`Step ${currentStepKey} is not configured.`);

    // 1. Resolve Target State Node using routing direction
    let targetStepKey: keyof typeof config.steps | null;
    if (direction === "FORWARD") {
      targetStepKey = activeStep.nextStepKey;
    } else if (direction === "REWORK") {
      targetStepKey = activeStep.prevStepKey;
    } else if (direction === "TARGETED_REWORK") {
      targetStepKey = customTargetStepKey || "STAFF_TECHNICAL_REVIEW";
    } else {
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

      // Determine baseline incoming snapshot block
      const incomingSnapshot = checklistSnapshot || oldDetails.savedChecklistSnapshot || null;

      let finalStatusLabel = nextStep.statusLabel;
      let finalTitle = nextStep.title;

      // --- 🌟 STRATEGIC INTERCEPTOR: MOVING OUT OF FIELD INSPECTION 🌟 ---
      if (currentStepKey === "STAFF_TECHNICAL_REVIEW" && direction === "FORWARD") {
        finalStatusLabel = "UNDER_DD_REVIEW";
      }

      // --- 🌟 STRATEGIC INTERCEPTOR FOR TERMINAL STATUS FORK 🌟 ---
      if (currentStepKey === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
        const recommendation = incomingSnapshot?.final_recommendation || "PENDING";
        
        if (recommendation === "CAPA_PENDING") {
          finalStatusLabel = "AWAITING_CAPA";
          finalTitle = "Applicant Notification Hub - CAPA Request Issued";
          
          console.log(`[QMS MAIL]: Dispatching CAPA directive to ${oldDetails.notificationEmail || 'applicant'}`);
        } else {
          finalStatusLabel = "APPROVED";
          finalTitle = "Applicant Notification Hub - Final Approval Certified";
        }
      }

      // 3. Build standardized, title-compliant audit notation
      const systemLogEntry = {
        fromStep: activeStep.title.replace(/DDD/g, "Divisional Deputy Director"),
        toStep: finalTitle.replace(/DDD/g, "Divisional Deputy Director"),
        actorName: actingUserName,
        actorId: actingUserId,
        actorRole: actingUserRole,
        assignedToId: targetUserId,
        action: direction,
        text: remarks,
        timestamp: timestamp.toISOString()
      };

      // 4. Update core application state
      await tx.update(applications)
        .set({
          currentPoint: finalTitle.replace(/DDD/g, "Divisional Deputy Director"), 
          status: finalStatusLabel, 
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            savedChecklistSnapshot: incomingSnapshot, 
            comments: [...(oldDetails.comments || []), systemLogEntry],
            inspectionWorkflowMeta: {
              ...(oldDetails.inspectionWorkflowMeta || {}),
              currentStepKey: targetStepKey,
              currentOwnerId: targetUserId,
              lastAction: direction
            }
          }
        })
        .where(eq(applications.id, applicationId));

      // ------------------------------------------------------------------
      // 📊 5. ANALYTICAL WAREHOUSE PIPELINE: UPSERT REPORT & OBSERVATIONS
      // ------------------------------------------------------------------
      if (incomingSnapshot) {
        const docNumber = incomingSnapshot.report_doc_number || `NAFDAC/VMD/GMP/${applicationId}/2026`;
        const obsList = incomingSnapshot.observations || [];

        const criticalCount = incomingSnapshot.critical_count ?? obsList.filter((o: any) => o.severity === "critical").length;
        const majorCount = incomingSnapshot.major_count ?? obsList.filter((o: any) => o.severity === "major").length;
        const otherCount = incomingSnapshot.other_count ?? obsList.filter((o: any) => o.severity === "other").length;
        const totalObs = obsList.length || (criticalCount + majorCount + otherCount);

        const rec = incomingSnapshot.final_recommendation || "PENDING";
        const isCapaReq = rec === "CAPA_PENDING";

        // Upsert Header Report Entry
        const [upsertedReport] = await tx
          .insert(localInspectionReports)
          .values({
            applicationId: applicationId,
            companyId: app.companyId,
            reportDocNumber: docNumber,
            typeOfInspection: incomingSnapshot.type_of_inspection || "PRI",
            facilityState: oldDetails.facilityAddressState || incomingSnapshot.facilityState || null,
            criticalCount: criticalCount,
            majorCount: majorCount,
            otherCount: otherCount,
            totalObservations: totalObs,
            finalRecommendation: rec,
            capaRequired: isCapaReq,
            capaIssuedAt: isCapaReq ? timestamp : null,
            updatedAt: timestamp,
          })
          .onConflictDoUpdate({
            target: localInspectionReports.reportDocNumber,
            set: {
              criticalCount: criticalCount,
              majorCount: majorCount,
              otherCount: otherCount,
              totalObservations: totalObs,
              finalRecommendation: rec,
              capaRequired: isCapaReq,
              capaIssuedAt: isCapaReq ? timestamp : null,
              updatedAt: timestamp,
            },
          })
          .returning({ id: localInspectionReports.id });

        // Populate Granular Findings for Analytics (Clear and Re-Insert)
        if (upsertedReport?.id && obsList.length > 0) {
          await tx
            .delete(inspectionObservationsAnalytics)
            .where(eq(inspectionObservationsAnalytics.reportId, upsertedReport.id));

          // Replace this line inside analyticsRows map in executeInspectionReportTransition:
            const analyticsRows = obsList.map((obs: any) => ({
              reportId: upsertedReport.id,
              companyId: app.companyId,
              qualitySystem: obs.qualitySystem || obs.quality_system || obs.system || "General Quality System",
              severity: String(obs.severity || "OTHER").toUpperCase(),
              // Check snake_case, camelCase, and direct keys
              rootCauseCategory: 
                obs.root_cause_category || 
                obs.rootCauseCategory || 
                obs.root_cause || 
                obs.rootCause || 
                "Uncategorized",
              observationText: obs.observationText || obs.observation_text || obs.text || obs.observation || "Observation recorded without description.",
            }));

          await tx.insert(inspectionObservationsAnalytics).values(analyticsRows);
        }
      }

      // 6. Close previous QMS Session tracking clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          isNull(qmsTimelines.endTime)
        ));

      // 7. Start new QMS timing interval
      await tx.insert(qmsTimelines).values({
        applicationId,
        point: finalTitle.replace(/DDD/g, "Divisional Deputy Director"),
        division: nextStep.division,
        staffId: targetUserId || actingUserId,
        startTime: timestamp,
      });

      // 8. Refresh dashboard views
      revalidatePath("/dashboard/ddd");
      revalidatePath("/dashboard/staff");
      revalidatePath("/dashboard/director");

      return { success: true, arrivedAt: targetStepKey, currentStatus: finalStatusLabel };
    });
  } catch (error: any) {
    console.error("INSPECTION_ROUTING_ENGINE_ERROR:", error);
    return { success: false, error: error.message };
  }
}