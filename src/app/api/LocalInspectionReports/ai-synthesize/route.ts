// @/app/api/LocalInspectionReports/ai-synthesize/route.ts
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const prompt = `
You are an expert NAFDAC Divisional Deputy Director (VMD) and AI Regulatory Assistant specializing in pharmaceutical and veterinary GMP compliance under PIC/S PE 009-17 standards. 

Take the following raw inspection notes and observations, professionalize them into formal regulatory audit findings, and map each one to its precise PIC/S reference.

CRITICAL INSTRUCTION FOR OBSERVATIONS:
You must return an array called "observations". Each object in the array must contain:
1. "id": string
2. "severity": "critical" | "major" | "other"
3. "system_category": string
4. "text": The professionalized audit finding narrative.
5. "pics_reference": The exact PIC/S chapter, section, and rule matching the finding (e.g., "PIC/S Part I, Chapter 3, Section 3.2 - Air handling systems and containment", "PIC/S Part I, Chapter 1, Section 1.4 - Product Quality Review (PQR)", "PIC/S Part I, Chapter 5, Section 5.18 - Prevention of cross-contamination and batch yield reconciliation").

Return ONLY a valid JSON object matching this exact structure, with no markdown code blocks:
{
  "pqs_notes": "...",
  "personnel_notes": "...",
  "premises_equipment_notes": "...",
  "qualification_validation_notes": "...",
  "material_management_notes": "...",
  "laboratory_control_notes": "...",
  "vicinity_assessment": "...",
  "observations": [
    {
      "id": "1",
      "severity": "major",
      "system_category": "Premises",
      "text": "...",
      "pics_reference": "..."
    }
  ]
}

Input Data:
${JSON.stringify(payload, null, 2)}
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [{ role: "user", parts: [{ text: prompt }] }],
    });

    let rawText = response.text || "{}";
    rawText = rawText.replace(/```json/g, "").replace(/```/g, "").trim();
    
    const enhancedFields = JSON.parse(rawText);

    return NextResponse.json({
      success: true,
      enhancedFields,
    });
  } catch (error: any) {
    console.error("AI Synthesis Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to synthesize report data." },
      { status: 500 }
    );
  }
}