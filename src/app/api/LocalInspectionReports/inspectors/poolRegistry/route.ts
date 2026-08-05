import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { inspectionReportWorkflow } from '@/config/workflows/inspectionReportWorkflow';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch field-ready personnel
    const { data: staffList, error: staffError } = await supabase
      .from('users')
      .select('id, name, division, role')
      .eq('role', 'Staff')
      .order('name', { ascending: true });

    if (staffError) throw staffError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ inspectors: [] });
    }

    // 2. Fetch assignments joined with application stage metadata
    const { data: activeAssignments, error: joinError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        inspector_id,
        inspection_schedules:schedule_id (
          id,
          application_id,
          applications:application_id (
            id,
            current_point,
            details
          )
        )
      `);

    if (joinError) throw joinError;

    const trackingMap: Record<string, Array<{ application_id: number; company_name: string; current_step_title: string }>> = {};

    activeAssignments?.forEach((assignment: any) => {
      const inspectorId = assignment.inspector_id;
      const app = assignment.inspection_schedules?.applications;
      
      if (app) {
        // 🔒 Staff are locked ONLY if the application is actively in STAFF_TECHNICAL_REVIEW
        if (app.current_point === inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title) {
          const detailsObj = typeof app.details === 'string' ? JSON.parse(app.details) : app.details;
          const siteName = detailsObj?.savedChecklistSnapshot?.inspected_site_name || "Unknown Facility";

          if (!trackingMap[inspectorId]) {
            trackingMap[inspectorId] = [];
          }

          if (!trackingMap[inspectorId].some((item) => item.application_id === app.id)) {
            trackingMap[inspectorId].push({
              application_id: app.id,
              company_name: siteName,
              current_step_title: inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title
            });
          }
        }
      }
    });

    const structuredWorkforceMatrix = staffList.map((user) => {
      const lockedWorkflows = trackingMap[user.id] || [];
      return {
        id: user.id,
        full_name: user.name, 
        division: user.division,
        is_available: lockedWorkflows.length === 0,
        locked_workflows: lockedWorkflows
      };
    });

    return NextResponse.json({ inspectors: structuredWorkforceMatrix });

  } catch (error: any) {
    console.error('QMS Registry Engine Fault:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal database processing failure.' },
      { status: 500 }
    );
  }
}