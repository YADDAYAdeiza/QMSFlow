"use server";

import { db } from "@/db";
import { applications, users, qmsTimelines, riskAssessments } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { sendOversightEmail } from "@/lib/utils/mail"; 
import { getWorkflowStep } from "@/config/workflows/facilityVerificationWorkflow";

/**
 * Submits a technical or compliance review to the Divisional Deputy Director.
 * Handles optional file uploads, updates QMS task timing, and optionally triggers email notifications.
 */
export async function submitToDDD(
  appId: number, 
  userId: string, 
  justification: string, 
  isHubVetting: boolean,
  reportUrl: string, 
  complianceData: any,
  sendEmail: boolean = false
) {
  try {
    // 1. Context & Permissions Check
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");

    // Identify the Divisional Deputy Director for the specific division
    const divisionalDD = await db.query.users.findFirst({
      where: (u, { and, eq }) => and(
        eq(u.division, user.division as any), 
        eq(u.role, 'Divisional Deputy Director')
      ),
    });

    const txResult = await db.transaction(async (tx) => {
      const dbTimestamp = new Date();
      
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const isRound2 = complianceData.isComplianceReview; 
      const oldDetails = (app.details as any) || {};

      // 2. Create the Audit Trail Entry
      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Staff Reviewer" : "Technical Staff Reviewer",
        text: justification,
        action: isRound2 ? "COMPLIANCE_AUDIT_COMPLETED" : "TECHNICAL_VETTING_SUBMITTED",
        attachmentUrl: reportUrl || null, 
        timestamp: dbTimestamp.toISOString(),
      };

      // 3. Update Application Details with Elevated URLs
      const updatedDetails = { 
        ...oldDetails, 
        comments: [...(oldDetails.comments || []), newComment],
        
        ...(isHubVetting 
            ? { verificationReportUrl: reportUrl || oldDetails.verificationReportUrl || null } 
            : { technicalAssessmentUrl: reportUrl || oldDetails.technicalAssessmentUrl || null }
        ),

        ...(isRound2 && {
          compliance_summary: complianceData.summary, 
          findings_ledger: complianceData.findings,
          is_sra: complianceData.isSra,
        })
      };

      // Define Workflow Routing via Centralized Configuration Helpers
      // Hub vetting goes to DDD_IRSD_REVIEW; standard technical review goes to DDD_TECHNICAL_REVIEW
      const stepKey = isHubVetting ? "DDD_IRSD_REVIEW" : "DDD_TECHNICAL_REVIEW";
      const workflowStep = getWorkflowStep("VMAP", stepKey);

      const targetPoint = workflowStep ? workflowStep.title : (isHubVetting ? "Divisional Deputy Director IRSD Concurrence" : "Divisional Deputy Director Technical Endorsement");
      const targetStatus = workflowStep ? workflowStep.statusLabel : (isHubVetting ? "PENDING_IRSD_CONCURRENCE" : "PENDING_TECHNICAL_ENDORSEMENT");

      await tx.update(applications).set({
        currentPoint: targetPoint,
        status: targetStatus,
        details: updatedDetails,
        updatedAt: dbTimestamp
      }).where(eq(applications.id, appId));

      // 4. Risk Assessment Logic (Triggered only on Compliance Reviews)
      if (isRound2 && complianceData.riskId) {
        let level: 'Low' | 'Medium' | 'High' = 'Low';
        
        if (complianceData.summary.criticalCount > 0) {
          level = 'High';
        } else if (complianceData.summary.majorCount >= 3) {
          level = 'Medium';
        }

        await tx.update(riskAssessments).set({
          complianceLevel: level,
          sraStatus: complianceData.isSra ? "TRUE" : "FALSE",
          majorDeficiencies: complianceData.summary.majorCount,
          criticalDeficiencies: complianceData.summary.criticalCount,
          otherDeficiencies: complianceData.summary.otherCount,
          status: 'FINALIZED',
          updatedAt: dbTimestamp
        }).where(eq(riskAssessments.id, complianceData.riskId));
      }

      // 5. QMS Timing Requirements
      await tx.update(qmsTimelines)
        .set({ endTime: dbTimestamp })
        .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: targetPoint,
        division: user.division as any,
        staffId: divisionalDD?.id || null, 
        startTime: dbTimestamp,
      });

      return {
        appNumber: app.applicationNumber || app.appNumber || appId.toString(),
        type: isRound2 ? "Compliance Audit Review" : (isHubVetting ? "IRSD Hub Concurrence" : "Technical Endorsement"),
        companyName: app.companyName || oldDetails.applicantCompanyName || oldDetails.companyName || "N/A",
        facilityName: app.facilityName || oldDetails.manufacturingSiteName || oldDetails.facilityName || "N/A",
        customRecipient: divisionalDD?.email,
      };
    });

    // 6. Conditionally Trigger Email Dispatch Post-Transaction
    if (sendEmail) {
      sendOversightEmail({
        appNumber: txResult.appNumber,
        type: txResult.type,
        companyName: txResult.companyName,
        facilityName: txResult.facilityName,
        lodRemarks: justification,
        customRecipient: txResult.customRecipient,
      }).catch((emailErr) => {
        console.error("Background Email Dispatch Failed:", emailErr);
      });
    }

    // 7. Refresh and return
    revalidatePath('/dashboard/ddd');
    return { success: true };
  } catch (error: any) { 
    console.error("Submission Error:", error);
    return { success: false, error: error.message }; 
  }
}