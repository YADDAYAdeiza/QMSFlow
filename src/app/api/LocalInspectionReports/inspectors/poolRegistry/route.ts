import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { inspectionReportWorkflow } from '@/config/workflows/inspectionReportWorkflow';

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch all personnel from the registry
    const { data: staffList, error: staffError } = await supabase
      .from('users')
      .select('id, name, division, role')
      .order('name', { ascending: true });

    if (staffError) throw staffError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ inspectors: [] });
    }

    // 2. Fetch assignments joined with application stage metadata for auditing purposes
    const { data: activeAssignments, error: joinError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        inspector_id,
        inspection_schedules!inner (
          id,
          application_id,
          applications!inner (
            id,
            current_point,
            details
          )
        )
      `)
      .eq('inspection_schedules.applications.current_point', inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title);

    if (joinError) throw joinError;

    const trackingMap: Record<string, Array<{ application_id: number; company_name: string; current_step_title: string }>> = {};

    activeAssignments?.forEach((assignment: any) => {
      const inspectorId = assignment.inspector_id;
      const app = assignment.inspection_schedules?.applications;
      
      if (app) {
        if (app.current_point === inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title) {
          const detailsObj = typeof app.details === 'string' ? JSON.parse(app.details) : (app.details || {});
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
      const activeWorkflows = trackingMap[user.id] || [];
      return {
        id: user.id,
        full_name: user.name, 
        division: user.division,
        role: user.role,
        is_available: true, // 👈 ALLOWED: All staff are now available for scheduling regardless of technical review stage
        locked_workflows: activeWorkflows // Preserved for sidebar audit visibility
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