"use server";

import { db } from "@/db";
import { applications, users, qmsTimelines, riskAssessments } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Submits a technical or compliance review to the Divisional Deputy Director.
 * Handles optional file uploads and updates QMS task timing.
 */
export async function submitToDDD(
  appId: number, 
  userId: string, 
  justification: string, 
  isHubVetting: boolean,
  reportUrl: string, // Passed as empty string from frontend if no file uploaded
  complianceData: any 
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

    return await db.transaction(async (tx) => {
      const dbTimestamp = new Date();
      
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const isRound2 = complianceData.isComplianceReview; 
      const oldDetails = (app.details as any) || {};

      // 2. Create the Audit Trail Entry
      // If reportUrl is empty, we set attachmentUrl to null to avoid broken links
      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Officer" : "Technical Specialist",
        text: justification,
        action: isRound2 ? "COMPLIANCE_AUDIT_COMPLETED" : "TECHNICAL_VETTING_SUBMITTED",
        attachmentUrl: reportUrl || null, 
        timestamp: dbTimestamp.toISOString(),
      };

      // 3. Update Application Details with Elevated URLs
      // We persist the previous URL if a new one wasn't uploaded during this step
      const updatedDetails = { 
        ...oldDetails, 
        comments: [...(oldDetails.comments || []), newComment],
        
        // Root-level elevation for the Viewer Panel (Optional Handling)
        ...(isHubVetting 
            ? { verificationReportUrl: reportUrl || oldDetails.verificationReportUrl || null } 
            : { technicalAssessmentUrl: reportUrl || oldDetails.technicalAssessmentUrl || null }
        ),

        // Compliance-specific metadata (Pass 2 / Round 2)
        ...(isRound2 && {
          compliance_summary: complianceData.summary, 
          findings_ledger: complianceData.findings,
          is_sra: complianceData.isSra,
        })
      };

      // Define Workflow Routing
      const targetPoint = isHubVetting ? "IRSD Staff Vetting Return" : "Technical DD Review Return";
      const targetStatus = isHubVetting ? "AWAITING_HUB_ENDORSEMENT" : "PENDING_DD_RECOMMENDATION";

      await tx.update(applications).set({
        currentPoint: targetPoint,
        status: targetStatus,
        details: updatedDetails,
        updatedAt: dbTimestamp
      }).where(eq(applications.id, appId));

      // 4. Risk Assessment Logic (Triggered only on Compliance Reviews)
      if (isRound2 && complianceData.riskId) {
        let level: 'Low' | 'Medium' | 'High' = 'Low';
        
        // Scoring Logic: Criticals always High; 3+ Majors move to Medium
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
      // Close the current staff member's active task
      await tx.update(qmsTimelines)
        .set({ endTime: dbTimestamp })
        .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      // Open the new task for the Divisional Deputy Director
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: targetPoint,
        division: user.division as any,
        staffId: divisionalDD?.id || null, 
        startTime: dbTimestamp,
      });

      // 6. Refresh and return
      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) { 
    console.error("Submission Error:", error);
    return { success: false, error: error.message }; 
  }
}