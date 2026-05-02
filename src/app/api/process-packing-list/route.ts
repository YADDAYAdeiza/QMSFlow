import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function POST(req: Request) {
  try {
    const { companyName, filePath, mode } = await req.json(); 
    console.log(`Processing ${mode} for Company:`, companyName);

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { db: { schema: 'public' } }
    );

    // 1. Download file
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('Permit')
      .download(filePath);

    if (downloadError || !fileData) throw new Error("Failed to retrieve file from Permit bucket");

    // 2. AI Extraction
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });

    const arrayBuffer = await fileData.arrayBuffer();
    const base64Data = Buffer.from(arrayBuffer).toString('base64');

    const prompt = `
      You are a NAFDAC regulatory assistant. Extract data from this packing list.
      Return a JSON array of objects with exactly these keys: 
      "rawName" (the drug name), "qty" (numeric amount), "batch" (batch number).
      Only return the JSON array, no other text.
    `;

    const result = await model.generateContent([
      prompt,
      { inlineData: { data: base64Data, mimeType: fileData.type } }
    ]);

    // FIXED REGEX: ensures no hidden line breaks break the string cleaning
    const aiText = result.response.text().replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(aiText);

    // 3. Dual-Mode Validation Logic
    const validationResult = [];

    for (const item of extractedData) {
      // Logic: Search by the first word of the raw drug name
      const searchName = item.rawName.trim().split(' ')[0];

      // A. Master List Check (atc_codes)
      const { data: atcEntries } = await supabase
        .from('atc_codes')
        .select('id, substance')
        .ilike('substance', `%${searchName}%`)
        .limit(1);

      const atc = atcEntries?.[0] || null;

      // B. Permit Assignment Check
      let permitMatch = null;
      if (atc) {
        const { data } = await supabase
          .from('permit_substances')
          .select(`
            quantity_kg,
            permits!inner (permit_number, company_name, validity)
          `)
          .eq('substance_id', atc.id)
          .ilike('permits.company_name', `%${companyName.trim()}%`) 
          .eq('permits.validity', 'Active')
          .limit(1);

        permitMatch = (data && data.length > 0) ? (data[0] as any) : null;
      }

      // 4. Branching Logic for INTAKE vs OUTAKE
      let status = "REVIEW_REQUIRED";
      
      if (mode === 'INTAKE') {
        // For INTAKE: Only requires the substance to exist in the national master list
        status = atc ? "READY" : "REVIEW_REQUIRED";
      } else {
        // For OUTAKE: Must exist in master list AND be already authorized on this permit
        status = (atc && permitMatch) ? "READY" : "REVIEW_REQUIRED";
      }

      validationResult.push({
        ...item,
        substanceId: atc?.id || null, // Critical for the 'not-null' database constraint
        confirmed: atc?.substance || "Unknown",
        permit: permitMatch?.permits?.permit_number || "NO PRIOR AUTHORIZATION",
        status: status
      });
    }

    return NextResponse.json({ validation: validationResult });

  } catch (error: any) {
    console.error("API Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}