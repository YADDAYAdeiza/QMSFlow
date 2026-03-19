// "use server";

// import { db } from "@/db";
// import { qmsTimelines, applications, users, riskAssessments } from "@/db/schema";
// import { eq, and, isNull, sql } from "drizzle-orm";
// import { revalidatePath } from "next/cache";

// export async function submitToDDD(
//   appId: number,
//   staffId: string,
//   remarks: string,
//   isHubVetting: boolean,
//   reportUrl: string,
//   complianceData: any // Expected: { isSra, summary: {criticalCount, majorCount, otherCount}, findings, riskId }
// ) {
//   try {
//     return await db.transaction(async (tx) => {
//       const dbNow = sql`now()`;
      
//       const app = await tx.query.applications.findFirst({
//         where: eq(applications.id, appId),
//       });

//       if (!app) throw new Error("Application not found");
//       const oldDetails = (app.details as any) || {};

//       const newEntry = {
//         from: isHubVetting ? "IRSD Staff" : "Technical Reviewer",
//         role: "Staff",
//         text: remarks,
//         attachmentUrl: reportUrl,
//         timestamp: new Date().toISOString(),
//       };

//       // 1. UPDATE APPLICATION DETAILS
//       // We save the findings specifically so the next person in the chain can see them.
//       const updatedDetails = {
//         ...oldDetails,
//         comments: [...(oldDetails.comments || []), newEntry],
//         compliance_summary: complianceData.summary, 
//         findings_ledger: complianceData.findings,
//         is_sra: complianceData.isSra,
//       };

//       await tx.update(applications)
//         .set({
//           status: isHubVetting ? "VETTING_COMPLETED" : "REVIEW_COMPLETED",
//           currentPoint: isHubVetting ? "Director Final Review" : "DDD Review",
//           details: updatedDetails,
//           updatedAt: dbNow,
//         })
//         .where(eq(applications.id, appId));

//       // 2. UPDATE RISK ASSESSMENT (Pass 2)
//       if (complianceData.riskId) {
//         // Simple logic to determine Compliance Level based on tallies
//         let level: 'Low' | 'Medium' | 'High' = 'Low';
//         if (complianceData.summary.criticalCount > 0) level = 'High';
//         else if (complianceData.summary.majorCount >= 3) level = 'Medium';

//         await tx.update(riskAssessments)
//           .set({
//             complianceLevel: level,
//             updatedAt: dbNow
//           })
//           .where(eq(riskAssessments.id, complianceData.riskId));
//       }

//       // 3. QMS CLOCK MANAGEMENT
//       // Stop current staff clock
//       await tx.update(qmsTimelines)
//         .set({ endTime: dbNow })
//         .where(and(
//           eq(qmsTimelines.applicationId, appId),
//           eq(qmsTimelines.staffId, staffId),
//           isNull(qmsTimelines.endTime)
//         ));

//       // Start DDD or Director clock
//       await tx.insert(qmsTimelines).values({
//         applicationId: appId,
//         point: isHubVetting ? 'Director Final Review' : 'DDD Review',
//         division: isHubVetting ? 'DIRECTORATE' : oldDetails.division || 'VMD',
//         startTime: dbNow,
//       });

//       revalidatePath('/dashboard/staff');
//       revalidatePath('/dashboard/director');
      
//       return { success: true };
//     });
//   } catch (err: any) {
//     console.error("SUBMISSION_ERROR:", err);
//     return { success: false, error: err.message };
//   }
// }

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
      where: (u, { and, eq }) => and(eq(u.division, user.division as any), eq(u.role, 'Divisional Deputy Director')),
    });

    return await db.transaction(async (tx) => {
      const dbTimestamp = new Date();
      const app = await tx.query.applications.findFirst({ where: eq(applications.id, appId) });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};

      // THE TIME CAPSULE: We bake the compliance data INTO the comment
      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Officer" : "Staff",
        division: user.division,
        text: justification,
        action: isHubVetting ? "HUB_VETTING_COMPLETED" : "TECHNICAL_ASSESSMENT_SUBMITTED",
        attachmentUrl: reportUrl, 
        timestamp: dbTimestamp.toISOString(),
        // Capture the snapshot for the Audit Trail
        complianceSnapshot: {
          isSra: complianceData.isSra,
          critical: complianceData.summary.criticalCount,
          major: complianceData.summary.majorCount,
          other: complianceData.summary.otherCount
        }
      };

      const updatedDetails = { 
        ...oldDetails, 
        comments: [...(oldDetails.comments || []), newComment],
        compliance_summary: complianceData.summary, 
        findings_ledger: complianceData.findings,
        is_sra: complianceData.isSra,
        ...(isHubVetting ? { verificationReportUrl: reportUrl } : { technicalAssessmentUrl: reportUrl })
      };

      // Update Application Table
      await tx.update(applications).set({
        currentPoint: isHubVetting ? "IRSD Hub Clearance" : "Technical DD Review Return",
        status: isHubVetting ? "AWAITING_HUB_ENDORSEMENT" : "PENDING_DD_RECOMMENDATION",
        details: updatedDetails,
        updatedAt: dbTimestamp
      }).where(eq(applications.id, appId));

      // Update Risk Assessment Table
      if (complianceData.riskId) {
        let level: 'Low' | 'Medium' | 'High' = 'Low';
        if (complianceData.summary.criticalCount > 0) level = 'High';
        else if (complianceData.summary.majorCount >= 3) level = 'Medium';

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

      // QMS Logic
      await tx.update(qmsTimelines).set({ endTime: dbTimestamp }).where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: isHubVetting ? "IRSD Hub Clearance" : "Technical DD Review Return",
        division: user.division as any,
        staffId: divisionalDD?.id || null, 
        startTime: dbTimestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      return { success: true };
    });
  } catch (error: any) { return { success: false, error: error.message }; }
}