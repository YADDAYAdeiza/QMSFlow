// @/app/api/Inspectors/PoolRegistry/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = "force-dynamic";

// Define the tracking thresholds based on inspectionReportWorkflow
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

    // 1. Fetch all personnel registered under the core INSPECTOR profile designation
    const { data: profiles, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('designation', 'INSPECTOR')
      .order('full_name', { ascending: true });

    if (profileError) throw profileError;
    if (!profiles || profiles.length === 0) {
      return NextResponse.json({ inspectors: [] });
    }

    // 2. Fetch all active team assignments and trace their application tracking states
    // Pulls the Inspector ID -> Inspection Schedule -> Target Application Context
    const { data: activeAssignments, error: joinError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        inspector_id,
        inspection_schedules (
          id,
          application_id,
          applications (
            id,
            company_name,
            current_workflow_step,
            current_step_title
          )
        )
      `);

    if (joinError) throw joinError;

    // 3. Process the matrix to group blockages by individual Inspector ID
    const trackingMap: Record<string, Array<{ application_id: number; company_name: string; current_step_title: string }>> = {};

    activeAssignments?.forEach((assignment: any) => {
      const inspectorId = assignment.inspector_id;
      const app = assignment.inspection_schedules?.applications;

      // If the application exists and falls within our strict lock threshold
      if (app && BLOCKED_WORKFLOW_STEPS.includes(app.current_workflow_step)) {
        if (!trackingMap[inspectorId]) {
          trackingMap[inspectorId] = [];
        }
        
        // Ensure we don't duplicate identical blocking files for the same inspector
        if (!trackingMap[inspectorId].some(item => item.application_id === app.id)) {
          trackingMap[inspectorId].push({
            application_id: app.id,
            company_name: app.company_name,
            current_step_title: app.current_step_title || "Pending Review"
          });
        }
      }
    });

    // 4. Map back across the master profile list to derive conditional readiness
    const structuredWorkforceMatrix = profiles.map(profile => {
      const lockedWorkflows = trackingMap[profile.id] || [];
      return {
        id: profile.id,
        full_name: profile.full_name,
        is_available: lockedWorkflows.length === 0, // Instantly true if array is clear
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