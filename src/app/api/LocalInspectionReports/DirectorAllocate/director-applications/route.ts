import { NextResponse } from 'next/server';
import { db } from '@/db';
import { applications } from '@/db/schema';
import { or, eq, sql } from 'drizzle-orm';

export async function GET() {
  try {
    const allDirectorApplications = await db.query.applications.findMany({
      where: or(
        eq(applications.currentPoint, "Director Initial Allocation"),
        eq(applications.status, "PENDING_DIRECTOR_ALLOCATION"),
        eq(applications.currentPoint, "Director Final Approval & Sign-Off"),
        eq(applications.status, "PENDING_FINAL_SIGN_OFF"),
        eq(applications.currentPoint, "Applicant Notification Hub - Final Approval Certified"),
        eq(applications.currentPoint, "Applicant Notification Hub - CAPA Request Issued"),
        eq(applications.currentPoint, "Report Approved and Archived"),
        eq(applications.status, "APPROVED_AND_ARCHIVED"),
        eq(applications.status, "APPROVED"),
        eq(applications.status, "AWAITING_CAPA"),
        sql`${applications.details}->'inspectionWorkflowMeta'->>'currentStepKey' = 'FINALIZED'`
      ),
    });

    return NextResponse.json({ success: true, data: allDirectorApplications });
  } catch (error: any) {
    console.error('Failed to fetch director applications:', error);
    return NextResponse.json({ success: false, error: error.message || 'Internal Server Error' }, { status: 500 });
  }
}