// @/app/api/LocalInspectionReports/generate/route.ts
import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai"; 
import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(request: Request) {
  try {
    const payload = await request.json();

    const {
      application_id, 
      report_doc_number,
      inspection_dates,
      type_of_inspection,
      inspected_site_name,
      company_name,
      facility_address,
      inspected_site_address,
      product_lines,
      productLines: rawProductLines,
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

    // Resolve robust fallbacks for site metadata
    const effectiveCompanyName = inspected_site_name || company_name || payload?.inspected_site_details?.name || "Registered Establishment";
    const effectiveAddress = facility_address || inspected_site_address || payload?.facilityAddress || payload?.inspected_site_details?.address || "Registered Facility Address";
    const effectiveProductLines = product_lines || rawProductLines || payload?.lines || [];

    // Format Product Lines into readable text for AI context
    const formattedProductLines = Array.isArray(effectiveProductLines) && effectiveProductLines.length > 0
      ? effectiveProductLines.map((line: any, idx: number) => {
          const name = line.lineName || line.name || `Line #${idx + 1}`;
          const type = line.lineType ? ` (${line.lineType})` : "";
          const prods = Array.isArray(line.products) && line.products.length > 0
            ? ` -> Products: ${line.products.map((p: any) => p.name || p).join(", ")}`
            : "";
          return `${name}${type}${prods}`;
        }).join(" | ")
      : "General Finished Product Manufacturing Line";

    const systemPrompt = `
You are an expert NAFDAC Drug Evaluation and Research (DER) Directorate AI Assistant. Your task is to process raw field inspection logs and synthesize them into a formal, narrative-style NAFDAC Pharmaceutical / Veterinary GMP Inspection Report adhering to SOP Ref. No. DER-800-06.

CRITICAL RULES:
1. Maintain strict, objective, third-person legal-regulatory syntax.
2. Never drop or fabricate metadata (SOP numbers, dates, scores, text observations, facility address, or product lines).
3. Expand bullet points into beautifully formatted HTML prose using paragraphs, bullet lists, and clean styling classes. Do not wrap the output in a full <html> or <body> block—output raw, valid inner HTML snippets.
4. Highlight technical vocabulary inline appropriately.
`;

    const userInstructions = `
Generate the narrative report based on this raw checklist snapshot:

[DOCUMENT & SITE METADATA]
- Report Doc Number: ${report_doc_number}
- Inspection Dates: ${inspection_dates || "As recorded in audit schedule"}
- Inspection Type: ${type_of_inspection || "Routine GMP Inspection"}
- Establishment / Site Name: ${effectiveCompanyName}
- Facility Physical Address: ${effectiveAddress}
- Evaluated Scope & Product Lines: ${formattedProductLines}
- Scope of Activities: ${Array.isArray(activities_carried_out) ? activities_carried_out.join(", ") : activities_carried_out || "Manufacturing operations as declared"}
- Vicinity/Environmental Assessment: ${vicinity_assessment || "No environmental anomalies flagged."}
- Lead Inspector: ${lead_inspector || "Unassigned"}
- Co-Inspectors: ${co_inspectors || "Unassigned"}

[6 QUALITY SYSTEMS OBSERVATIONS]
1. Pharmaceutical Quality System (Score: ${pqs_score ?? "N/A"}%):
   - Notes/Observations: ${pqs_notes || "Compliant baseline parameters."}

2. Personnel & Training (Score: ${personnel_score ?? "N/A"}%):
   - Notes/Observations: ${personnel_notes || "Staff layout compliant."}

3. Premises & Equipment (Score: ${premises_equipment_score ?? "N/A"}%):
   - Notes/Observations: ${premises_equipment_notes || "Flow structures acceptable."}

4. Qualification & Validation (Score: ${qualification_validation_score ?? "N/A"}%):
   - Notes/Observations: ${qualification_validation_notes || "Protocols verified."}

5. Material Management (Score: ${material_management_score ?? "N/A"}%):
   - Notes/Observations: ${material_management_notes || "Warehouse criteria satisfied."}

6. Laboratory Control / QC (Score: ${laboratory_control_score ?? "N/A"}%):
   - Notes/Observations: ${laboratory_control_notes || "Screening thresholds checked."}

[SYNTHESIS AGGREGATES]
- Critical Deficiencies: ${critical_count ?? 0}
- Major Deficiencies: ${major_count ?? 0}
- Other Deficiencies: ${other_count ?? 0}
- Logged Non-Conformances: ${JSON.stringify(observations || [])}
- Final Adjudication Stance: ${final_recommendation || "PENDING"}

Structure the output cleanly with appropriate headings (<h3>), body text (<p class="text-slate-700 leading-relaxed mb-4">), and clear technical paragraphs detailing the findings for each system. Include an executive summary at the top explicitly citing the facility address and evaluated product lines, followed by a detailed review per quality system, and a formal conclusion block at the end.
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userInstructions }] }
      ]
    });

    const generatedText = response.text || "<p>Error generating narrative template.</p>";

    const numericId = Number(application_id);
    const appRecord = await db.query.applications.findFirst({
      where: eq(applications.id, numericId)
    });

    if (!appRecord) {
      throw new Error(`Application record with ID ${application_id} could not be resolved.`);
    }

    const currentDetails = (appRecord.details as any) || {};

    // Standardize and persist updated snapshot with resolved address and product lines
    await db.update(applications)
      .set({
        updatedAt: new Date(),
        details: {
          ...currentDetails,
          savedChecklistSnapshot: {
            ...payload,
            report_doc_number,
            inspected_site_name: effectiveCompanyName,
            facility_address: effectiveAddress,
            product_lines: effectiveProductLines
          }
        }
      })
      .where(eq(applications.id, numericId));

    // Return generated draft directly to client state for review
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