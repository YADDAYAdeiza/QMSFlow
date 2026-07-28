import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export const dynamic = "force-dynamic";

// Workflow steps that indicate an inspector is actively tied up in report generation or review
const BLOCKED_WORKFLOW_STEPS = [
  "STAFF_TECHNICAL_REVIEW",
  "DDD_TECHNICAL_REVIEW",
  "DDD_IRSD_INTAKE",
  "IRSD_STAFF_VETTING",
  "DDD_IRSD_REVIEW"
];

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const targetAppIdStr = searchParams.get("application_id");
    const targetAppId = targetAppIdStr ? parseInt(targetAppIdStr, 10) : null;

    const supabase = await createClient();

    // 1. Fetch active users directory
    const { data: staffList, error: staffError } = await supabase
      .from('users')
      .select('id, name, email, division, role')
      .order('name', { ascending: true });

    if (staffError) throw staffError;

    // 2. Fetch all team assignments joined with their parent schedule and application meta
    const { data: activeAssignments, error: joinError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        inspector_id,
        role,
        schedule_id,
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

    // 3. Track inspector conflicts and active workloads
    const InspectorsOnThisInspection = new Map<string, string>(); // inspector_id -> field role (e.g., TEAM_LEADER)
    const activeWorkflowMap = new Map<string, string[]>(); // inspector_id -> list of active step keys

    activeAssignments?.forEach((assignment: any) => {
      const inspectorId = assignment.inspector_id;
      const schedule = assignment.inspection_schedules;
      const app = schedule?.applications;

      // Conflict 1: Check if inspector participated in THIS specific application's field inspection
      if (targetAppId && schedule?.application_id === targetAppId) {
        InspectorsOnThisInspection.set(inspectorId, assignment.role || 'FIELD_INSPECTOR');
      }

      // Conflict 2: Check if inspector is locked in an active review/report step elsewhere
      if (app && app.details) {
        const detailsObj = typeof app.details === 'string' ? JSON.parse(app.details) : app.details;
        const currentStepKey = detailsObj?.inspectionWorkflowMeta?.currentStepKey;

        if (currentStepKey && BLOCKED_WORKFLOW_STEPS.includes(currentStepKey)) {
          if (!activeWorkflowMap.has(inspectorId)) {
            activeWorkflowMap.set(inspectorId, []);
          }
          activeWorkflowMap.get(inspectorId)?.push(currentStepKey);
        }
      }
    });

    // 4. Construct response matrix with explicit conflict tags
    const enrichedInspectors = (staffList || []).map((user) => {
      const fieldRoleOnThisInspection = InspectorsOnThisInspection.get(user.id);
      const activeWorkloads = activeWorkflowMap.get(user.id) || [];

      let availability_status: "AVAILABLE" | "WORKED_ON_INSPECTION" | "ON_ANOTHER_INSPECTION" = "AVAILABLE";
      let status_label = "Available";

      if (fieldRoleOnThisInspection) {
        availability_status = "WORKED_ON_INSPECTION";
        const formattedRole = fieldRoleOnThisInspection.replace(/_/g, ' ');
        status_label = `Worked on this inspection (${formattedRole})`;
      } else if (activeWorkloads.length > 0) {
        availability_status = "ON_ANOTHER_INSPECTION";
        status_label = `On another inspection (${activeWorkloads.length} active report${activeWorkloads.length > 1 ? 's' : ''})`;
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        division: user.division,
        role: user.role || "Staff Technical Reviewer",
        is_available: availability_status === "AVAILABLE",
        availability_status,
        status_label
      };
    });

    return NextResponse.json({ inspectors: enrichedInspectors });

  } catch (error: any) {
    console.error('Error in Vetting Inspectors Registry:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to fetch vetting inspectors directory.' },
      { status: 500 }
    );
  }
}