
"use server";

import { db } from "@/db";
import { qmsTimelines, applications, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitToDDD(
  appId: number, 
  userId: string, 
  justification: string, 
  isHubVetting: boolean,
  reportUrl: string,
  complianceData: any 
) {
  try {
    // 1. Fetch User and appropriate DDD for the division
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");

    // Important: We find the DD of the user's current division (e.g., IRSD or VMD)
    const divisionalDD = await db.query.users.findFirst({
      where: (u, { and, eq }) => and(
        eq(u.division, user.division as any), 
        eq(u.role, 'Divisional Deputy Director')
      ),
    });

    return await db.transaction(async (tx) => {
      const dbTimestamp = new Date();
      
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const isRound2 = complianceData.isComplianceReview;

      // 2. THE AUDIT TRAIL: Capture the snapshot of this specific submission
      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Officer" : "Technical Specialist",
        division: user.division,
        text: justification,
        action: isRound2 ? "COMPLIANCE_AUDIT_COMPLETED" : "TECHNICAL_VETTING_SUBMITTED",
        attachmentUrl: reportUrl, 
        timestamp: dbTimestamp.toISOString(),
        complianceSnapshot: {
          isSra: complianceData.isSra,
          critical: complianceData.summary?.criticalCount || 0,
          major: complianceData.summary?.majorCount || 0,
          other: complianceData.summary?.otherCount || 0,
          phase: isHubVetting ? "Post-Registration (IRSD)" : "Technical (VMD)"
        }
      };

      const updatedDetails = { 
        ...oldDetails, 
        comments: [...(oldDetails.comments || []), newComment],
        compliance_summary: complianceData.summary, 
        findings_ledger: complianceData.findings,
        is_sra: complianceData.isSra,
        // Map URLs correctly so the DD viewer sees them
        ...(isHubVetting 
            ? { verificationReportUrl: reportUrl, inspectionAuditReportUrl: reportUrl } 
            : { technicalAssessmentUrl: reportUrl, inspectionReportUrl: reportUrl }
        )
      };

      // 3. Update Application State
      // IRSD Staff Vetting Return triggers the 'Approve to Director' button in the UI
      const targetPoint = isHubVetting ? "IRSD Staff Vetting Return" : "Technical DD Review Return";
      const targetStatus = isHubVetting ? "AWAITING_HUB_ENDORSEMENT" : "PENDING_DD_RECOMMENDATION";

      await tx.update(applications).set({
        currentPoint: targetPoint,
        status: targetStatus,
        isComplianceReview: false, // Close the specialist's editing lock
        details: updatedDetails,
        updatedAt: dbTimestamp
      }).where(eq(applications.id, appId));

      // 4. Update Risk Assessment Table (if ID provided)
      if (complianceData.riskId) {
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
          findings: complianceData.findings,
          updatedAt: dbTimestamp
        }).where(eq(riskAssessments.id, complianceData.riskId));
      }

      // 5. QMS Timing Logic
      // Stop the clock for the Staff Member
      await tx.update(qmsTimelines)
        .set({ endTime: dbTimestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // Start the clock for the Divisional Deputy Director
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: targetPoint,
        division: user.division as any,
        staffId: divisionalDD?.id || null, 
        startTime: dbTimestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      
      return { success: true };
    });
  } catch (error: any) { 
    console.error("Submission Error:", error);
    return { success: false, error: error.message }; 
  }
}