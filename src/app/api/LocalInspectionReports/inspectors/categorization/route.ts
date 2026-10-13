import { NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, companies, facilities, qmsTimelines, riskAssessments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { facilityCategorizationWorkflow } from '@/config/workflows/facilityCategorizationWorkflow';
import { sendOversightEmail } from '@/lib/utils/mail';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const {
      facilityId,
      applicationId,
      complexityScore,
      criticalityScore,
      intrinsicLevel,
      criticalDeficiencies,
      majorDeficiencies,
      otherDeficiencies,
      complianceLevel,
      overallRiskRating,
      nextInspectionDate,
      timerSeconds,
      reviewerTitle
    } = body;

    if (!facilityId) {
      return NextResponse.json({ success: false, error: 'Missing facilityId.' }, { status: 400 });
    }

    const numericAppId = applicationId ? Number(applicationId) : null;
    const now = new Date();
    const currentStep = facilityCategorizationWorkflow.steps.UNDER_CATEGORIZATION;
    const nextStep = facilityCategorizationWorkflow.steps.DDD_CATEGORIZATION_ENDORSEMENT;

    const result = await db.transaction(async (tx) => {
      // 1. Record detailed risk assessment evaluation
      const [riskRecord] = await tx
        .insert(riskAssessments)
        .values({
          facilityId: facilityId,
          applicationId: numericAppId,
          complexityScore: complexityScore,
          criticalityScore: criticalityScore,
          intrinsicLevel: intrinsicLevel,
          criticalDeficiencies: criticalDeficiencies,
          majorDeficiencies: majorDeficiencies,
          otherDeficiencies: otherDeficiencies,
          complianceLevel: complianceLevel,
          overallRiskRating: overallRiskRating,
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
          status: "COMPLETED",
          updatedAt: now,
        })
        .onConflictDoUpdate({
          target: riskAssessments.applicationId,
          set: {
            complexityScore: complexityScore,
            criticalityScore: criticalityScore,
            intrinsicLevel: intrinsicLevel,
            criticalDeficiencies: criticalDeficiencies,
            majorDeficiencies: majorDeficiencies,
            otherDeficiencies: otherDeficiencies,
            complianceLevel: complianceLevel,
            overallRiskRating: overallRiskRating,
            nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
            status: "COMPLETED",
            updatedAt: now,
          },
        })
        .returning();

      // 2. Update facilities table status
      await tx
        .update(facilities)
        .set({
          isCategorized: true,
          currentRiskRating: overallRiskRating,
          nextInspectionDate: nextInspectionDate ? new Date(nextInspectionDate) : null,
          updatedAt: now,
        })
        .where(eq(facilities.id, facilityId));

      let appDetails = null;

      if (numericAppId) {
        // 3. Close active timeline record
        await tx
          .update(qmsTimelines)
          .set({
            endTime: now,
            details: {
              time_spent_seconds: timerSeconds,
              action: "FORWARD_TO_ENDORSEMENT",
              categorized_by_title: reviewerTitle || "Divisional Deputy Director",
            },
          })
          .where(eq(qmsTimelines.applicationId, numericAppId));

        // 4. Open new timeline record for DDD endorsement
        await tx.insert(qmsTimelines).values({
          applicationId: numericAppId,
          point: nextStep.currentPoint,
          division: nextStep.division,
          startTime: now,
          endTime: null,
          details: {
            routed_from: currentStep.key,
            assigned_role: nextStep.role,
          },
        });

        // 5. Update applications status and fetch app details for email dispatch
        const [updatedApp] = await tx
          .update(applications)
          .set({
            currentPoint: nextStep.currentPoint,
            status: nextStep.statusLabel,
            updatedAt: now,
          })
          .where(eq(applications.id, numericAppId))
          .returning();

        const [comp] = await tx
          .select({ name: companies.name })
          .from(companies)
          .where(eq(companies.id, updatedApp.companyId));

        const [fac] = await tx
          .select({ name: facilities.name })
          .from(facilities)
          .where(eq(facilities.id, facilityId));

        appDetails = {
          applicationNumber: updatedApp.applicationNumber,
          type: updatedApp.type,
          companyName: comp?.name || "Registered Establishment",
          facilityName: fac?.name || "Manufacturing Site",
          notificationEmail: (updatedApp.details as any)?.notificationEmail,
        };
      }

      return appDetails;
    });

    // 🚀 Trigger Context-Aware Email Dispatch Post-Transaction
    if (result) {
        console.log('result.notificationEmail: ', result.notificationEmail);
      await sendOversightEmail({
        appNumber: result.applicationNumber,
        type: result.type || 'Pre-Registration',
        companyName: result.companyName,
        facilityName: result.facilityName,
        lodRemarks: `Facility categorization completed with Risk Rating ${overallRiskRating} (Intrinsic: ${intrinsicLevel}, Compliance: ${complianceLevel}). Routed to Divisional Deputy Director Endorsement.`,
        customRecipient: result.notificationEmail || undefined,
        emailTitle: "Facility Categorization Completed",
      });
    }

    return NextResponse.json({ success: true, message: 'Facility categorization saved and processed successfully.' });
  } catch (error: any) {
    console.error('Categorization endpoint error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}