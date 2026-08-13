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

    // ------------------------------------------------------------------
    // STEP A: Auto-resolve or create batch shell for this target date
    // ------------------------------------------------------------------
    const targetDate = new Date(scheduledDate);
    const startOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1)
      .toISOString()
      .split('T')[0];
    const endOfMonth = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0)
      .toISOString()
      .split('T')[0];

    // Find existing batch shell for this date range
    let { data: existingBatch } = await supabase
      .from('schedule_batches')
      .select('id')
      .gte('start_date', startOfMonth)
      .lte('end_date', endOfMonth)
      .limit(1)
      .maybeSingle();

    let assignedBatchId = existingBatch?.id || null;

    // Create batch shell if missing
    if (!assignedBatchId) {
      const { data: newBatch, error: batchError } = await supabase
        .from('schedule_batches')
        .insert({
          batch_reference: `SCHEDULE-${startOfMonth}-${endOfMonth}`,
          title: `VMAP Inspection Schedule (${startOfMonth} to ${endOfMonth})`,
          start_date: startOfMonth,
          end_date: endOfMonth,
          status: 'PENDING_RECOMMENDATION',
          current_point: 'Divisional Deputy Director IRSD Routing',
          history: []
        })
        .select('id')
        .single();

      if (!batchError && newBatch) {
        assignedBatchId = newBatch.id;
      } else {
        // Fallback check in case of concurrent creation race condition
        const { data: reFetched } = await supabase
          .from('schedule_batches')
          .select('id')
          .eq('start_date', startOfMonth)
          .eq('end_date', endOfMonth)
          .maybeSingle();
        assignedBatchId = reFetched?.id || null;
      }
    }

    // ------------------------------------------------------------------
    // STEP B: Wipe existing team assignments and schedule rows for rework
    // ------------------------------------------------------------------
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

    // ------------------------------------------------------------------
    // STEP C: Insert master schedule entry WITH batch_id bound
    // ------------------------------------------------------------------
    const { data: scheduleData, error: scheduleError } = await supabase
      .from('inspection_schedules')
      .insert({
        application_id: applicationId,
        scheduled_date: scheduledDate,
        status: 'SCHEDULED',
        batch_id: assignedBatchId // 👈 Guarantees batch_id is populated at creation
      })
      .select('id')
      .single();

    if (scheduleError) throw scheduleError;

    const newScheduleUUID = scheduleData.id;
    const arrayInsertions = [];

    // Map Team Leader
    arrayInsertions.push({
      schedule_id: newScheduleUUID,
      inspector_id: teamLeader,
      role: 'TEAM_LEADER'
    });

    // Map Co-Inspectors
    if (coInspectors && Array.isArray(coInspectors)) {
      coInspectors.forEach((id: string) => {
        arrayInsertions.push({
          schedule_id: newScheduleUUID,
          inspector_id: id,
          role: 'CO_INSPECTOR'
        });
      });
    }

    // Enforce QMS constraint: Max 2 trainee inspectors
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

    // Batch execute all team assignments
    const { error: bridgeError } = await supabase
      .from('inspection_team_assignments')
      .insert(arrayInsertions);

    if (bridgeError) throw bridgeError;

    // Update main application JSONB tracking
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

    // HOLD application at DDD_TECHNICAL_ASSIGNMENT until Director Batch Approval!
    const { error: updateError } = await supabase
      .from('applications')
      .update({ 
        details: currentDetails,
        current_point: inspectionReportWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT.title, 
        status: inspectionReportWorkflow.steps.DDD_TECHNICAL_ASSIGNMENT.statusLabel
      })
      .eq('id', applicationId);

    if (updateError) throw updateError;

    return NextResponse.json({ 
      success: true, 
      scheduleId: newScheduleUUID,
      batchId: assignedBatchId 
    });

  } catch (error: any) {
    console.error('QMS Scheduler Engine Fault:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal database processing failure.' }, 
      { status: 500 }
    );
  }
}