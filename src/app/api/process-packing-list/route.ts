import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from "@google/generative-ai";

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  try {
    // 0. Extract permitId from request payload
    const { companyName, filePath, mode, permitId } = await req.json(); 
    console.log(`Processing ${mode} for Company: ${companyName}, Permit ID: ${permitId}`);

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

    let result;
    let maxRetries = 3;
    let delay = 1500;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        result = await model.generateContent([
          prompt,
          { inlineData: { data: base64Data, mimeType: fileData.type } }
        ]);
        break; 
      } catch (aiError: any) {
        if (attempt === maxRetries) throw aiError;
        await sleep(delay);
        delay *= 2; 
      }
    }

    if (!result) throw new Error("Vision AI response context targets missing.");

    const aiText = result.response.text().replace(/```json|```/g, "").trim();
    const extractedData = JSON.parse(aiText);

    // 3. Dual-Mode Validation Logic
    const validationResult = [];

    for (const item of extractedData) {
      const searchName = item.rawName.trim().split(' ')[0];

      // A. Master List Check (atc_codes) - Proven working for INTAKE
      const { data: atcEntries } = await supabase
        .from('atc_codes')
        .select('id, substance')
        .ilike('substance', `%${searchName}%`)
        .limit(1);

      const atc = atcEntries?.[0] || null;

      // B. Robust Permit Assignment Check for OUTAKE
      // B. Robust Permit Assignment Check (Direct lookup, no volatile joins)
      let permitMatch = null;
      if (atc) {
        let query = supabase.from('permits').select('permit_number, validity');

        if (permitId) {
          // 1. Direct Primary Key targeting (Bulletproof)
          query = query.eq('id', permitId);
        } else {
          // 2. Direct lookup fallback by company_id if you have it, 
          // or skip company checks entirely if tracking globally.
          console.warn("No permitId provided, running substance-only validation context.");
        }

        const { data, error } = await query
          .eq('atc_id', atc.id)
          .ilike('validity', 'Active') // Case-insensitive protection for 'Active' vs 'active'
          .limit(1);

        if (error) {
          console.error("Database Direct Query Error:", error.message);
        } else {
          permitMatch = (data && data.length > 0) ? data[0] : null;
        }
        console.log('permitId: ', permitId);
        console.log('Data: ', data)
        console.log('ATC: ', atc.id)
      }
      // 4. Branching Logic for INTAKE vs OUTAKE
      let status = "REVIEW_REQUIRED";
      
      if (mode === 'INTAKE') {
        status = atc ? "READY" : "REVIEW_REQUIRED";
      } else {
        // OUTAKE relies on matching the active permit profile explicitly
        console.log('This is permitMatch: ', permitMatch);
        status = (atc && permitMatch) ? "READY" : "REVIEW_REQUIRED";
      }

      validationResult.push({
        ...item,
        substanceId: atc?.id || null, 
        confirmed: atc?.substance || "Unknown",
        permit: permitMatch?.permit_number || "NO PRIOR AUTHORIZATION",
        status: status
      });
    }

    return NextResponse.json({ validation: validationResult });

  } catch (error: any) {
    console.error("API Route Error:", error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}