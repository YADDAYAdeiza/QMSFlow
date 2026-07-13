import { NextResponse } from 'next/server';
import { createClient } from '@/utils/supabase/server'; 

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const payload = await request.json();
    
    // 1. Extract the unique application identifier from the payload
    const applicationNumber = payload?.savedChecklistSnapshot?.report_doc_number;

    if (!applicationNumber) {
      return NextResponse.json(
        { error: 'Missing report_doc_number inside savedChecklistSnapshot' },
        { status: 400 }
      );
    }

    // 2. Fetch the current row to safeguard existing JSONB fields from being wiped out
    const { data: existingApp, error: fetchError } = await supabase
      .from('applications')
      .select('details')
      .eq('application_number', applicationNumber)
      .maybeSingle(); // Prevents throwing an error if it's a completely new reference

    if (fetchError) {
      console.error('Supabase fetch error during draft save:', fetchError);
      return NextResponse.json({ error: fetchError.message }, { status: 500 });
    }

    // Ensure we have a valid object base to spread into
    const currentDetails = existingApp?.details && typeof existingApp.details === 'object'
      ? (existingApp.details as Record<string, any>)
      : {};

    // 3. Build the update payload by merging the incoming payload into existing details
    const updatePayload: Record<string, any> = {
      details: {
        ...currentDetails,
        ...payload // Merges comments, productLines, compiledReportHtml, etc., cleanly
      },
      updated_at: new Date().toISOString(),
    };

    // 4. Extract and map top-level relational schema columns if present
    const currentStep = payload?.inspectionWorkflowMeta?.currentStepKey;
    if (currentStep) {
      updatePayload.current_point = currentStep;
    }

    const finalRecommendation = payload?.savedChecklistSnapshot?.final_recommendation;
    if (finalRecommendation) {
      updatePayload.status = finalRecommendation;
    }

    // 5. Commit the merge back to your applications table
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
    console.error('API Route Error:', err);
    return NextResponse.json(
      { error: err.message || 'Internal Server Error' },
      { status: 500 }
    );
  }
}