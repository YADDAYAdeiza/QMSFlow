import { NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, companies, qmsTimelines, riskAssessments, facilities } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { facilityCategorizationWorkflow } from '@/config/workflows/facilityCategorizationWorkflow';
import { sendOversightEmail } from '@/lib/utils/mail';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const appId = searchParams.get("appId");
    const facilityId = searchParams.get("facilityId");

    if (!appId) {
      return NextResponse.json({ success: false, error: 'Missing applicationId.' }, { status: 400 });
    }

    const [assessment] = await db
      .select()
      .from(riskAssessments)
      .where(eq(riskAssessments.applicationId, Number(appId)));

    return NextResponse.json({
      success: true,
      riskAssessment: assessment || null,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { applicationId, facilityId, action, remarks } = await req.json();

    if (!applicationId || !action) {
      return NextResponse.json({ success: false, error: 'Missing required parameters.' }, { status: 400 });
    }

    const appIdNum = Number(applicationId);
    const currentStep = facilityCategorizationWorkflow.steps.DDD_CATEGORIZATION_ENDORSEMENT;
    
    const nextStepKey = action === "ENDORSE" ? currentStep.nextStepKey : currentStep.prevStepKey;
    const nextStep = facilityCategorizationWorkflow.steps[nextStepKey as string];

    const result = await db.transaction(async (tx) => {
      // 1. Close active QMS timeline entry for DDD Endorsement
      await tx
        .update(qmsTimelines)
        .set({ endTime: new Date() })
        .where(
          and(
            eq(qmsTimelines.applicationId, appIdNum),
            isNull(qmsTimelines.endTime)
          )
        );

      // 2. Fetch application details and company name for context-aware emails
      const [appRecord] = await tx
        .select({
          id: applications.id,
          applicationNumber: applications.applicationNumber,
          type: applications.type,
          details: applications.details,
          companyName: companies.name,
        })
        .from(applications)
        .innerJoin(companies, eq(applications.companyId, companies.id))
        .where(eq(applications.id, appIdNum));

      const existingDetails = (appRecord?.details as Record<string, any>) || {};

      // 3. Update Application Status & Point
      await tx
        .update(applications)
        .set({
          currentPoint: nextStep.currentPoint,
          status: nextStep.statusLabel,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, appIdNum));

      // 4. If endorsed, ensure facility is formally marked as categorized
      if (action === "ENDORSE" && facilityId) {
        await tx
          .update(facilities)
          .set({ isCategorized: true, updatedAt: new Date() })
          .where(eq(facilities.id, facilityId));
      }

      // 5. Open new QMS timeline record for the subsequent step
      await tx.insert(qmsTimelines).values({
        applicationId: appIdNum,
        point: nextStep.currentPoint,
        division: nextStep.division,
        startTime: new Date(),
        details: { action, remarks },
      });

      return appRecord;
    });

    // 🚀 Context-Aware Email Dispatch Post-Transaction
    if (result) {
      const details = (result.details as Record<string, any>) || {};
      const notificationEmail = details.notificationEmail;
      const actionTitle = action === "ENDORSE" ? "Categorization Endorsed" : "Categorization Returned for Review";

      await sendOversightEmail({
        appNumber: result.applicationNumber,
        type: result.type || 'Pre-Registration',
        companyName: result.companyName || 'Registered Establishment',
        facilityName: details.facilityName || `${result.companyName} Facility`,
        lodRemarks: `${actionTitle}: "${remarks || 'No specific remarks provided.'}"`,
        customRecipient: notificationEmail || undefined,
      });
    }

    return NextResponse.json({ success: true, message: `Application successfully processed as ${action}.` });
  } catch (error: any) {
    console.error('Endorsement processing error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}