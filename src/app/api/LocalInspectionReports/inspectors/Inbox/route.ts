import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server';

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { searchParams } = new URL(request.url);
    
    // 1. Resolve Target User
    let targetUserId = searchParams.get('simulatedUserId');
    if (!targetUserId) {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) {
        return NextResponse.json({ success: false, error: "Authentication required." }, { status: 401 });
      }
      targetUserId = user.id;
    }

    // 2. STEP 1: Fetch flat assignments with their schedules
    const { data: assignments, error: assignError } = await supabase
      .from('inspection_team_assignments')
      .select(`
        role,
        inspection_schedules!inner (
          id,
          scheduled_date,
          status,
          application_id
        )
      `)
      .eq('inspector_id', targetUserId)
      .eq('inspection_schedules.status', 'SCHEDULED');

    if (assignError) throw assignError;
    if (!assignments || assignments.length === 0) {
      return NextResponse.json({ success: true, inspectorId: targetUserId, tasks: [] });
    }

    // Extract unique application IDs to avoid a messy nested join loop
    const applicationIds = assignments
      .map(a => a.inspection_schedules?.application_id)
      .filter(Boolean);

    // 3. STEP 2: Fetch the Applications and Company Names using a simple flat cross-reference
    const { data: apps, error: appsError } = await supabase
      .from('applications')
      .select(`
        id,
        application_number,
        current_point,
        companies!applications_company_id_companies_id_fk (
          name
        )
      `)
      .in('id', applicationIds);

    if (appsError) throw appsError;

    // Create a fast lookup map for our applications data
    const appMap = new Map();
    (apps || []).forEach(app => {
      appMap.set(app.id, app);
    });

    // 4. STEP 3: Map data cleanly to match your frontend type definitions perfectly
    const formattedTasks = assignments.map((item: any) => {
      const schedule = item.inspection_schedules;
      const linkedApp = appMap.get(schedule?.application_id);
      
      // Safe role normalization for all variations of your team profiles
      let normalizedRole: 'TEAM_LEADER' | 'CO_INSPECTOR' | 'TRAINEE' = 'CO_INSPECTOR';
      if (item.role === 'TEAM_LEADER') {
        normalizedRole = 'TEAM_LEADER';
      } else if (item.role && item.role.includes('TRAINEE')) {
        normalizedRole = 'TRAINEE';
      }

      return {
        scheduleId: schedule?.id,
        scheduledDate: schedule?.scheduled_date,
        scheduleStatus: schedule?.status,
        assignedRole: normalizedRole, 
        application: {
          id: linkedApp?.id || '',
          fileNumber: linkedApp?.application_number || 'Pending Assignment', 
          companyName: linkedApp?.companies?.name || 'Unknown Company',
          currentPoint: linkedApp?.current_point || 'Field Inspection Pending'
        }
      };
    });

    return NextResponse.json({ 
      success: true, 
      inspectorId: targetUserId, 
      tasks: formattedTasks 
    });

  } catch (error: any) {
    console.error('QMS Inspector Inbox Retrieval Fault:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to fetch assigned field inspection tasks.' }, 
      { status: 500 }
    );
  }
}