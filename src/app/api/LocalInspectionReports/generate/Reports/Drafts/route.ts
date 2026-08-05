// @/app/api/applications/save-draft/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export async function POST(request: Request) {
  try {
    console.log('API Route reached: Processing checklist payload');
    const supabase = await createClient();
    const payload = await request.json();
    
    // 1. EXTRACT IDENTIFIER (Check applicationId first, fallback to report_doc_number)
    const applicationId = payload?.applicationId || payload?.checklistSnapshot?.application_id;
    const applicationNumber = payload?.applicationNumber || payload?.checklistSnapshot?.report_doc_number;
    
    if (!applicationId && !applicationNumber) {
      console.warn('Payload parsing failed: Missing identifier in payload', payload);
      return NextResponse.json(
        { error: 'Missing applicationId or application_number inside payload' },
        { status: 400 }
      );
    }

    // 2. FETCH CURRENT ROW (Try by ID first, fallback to application_number)
    let query = supabase.from('applications').select('details, id, application_number');
    
    if (applicationId) {
      query = query.eq('id', Number(applicationId));
    } else {
      query = query.eq('application_number', applicationNumber);
    }

    const { data: existingApp, error: fetchError } = await query.maybeSingle();

    if (fetchError) {
      console.error('Supabase fetch error during draft save:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    if (!existingApp) {
      return NextResponse.json(
        { error: `Application record not found for ID/Number provided.` },
        { status: 404 }
      );
    }

    // Safely parse existing JSONB details
    let currentDetails: Record<string, any> = {};
    if (existingApp?.details) {
      if (typeof existingApp.details === 'string') {
        try {
          currentDetails = JSON.parse(existingApp.details);
        } catch (e) {
          console.error('Failed to parse existing details JSON string:', e);
        }
      } else if (typeof existingApp.details === 'object') {
        currentDetails = existingApp.details;
      }
    }

    // Extract incoming compiled report HTML (from payload or nested snapshot)
    const incomingCompiledReportHtml = 
      payload?.compiledReportHtml || 
      payload?.checklistSnapshot?.compiledReportHtml || 
      payload?.savedChecklistSnapshot?.compiledReportHtml;

    // Preserve existing HTML if incoming value is empty/undefined
    const finalCompiledReportHtml = 
      (incomingCompiledReportHtml && incomingCompiledReportHtml.trim() !== '') 
        ? incomingCompiledReportHtml 
        : (currentDetails?.compiledReportHtml || '');

    // 3. MERGE INCOMING PAYLOAD INTO JSONB FIELD
    const updatePayload: Record<string, any> = {
      details: {
        ...currentDetails,
        ...payload,
        compiledReportHtml: finalCompiledReportHtml,
        checklistSnapshot: payload.checklistSnapshot,
        savedChecklistSnapshot: payload.checklistSnapshot
      },
      updated_at: new Date().toISOString(),
    };

    // 4. MAP TOP-LEVEL RELATIONAL COLUMNS
    const currentStep = payload?.inspectionWorkflowMeta?.currentStepKey;
    if (currentStep) {
      updatePayload.current_point = currentStep;
    }

    const finalRecommendation = payload?.checklistSnapshot?.final_recommendation;
    if (finalRecommendation) {
      updatePayload.status = finalRecommendation;
    }

    // 5. COMMIT UPDATE BY PRIMARY KEY (id)
    const { data, error: updateError } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('id', existingApp.id)
      .select()
      .maybeSingle();

    if (updateError) {
      console.error('Supabase application update error:', updateError);
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err: any) {
    console.error('Fatal API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}