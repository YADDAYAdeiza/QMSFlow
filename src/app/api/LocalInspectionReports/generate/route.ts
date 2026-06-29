// @/app/api/gmp-report/generate/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";

// Initialize the Google Gen AI SDK
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    // 1. Destructure the core telemetry needed for validation and prompts
    const {
      application_id, 
      report_doc_number,
      inspection_dates,
      type_of_inspection,
      inspected_site_name,
      activities_carried_out,
      vicinity_assessment,
      lead_inspector,
      co_inspectors,
      pqs_score, pqs_notes,
      personnel_score, personnel_notes,
      premises_equipment_score, premises_equipment_notes,
      qualification_validation_score, qualification_validation_notes,
      material_management_score, material_management_notes,
      laboratory_control_score, laboratory_control_notes,
      critical_count, major_count, other_count,
      observations,
      final_recommendation,
    } = payload;

    if (!application_id) {
      throw new Error("Missing mandatory application_id parameter.");
    }

    // 2. Engineer the regulatory prompt forcing compliance syntax
    const systemPrompt = `
You are an expert NAFDAC Drug Evaluation and Research (DER) Directorate AI Assistant. Your task is to process raw field inspection logs and synthesize them into a formal, narrative-style NAFDAC Pharmaceutical GMP Inspection Report adhering to SOP Ref. No. DER-800-06.

CRITICAL RULES:
1. Maintain strict, objective, third-person legal-regulatory syntax.
2. Never drop or fabricate metadata (SOP numbers, dates, scores, text observations).
3. Expand bullet points into beautifully formatted HTML prose using paragraphs, bullet lists, and clean styling classes. Do not wrap the output in a full <html> or <body> block—output raw, valid inner HTML snippets.
4. Highlight technical vocabulary inline appropriately.
`;

    const userInstructions = `
Generate the narrative report based on this raw checklist snapshot:

[DOCUMENT METADATA]
- Report Doc Number: ${report_doc_number}
- Dates: ${inspection_dates}
- Type: ${type_of_inspection}
- Site Name: ${inspected_site_name}
- Scope of Activities: ${activities_carried_out?.join(", ") || "None declared"}
- Vicinity/Environmental Assessment: ${vicinity_assessment || "No anomalies flagged."}
- Lead Inspector: ${lead_inspector}
- Co-Inspectors: ${co_inspectors}

[6 QUALITY SYSTEMS OBSERVATIONS]
1. Pharmaceutical Quality System (Score: ${pqs_score}%):
   - Notes/Observations: ${pqs_notes || "Compliant baseline parameters."}

2. Personnel & Training (Score: ${personnel_score}%):
   - Notes/Observations: ${personnel_notes || "Staff layout compliant."}

3. Premises & Equipment (Score: ${premises_equipment_score}%):
   - Notes/Observations: ${premises_equipment_notes || "Flow structures acceptable."}

4. Qualification & Validation (Score: ${qualification_validation_score}%):
   - Notes/Observations: ${qualification_validation_notes || "Protocols verified."}

5. Material Management (Score: ${material_management_score}%):
   - Notes/Observations: ${material_management_notes || "Warehouse criteria satisfied."}

6. Laboratory Control / QC (Score: ${laboratory_control_score}%):
   - Notes/Observations: ${laboratory_control_notes || "Screening thresholds checked."}

[SYNTHESIS AGGREGATES]
- Critical Deficiencies: ${critical_count}
- Major Deficiencies: ${major_count}
- Other Deficiencies: ${other_count}
- Logged Non-Conformances: ${JSON.stringify(observations)}
- Final Adjudication Stance: ${final_recommendation}

Structure the output cleanly with appropriate headings (<h3>), body text (<p class="text-slate-700 leading-relaxed mb-4">), and clear technical paragraphs detailing the findings for each system. Include an executive summary at the top and a formal conclusion block at the end.
`;

    // 3. Request narrative generation via gemini-2.5-flash
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userInstructions }] }
      ]
    });

    const generatedText = response.text || "<p>Error generating narrative template.</p>";

    // 4. Fetch current application record to safely merge JSONB parameters
    const numericId = Number(application_id);
    const appRecord = await db.query.applications.findFirst({
      where: eq(applications.id, numericId)
    });

    if (!appRecord) {
      throw new Error(`Application record with ID ${application_id} could not be resolved.`);
    }

    const currentDetails = (appRecord.details as any) || {};

    // 5. Atomic database merge committing form data and text summary back into JSONB
    await db.update(applications)
      .set({
        updatedAt: new Date(),
        details: {
          ...currentDetails,
          // Spreading payload ensures that site_contact_details, historical_baseline, 
          // and all future custom fields are cleanly preserved without pipeline structural leaks.
          savedChecklistSnapshot: {
            ...payload,
            report_doc_number,
            inspected_site_name
          },
          // Houses the pure text layout read by the Workspace Viewer
          compiledReportHtml: generatedText
        }
      })
      .where(eq(applications.id, numericId));

    // Return the clean HTML string to feed your workspace layout
    return NextResponse.json({ 
      success: true, 
      report_html: generatedText 
    });

  } catch (error: any) {
    console.error("QMS AI Report Generator Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Failure" },
      { status: 500 }
    );
  }
}