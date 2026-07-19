import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const body = await request.json();
    const { applicationId, scheduledDate, teamLeader, coInspectors, traineeInspectors } = body;

    // 1. Validation check for essential parameters
    if (!applicationId || !scheduledDate || !teamLeader) {
      return NextResponse.json(
        { success: false, error: "Validation Error: Missing execution parameters." },
        { status: 400 }
      );
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

    if (scheduleError) {
      // Handle Unique Constraint Violations (e.g., file already has a scheduled itinerary)
      if (scheduleError.code === '23505') {
        return NextResponse.json(
          { success: false, error: "QMS Warning: An active field inspection has already been configured for this file." },
          { status: 409 }
        );
      }
      throw scheduleError;
    }

    const newScheduleUUID = scheduleData.id;
    const arrayInsertions = [];

    // 3. Map Team Leader tracking role entry
    arrayInsertions.push({
      schedule_id: newScheduleUUID,
      inspector_id: teamLeader,
      role: 'TEAM_LEADER'
    });

    // 4. Map Co-Inspectors tracking role entries (Fixed: changed hyphen to underscore to match CHECK constraint)
    if (coInspectors && Array.isArray(coInspectors)) {
      coInspectors.forEach((id: string) => {
        arrayInsertions.push({
          schedule_id: newScheduleUUID,
          inspector_id: id,
          role: 'CO_INSPECTOR'
        });
      });
    }

    // 5. Enforce QMS constraint: Max 2 trainee inspectors permitted per team allocation
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

    // 6. Batch execute all role definitions into the bridge junction table
    const { error: bridgeError } = await supabase
      .from('inspection_team_assignments')
      .insert(arrayInsertions);

    if (bridgeError) throw bridgeError;

    // 7. Extract the application's current details column JSON payload
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('details')
      .eq('id', applicationId)
      .single();

    if (fetchError) throw fetchError;

    // Clean data parsing handling for different environment driver configurations
    let currentDetails = typeof existingApp.details === 'string' 
      ? JSON.parse(existingApp.details) 
      : (existingApp.details || {});
      
    if (!currentDetails.inspectionWorkflowMeta) {
      currentDetails.inspectionWorkflowMeta = {};
    }
    
    // Update inner tracking context parameters
    currentDetails.inspectionWorkflowMeta.lastAction = "FORWARD";
    // Synchronized with master workflow engine config schemas to fix registry pool selection leaks
    currentDetails.inspectionWorkflowMeta.currentStepKey = "STAFF_TECHNICAL_REVIEW";

    // 8. Commit changes back to the main file registry with correct step keys
// 8. Commit changes back to the main file registry with correct step keys
  const { error: updateError } = await supabase
    .from('applications')
    .update({ 
      details: currentDetails,
      current_point: "Staff Technical Field Review", 
      status: "INSPECTION_SCHEDULED" // Changed from INSPECTION_PENDING to move it across tabs!
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