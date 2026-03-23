
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
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");

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

      // Use the flag passed from the form to determine the Pass
      const isRound2 = complianceData.isComplianceReview; 
      const oldDetails = (app.details as any) || {};

      // 1. Update Application Details & Audit Trail
      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Officer" : "Technical Specialist",
        text: justification,
        action: isRound2 ? "COMPLIANCE_AUDIT_COMPLETED" : "TECHNICAL_VETTING_SUBMITTED",
        attachmentUrl: reportUrl, 
        timestamp: dbTimestamp.toISOString(),
      };

      const updatedDetails = { 
        ...oldDetails, 
        comments: [...(oldDetails.comments || []), newComment],
        // Only map these specific results if it's actually Round 2
        ...(isRound2 && {
          compliance_summary: complianceData.summary, 
          findings_ledger: complianceData.findings,
          is_sra: complianceData.isSra,
        }),
        ...(isHubVetting 
            ? { verificationReportUrl: reportUrl } 
            : { technicalAssessmentUrl: reportUrl }
        )
      };

      const targetPoint = isHubVetting ? "IRSD Staff Vetting Return" : "Technical DD Review Return";
      const targetStatus = isHubVetting ? "AWAITING_HUB_ENDORSEMENT" : "PENDING_DD_RECOMMENDATION";

      await tx.update(applications).set({
        currentPoint: targetPoint,
        status: targetStatus,
        details: updatedDetails,
        updatedAt: dbTimestamp
      }).where(eq(applications.id, appId));

      // 2. RISK ASSESSMENT TABLE: ONLY update in Pass 2
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
          status: 'FINALIZED', // Now safely finalized only in Pass 2
          updatedAt: dbTimestamp
        }).where(eq(riskAssessments.id, complianceData.riskId));
      }

      // 3. QMS Timing
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

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) { 
    return { success: false, error: error.message }; 
  }
}