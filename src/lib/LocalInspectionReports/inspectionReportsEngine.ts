"use server";

import { db } from "@/db";
import { 
  users,
  applications, 
  qmsTimelines, 
  localInspectionReports, 
  inspectionObservationsAnalytics,
  companies
} from "@/db/schema";
import { eq, and, isNull, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { sendOversightEmail } from "@/lib/utils/mail";

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

    // Execute core database transaction
    const transactionResult = await db.transaction(async (tx) => {
      // 2. Locate Application and Company parameters with join
      const appRecord = await tx
        .select({
          app: applications,
          companyName: companies.name
        })
        .from(applications)
        .innerJoin(companies, eq(applications.companyId, companies.id))
        .where(eq(applications.id, applicationId))
        .limit(1);

      if (!appRecord || appRecord.length === 0) throw new Error("Application record not found.");
      const { app, companyName } = appRecord[0];

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
      // 4. RESOLVE ASSIGNEE FOR REVERSE / POOL PATHWAYS
      // ------------------------------------------------------------------
      const isValidUuid = (id: string | null | undefined): boolean => 
        !!id && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);

      let finalVettingInspectorId: string | null = isValidUuid(targetUserId) ? targetUserId : null;

      // Determine if destination is a Role/Pool level desk (e.g. Director, LOD)
      const isLODPoolDesk = targetStepKey === "DIRECTOR_FINAL_SIGN_OFF" || 
                            targetStepKey === "DIRECTOR_INTAKE" ||
                            nextStep.role === "LOD" || 
                            nextStep.role === "Director";

      // Check if destination is specifically IRSD Intake / Routing Desk
      const isIrsdIntakeDesk = targetStepKey === "DDD_IRSD_INTAKE" || 
                                formattedToStep === "Divisional Deputy Director IRSD Routing";

      // A. IF NO EXPLICIT TARGET & RETURNING BACKWARD
      if (!finalVettingInspectorId && (direction === "REWORK" || direction === "TARGETED_REWORK") && !isLODPoolDesk && !isIrsdIntakeDesk) {
        const [priorTimeline] = await tx
          .select({ staffId: qmsTimelines.staffId })
          .from(qmsTimelines)
          .where(
            and(
              eq(qmsTimelines.applicationId, applicationId),
              eq(qmsTimelines.point, formattedToStep)
            )
          )
          .orderBy(desc(qmsTimelines.startTime))
          .limit(1);

        if (priorTimeline?.staffId && isValidUuid(priorTimeline.staffId)) {
          finalVettingInspectorId = priorTimeline.staffId;
        }
      }

      // B. IRSD INTAKE DESK OVERRIDE
      if (!finalVettingInspectorId && isIrsdIntakeDesk) {
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

      // ------------------------------------------------------------------
      // 5. UPDATE CORE APPLICATION STATE
      // ------------------------------------------------------------------
      const assignedOwner = isLODPoolDesk ? null : finalVettingInspectorId;

      await tx.update(applications)
        .set({
          currentPoint: formattedToStep,
          status: finalStatusLabel,
          assignedVettingInspectorId: assignedOwner,
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            savedChecklistSnapshot: incomingSnapshot,
            comments: [...(oldDetails.comments || []), systemLogEntry],
            inspectionWorkflowMeta: {
              ...(oldDetails.inspectionWorkflowMeta || {}),
              currentStepKey: targetStepKey,
              currentOwnerId: assignedOwner,
              assignedVettingInspectorId: assignedOwner,
              assignedAt: timestamp.toISOString(),
              lastAction: direction
            }
          }
        })
        .where(eq(applications.id, applicationId));

      // ------------------------------------------------------------------
      // 📊 6. ANALYTICAL WAREHOUSE PIPELINE (FORWARD ONLY)
      // ------------------------------------------------------------------
      if (incomingSnapshot && direction === "FORWARD") {
        const docNumber = incomingSnapshot.report_doc_number || `NAFDAC/VMD/GMP/${applicationId}/2026`;
        const obsList = incomingSnapshot.observations || [];

        const criticalCount = incomingSnapshot.critical_count ?? obsList.filter((o: any) => o.severity === "critical").length;
        const majorCount = incomingSnapshot.major_count ?? obsList.filter((o: any) => o.severity === "major").length;
        const otherCount = incomingSnapshot.other_count ?? obsList.filter((o: any) => o.severity === "other").length;
        const totalObs = obsList.length || (criticalCount + majorCount + otherCount);

        const rec = incomingSnapshot.final_recommendation || "PENDING";
        const isCapaReq = rec === "CAPA_PENDING";

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

        if (upsertedReport?.id && obsList.length > 0) {
          await tx
            .delete(inspectionObservationsAnalytics)
            .where(eq(inspectionObservationsAnalytics.reportId, upsertedReport.id));

          const analyticsRows = obsList.map((obs: any) => ({
            reportId: upsertedReport.id,
            companyId: app.companyId,
            qualitySystem: obs.qualitySystem || obs.quality_system || obs.system || "General Quality System",
            severity: String(obs.severity || "OTHER").toUpperCase(),
            rootCauseCategory: obs.root_cause_category || obs.rootCauseCategory || obs.root_cause || obs.rootCause || "Uncategorized",
            observationText: obs.observationText || obs.observation_text || obs.text || obs.observation || "Observation recorded without description.",
          }));

          await tx.insert(inspectionObservationsAnalytics).values(analyticsRows);
        }
      }

      // ------------------------------------------------------------------
      // ⏱️ 7. CLOSE PREVIOUS & OPEN NEW AUTHORITATIVE QMS TIMELINE INTERVAL
      // ------------------------------------------------------------------
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId,
        point: formattedToStep,
        division: nextStep.division || "ARCHIVE",
        staffId: assignedOwner,
        startTime: timestamp,
        details: {
          stepKey: targetStepKey,
          action: direction,
          assignedBy: actingUserId,
          assignedByName: actingUserName,
          remarks: remarks
        }
      });

      // ------------------------------------------------------------------
      // 📧 8. RESOLVE TARGET RECIPIENT EMAIL FOR OVERSIGHT DISPATCH
      // ------------------------------------------------------------------
      let recipientEmail: string | undefined = undefined;

      if (assignedOwner) {
        // If an explicit officer is assigned, grab their email from the users table
        const [assignedUserRecord] = await tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.id, assignedOwner))
          .limit(1);

        if (assignedUserRecord?.email) {
          recipientEmail = assignedUserRecord.email;
        }
      } else if (nextStep.role === "Director") {
        // Fallback to Director email env configuration or pool query if role is Director
        const [directorRecord] = await tx
          .select({ email: users.email })
          .from(users)
          .where(eq(users.role, "Director"))
          .limit(1);
        recipientEmail = directorRecord?.email || process.env.DIRECTOR_EMAIL;
      }

      revalidatePath("/LocalInspectionReports/ddd/inbox", "page");
      revalidatePath("/LocalInspectionReports/Director/Inbox", "page");
      revalidatePath("/LocalInspectionReports/Inspectors/Inbox", "page");

      return { 
        success: true, 
        arrivedAt: targetStepKey, 
        currentStatus: finalStatusLabel,
        appNumber: app.applicationNumber,
        appType: app.type,
        companyName,
        facilityName: oldDetails.facilityName || incomingSnapshot?.inspected_site_name || "N/A",
        recipientEmail
      };
    });

    // ------------------------------------------------------------------
    // 📨 9. TRIGGER OUT-OF-TRANSACTION EMAIL DISPATCH
    // ------------------------------------------------------------------
    if (transactionResult.success && transactionResult.recipientEmail) {
      console.log(`\n📧 [ROUTING ENGINE] Triggering Oversight Email Dispatch...`);
      console.log(`➡️ Target Recipient (To): ${transactionResult.recipientEmail}`);
      console.log(`➡️ CC Oversight: adeiza.yusuf@nafdac.gov.ng`);
      console.log(`➡️ Application Number: #${transactionResult.appNumber}`);
      console.log(`➡️ Milestone Desk: ${nextStep.title}\n`);

      await sendOversightEmail({
        appNumber: transactionResult.appNumber,
        type: transactionResult.appType || "GMP Inspection Report",
        companyName: transactionResult.companyName,
        facilityName: transactionResult.facilityName,
        lodRemarks: remarks,
        customRecipient: transactionResult.recipientEmail,
        emailTitle: `New Desk Assignment: ${nextStep.title}`
      });
    } else {
      console.log(`\n⚠️ [ROUTING ENGINE] Email dispatch skipped: recipientEmail was not resolved or transaction failed.\n`);
    }

    return { success: true, arrivedAt: transactionResult.arrivedAt, currentStatus: transactionResult.currentStatus };

  } catch (error: any) {
    console.error("INSPECTION_ROUTING_ENGINE_ERROR:", error);
    return { success: false, error: error.message };
  }
}