import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';
import { inspectionReportWorkflow } from '@/config/workflows/inspectionReportWorkflow';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { applicationId, scheduledDate, teamLeader, coInspectors, traineeInspectors } = body;

    if (!applicationId || !scheduledDate || !teamLeader) {
      return NextResponse.json(
        { success: false, error: "Validation Error: Missing execution parameters." },
        { status: 400 }
      );
    }

    // 1. Wipe existing team assignments and schedule rows for this application if undergoing rework
    const { data: existingSchedules } = await supabase
      .from('inspection_schedules')
      .select('id')
      .eq('application_id', applicationId);

    if (existingSchedules && existingSchedules.length > 0) {
      const scheduleIds = existingSchedules.map((s) => s.id);

      await supabase
        .from('inspection_team_assignments')
        .delete()
        .in('schedule_id', scheduleIds);

      await supabase
        .from('inspection_schedules')
        .delete()
        .eq('application_id', applicationId);
    }

    // 2. Insert master metadata entry into inspection_schedules
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('inspection_schedules')
      .insert({
        application_id: applicationId,
        scheduled_date: scheduledDate,
        status: 'SCHEDULED'
      })
      .select('id')
      .single();

    if (scheduleError) throw scheduleError;

    const newScheduleUUID = scheduleData.id;
    const arrayInsertions = [];

    // 3. Map Team Leader
    arrayInsertions.push({
      schedule_id: newScheduleUUID,
      inspector_id: teamLeader,
      role: 'TEAM_LEADER'
    });

    // 4. Map Co-Inspectors
    if (coInspectors && Array.isArray(coInspectors)) {
      coInspectors.forEach((id: string) => {
        arrayInsertions.push({
          schedule_id: newScheduleUUID,
          inspector_id: id,
          role: 'CO_INSPECTOR'
        });
      });
    }

    // 5. Enforce QMS constraint: Max 2 trainee inspectors
    if (traineeInspectors && Array.isArray(traineeInspectors)) {
      if (traineeInspectors.length > 2) {
        return NextResponse.json(
          { success: false, error: "QMS Compliance Fault: Max 2 trainees allowed." }, 
          { status: 400 }
        );
      }
      traineeInspectors.forEach((id: string) => {
        arrayInsertions.push({
          schedule_id: newScheduleUUID,
          inspector_id: id,
          role: 'TRAINEE_INSPECTOR'
        });
      });
    }

    // 6. Batch execute all team assignments
    const { error: bridgeError } = await supabase
      .from('inspection_team_assignments')
      .insert(arrayInsertions);

    if (bridgeError) throw bridgeError;

    // 7. Update main application JSONB tracking
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('details')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;

    let currentDetails = typeof existingApp.details === 'string' 
      ? JSON.parse(existingApp.details) 
      : (existingApp.details || {});
      
    if (!currentDetails.inspectionWorkflowMeta) {
      currentDetails.inspectionWorkflowMeta = {};
    }
    
    const coInspectorList = Array.isArray(coInspectors) ? coInspectors : [];
    const traineeList = Array.isArray(traineeInspectors) ? traineeInspectors : [];

    currentDetails.inspectionWorkflowMeta.lastAction = "FORWARD";
    currentDetails.inspectionWorkflowMeta.currentStepKey = inspectionReportWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT.key;
    currentDetails.inspectionWorkflowMeta.assignedTeam = {
      teamLeaderId: teamLeader,
      coInspectorIds: coInspectorList,
      traineeIds: traineeList,
      allInspectorIds: [teamLeader, ...coInspectorList, ...traineeList]
    };

    // 8. HOLD application at DDD_TECHNICAL_ASSIGNMENT until Director Batch Approval!
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        details: currentDetails,
        current_point: inspectionReportWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT.title, 
        status: inspectionReportWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT.statusLabel
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    return NextResponse.json({ success: true, scheduleId: newScheduleUUID });

  } catch (error: any) {
    console.error('QMS Scheduler Engine Fault:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal database processing failure.' }, 
      { status: 500 }
    );
  }
}