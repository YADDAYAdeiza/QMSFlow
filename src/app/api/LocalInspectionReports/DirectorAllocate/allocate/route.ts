import { NextResponse } from 'next/server';
import { db } from '@/db';
import { applications, qmsTimelines } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { facilityCategorizationWorkflow } from '@/config/workflows/facilityCategorizationWorkflow';

export async function POST(req: Request) {
  try {
    const { applicationId, targetDivision, remarks } = await req.json();

    if (!applicationId || !targetDivision) {
      return NextResponse.json({ success: false, error: 'Missing applicationId or targetDivision.' }, { status: 400 });
    }

    const appIdNum = Number(applicationId);
    const nextStep = facilityCategorizationWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT;

    await db.transaction(async (tx) => {
      // 1. Close current active timeline timer for the Director stage
      // Explicitly targeting qmsTimelines.endTime / qmsTimelines.applicationId
      await tx
        .update(qmsTimelines)
        .set({ 
          endTime: new Date() 
        })
        .where(
          and(
            eq(qmsTimelines.applicationId, appIdNum),
            isNull(qmsTimelines.endTime)
          )
        );

      // 2. Fetch current application details to merge remarks
      const [appRecord] = await tx
        .select()
        .from(applications)
        .where(eq(applications.id, appIdNum));

      const existingDetails = (appRecord?.details as Record<string, any>) || {};

      // 3. Update application state to hand off to the Divisional Deputy Director
      await tx
        .update(applications)
        .set({
          currentPoint: nextStep.currentPoint,
          status: nextStep.statusLabel,
          details: {
            ...existingDetails,
            assignedDivision: targetDivision,
            directorAllocationRemarks: remarks,
          },
          updatedAt: new Date(),
        })
        .where(eq(applications.id, appIdNum));

      // 4. Open a new QMS timeline record for the assigned division
      await tx.insert(qmsTimelines).values({
        applicationId: appIdNum,
        point: nextStep.currentPoint,
        division: targetDivision,
        startTime: new Date(),
        details: { remarks },
      });
    });

    return NextResponse.json({ success: true, message: 'Application allocated successfully.' });
  } catch (error: any) {
    console.error('Failed to allocate application:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}