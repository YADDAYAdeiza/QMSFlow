// @/app/api/applications/save-draft/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export async function POST(request: Request) {
  try {
    console.log('API Route reached: Processing checklist payload');
    const supabase = await createClient();
    const payload = await request.json();
    
    // 1. EXTRACT IDENTIFIER (Fixed key mismatch from checklistSnapshot -> savedChecklistSnapshot)
    const applicationNumber = payload?.savedChecklistSnapshot?.report_doc_number;
    
    if (!applicationNumber) {
      console.warn('Payload parsing failed: Missing report_doc_number in savedChecklistSnapshot', payload);
      return NextResponse.json(
        { error: 'Missing report_doc_number inside savedChecklistSnapshot' },
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

    // Safely default existing JSONB details to an object
    const currentDetails = existingApp?.details && typeof existingApp.details === 'object'
      ? (existingApp.details as Record<string, any>)
      : {};

    // 3. MERGE INCOMING PAYLOAD INTO THE EVOLVING JSONB FIELD
    const updatePayload: Record<string, any> = {
      details: {
        ...currentDetails,
        ...payload // Merges checklist snapshot, custom notes, dynamic criteria safely
      },
      updated_at: new Date().toISOString(),
    };

    // 4. MAP TOP-LEVEL RELATIONAL COLUMNS (If present)
    const currentStep = payload?.inspectionWorkflowMeta?.currentStepKey;
    if (currentStep) {
      // Direct assignment of structural workflow points
      updatePayload.current_point = currentStep;
    }

    const finalRecommendation = payload?.savedChecklistSnapshot?.final_recommendation;
    if (finalRecommendation) {
      updatePayload.status = finalRecommendation;
    }

    // 5. COMMIT THE UPDATE
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