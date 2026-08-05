// @/app/api/Inspectors/PoolRegistry/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = "force-dynamic";

const BLOCKED_WORKFLOW_STEPS = [
  "STAFF_TECHNICAL_REVIEW",
  "DDD_TECHNICAL_REVIEW",
  "DDD_IRSD_INTAKE",
  "IRSD_STAFF_VETTING",
  "DDD_IRSD_REVIEW"
];
export async function GET() {
  try {
    const supabase = await createClient();

    // 1. Fetch field-ready personnel from your users table
    const { data: staffList, error: staffError } = await supabase
      .from('users')
      .select('id, name, division, role')
      .eq('role', 'Staff')
      .order('name', { ascending: true });

    if (staffError) throw staffError;
    if (!staffList || staffList.length === 0) {
      return NextResponse.json({ inspectors: [] });
    }

    // 2. Cross-join using your exact production column: schedule_id
    const { data: activeAssignments, error: joinError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        inspector_id,
        inspection_schedules:schedule_id (
          id,
          application_id,
          applications:application_id (
            id,
            details
          )
        )
      `);

    if (joinError) throw joinError;

    // 3. Process matrix based on your live JSONB properties
    const trackingMap: Record<string, Array<{ application_id: number; company_name: string; current_step_title: string }>> = {};

    activeAssignments?.forEach((assignment: any) => {
      const inspectorId = assignment.inspector_id;
      const app = assignment.inspection_schedules?.applications;
      
      if (app && app.details) {
        const detailsObj = typeof app.details === 'string' ? JSON.parse(app.details) : app.details;
        const currentStepKey = detailsObj?.inspectionWorkflowMeta?.currentStepKey;

        if (currentStepKey && BLOCKED_WORKFLOW_STEPS.includes(currentStepKey)) {
          if (!trackingMap[inspectorId]) {
            trackingMap[inspectorId] = [];
          }

          const siteName = detailsObj?.savedChecklistSnapshot?.inspected_site_name || "Unknown Facility";

          if (!trackingMap[inspectorId].some(item => item.application_id === app.id)) {
            trackingMap[inspectorId].push({
              application_id: app.id,
              company_name: siteName,
              current_step_title: currentStepKey.replace(/_/g, ' ')
            });
          }
        }
      }
    });

    // 4. Build output matrix using your user fields
    const structuredWorkforceMatrix = staffList.map(user => {
      const lockedWorkflows = trackingMap[user.id] || [];
        return {
          id: user.id,
          full_name: user.name, 
          division: user.division, // <-- Ensure this property is passed down!
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