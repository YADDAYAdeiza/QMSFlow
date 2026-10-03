"use server";

import { db } from "@/db";
import { 
  users,
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

    // Prevents illegal transition calls past the terminal archived state
    if (currentStepKey === "FINALIZED" && direction === "FORWARD") {
      throw new Error("This inspection report has already been finalized and archived.");
    }

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

    if (!targetStepKey) throw new Error(`Invalid destination step for route transition.`);
    const nextStep = config.steps[targetStepKey];
    if (!nextStep) throw new Error(`Destination step ${targetStepKey} does not exist in configuration.`);

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

      // --- 🌟 STRATEGIC INTERCEPTOR: STAFF REVIEW TO DDD ENDORSEMENT 🌟 ---
      if (currentStepKey === "STAFF_TECHNICAL_REVIEW" && direction === "FORWARD") {
        finalStatusLabel = "PENDING_TECHNICAL_ENDORSEMENT";
      }

      // --- 🌟 STRATEGIC INTERCEPTOR FOR TERMINAL STATUS FORK (DIRECTOR SIGN-OFF) 🌟 ---
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
      const formattedFromStep = activeStep.title.replace(/DDD/g, "Divisional Deputy Director");
      const formattedToStep = finalTitle.replace(/DDD/g, "Divisional Deputy Director");

      const systemLogEntry = {
        fromStep: formattedFromStep,
        toStep: formattedToStep,
        actorName: actingUserName,
        actorId: actingUserId,
        actorRole: actingUserRole,
        assignedToId: targetUserId,
        action: direction,
        text: remarks,
        timestamp: timestamp.toISOString()
      };

      // ------------------------------------------------------------------
      // 4. UPDATE CORE APPLICATION STATE & TARGET ASSIGNMENT
      // ------------------------------------------------------------------
      
      const isValidUuid = (id: string | null | undefined): boolean => 
        !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let finalVettingInspectorId: string | null = isValidUuid(targetUserId) ? targetUserId : null;

      // Pool-based intake vs explicit user fallback
      const isIrsdDDDDesk = 
        targetStepKey === "DDD_IRSD_INTAKE" || 
        targetStepKey === "DDD_IRSD_REVIEW" ||
        formattedToStep === "Divisional Deputy Director IRSD Routing" ||
        formattedToStep === "Divisional Deputy Director IRSD Concurrence";

      // Role LOD steps (e.g. DIRECTOR_FINAL_SIGN_OFF) should remain UNPINNED (null assignedVettingInspectorId)
      // so ANY user with role = 'LOD' can see and adjudicate it in their inbox.
      const isLODPoolDesk = targetStepKey === "DIRECTOR_FINAL_SIGN_OFF" || nextStep.role === "LOD" || nextStep.role === "Director";

      if (!finalVettingInspectorId && isIrsdDDDDesk && !isLODPoolDesk) {
        const [irsdDDD] = await tx
          .select({ id: users.id })
          .from(users)
          .where(
            and(
              eq(users.role, "Divisional Deputy Director"),
              eq(users.division, "IRSD")
            )
          );

        if (irsdDDD) {
          finalVettingInspectorId = irsdDDD.id;
        }
      }

      await tx.update(applications)
        .set({
          currentPoint: formattedToStep,
          status: finalStatusLabel,
          assignedVettingInspectorId: isLODPoolDesk ? null : finalVettingInspectorId,
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            savedChecklistSnapshot: incomingSnapshot,
            comments: [...(oldDetails.comments || []), systemLogEntry],
            inspectionWorkflowMeta: {
              ...(oldDetails.inspectionWorkflowMeta || {}),
              currentStepKey: targetStepKey,
              currentOwnerId: isLODPoolDesk ? null : (finalVettingInspectorId || actingUserId),
              assignedVettingInspectorId: isLODPoolDesk ? null : finalVettingInspectorId,
              assignedAt: timestamp.toISOString(),
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

          const analyticsRows = obsList.map((obs: any) => ({
            reportId: upsertedReport.id,
            companyId: app.companyId,
            qualitySystem: obs.qualitySystem || obs.quality_system || obs.system || "General Quality System",
            severity: String(obs.severity || "OTHER").toUpperCase(),
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

      // ------------------------------------------------------------------
      // ⏱️ 6. CLOSE PREVIOUS QMS TIMELINE RECORD
      // ------------------------------------------------------------------
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          isNull(qmsTimelines.endTime)
        ));

      // ------------------------------------------------------------------
      // ⏱️ 7. OPEN NEW AUTHORITATIVE QMS TIMELINE INTERVAL
      // ------------------------------------------------------------------
      await tx.insert(qmsTimelines).values({
        applicationId,
        point: formattedToStep,
        division: nextStep.division || "ARCHIVE",
        staffId: isLODPoolDesk ? null : (finalVettingInspectorId || actingUserId),
        startTime: timestamp,
        details: {
          stepKey: targetStepKey,
          action: direction,
          assignedBy: actingUserId,
          assignedByName: actingUserName,
          remarks: remarks
        }
      });

      // 8. Refresh dashboard views
      revalidatePath("/dashboard/ddd");
      revalidatePath("/dashboard/staff");
      revalidatePath("/dashboard/director");
      revalidatePath("/ddd/inbox");
      revalidatePath("/director/inbox");

      return { success: true, arrivedAt: targetStepKey, currentStatus: finalStatusLabel };
    });
  } catch (error: any) {
    console.error("INSPECTION_ROUTING_ENGINE_ERROR:", error);
    return { success: false, error: error.message };
  }
}