// @/app/api/applications/save-draft/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export async function POST(request: Request) {
  try {
    console.log('API Route reached: Processing checklist payload');
    const supabase = await createClient();
    const payload = await request.json();
    
    // 1. EXTRACT IDENTIFIER (Using the correct checklistSnapshot key)
    const applicationNumber = payload?.checklistSnapshot?.report_doc_number;
    
    if (!applicationNumber) {
      console.warn('Payload parsing failed: Missing report_doc_number in checklistSnapshot', payload);
      return NextResponse.json(
        { error: 'Missing report_doc_number inside checklistSnapshot' },
        { status: 400 }
      );
    }

    // 2. FETCH CURRENT ROW (To safeguard existing JSONB values)
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('details')
      .eq('application_number', applicationNumber)
      .maybeSingle();

    if (fetchError) {
      console.error('Supabase fetch error during draft save:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Safely parse/handle existing JSONB details to prevent wiping other metadata
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

    // 3. MERGE INCOMING PAYLOAD INTO THE EVOLVING JSONB FIELD
    // This preserves existing top-level details fields like assignedDivisions, productLines, etc.
    const updatePayload: Record<string, any> = {
      details: {
        ...currentDetails,
        ...payload, // Merges checklistSnapshot, savedBy, etc.
        // Ensure both names point to the updated object for fallback protection
        checklistSnapshot: payload.checklistSnapshot,
        savedChecklistSnapshot: payload.checklistSnapshot
      },
      updated_at: new Date().toISOString(),
    };

    // 4. MAP TOP-LEVEL RELATIONAL COLUMNS (If present)
    const currentStep = payload?.inspectionWorkflowMeta?.currentStepKey;
    if (currentStep) {
      updatePayload.current_point = currentStep;
    }

    const finalRecommendation = payload?.checklistSnapshot?.final_recommendation;
    if (finalRecommendation) {
      updatePayload.status = finalRecommendation;
    }

    // 5. COMMIT THE UPDATE TO THE DATABASE
    const { data, error: updateError } = await supabase
      .from('applications')
      .update(updatePayload)
      .eq('application_number', applicationNumber)
      .select()
      .single();

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