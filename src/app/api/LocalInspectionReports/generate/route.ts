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

    const docNo = report_doc_number || "NAFDAC/VMD/GMP/873821/2026";
    const auditDate = inspection_dates || "2026-08-10";

    const systemPrompt = `
You are an expert NAFDAC Veterinary Medicine and Allied Products (VMAP) / Drug Evaluation and Research (DER) Directorate AI Assistant.
Your task is to process raw field inspection logs and synthesize them into a single, fully structured HTML master table document conforming strictly to SOP Ref. No. VMAP-800-03 / DER-800-06.

CRITICAL MASTER STRUCTURAL RULE:
EVERY SINGLE SECTION OF THIS DOCUMENT MUST BE CONTAINED INSIDE A SINGLE MASTER HTML TABLE:
\`<table style="width:100%; border-collapse:collapse; border:1px solid #1e293b; font-family: Arial, sans-serif;">\`

DOCUMENT LAYOUT STRUCTURE:

1. COVER PAGE ROW (SINGLE CELL SPREAD TO FULL A4 HEIGHT - PAGE BREAK AFTER):
Generate the first row cell (\`<td style="border:1px solid #1e293b; padding:40px 24px; min-height:1050px; height:1050px; vertical-align:space-between; page-break-after:always; display:flex; flex-direction:column; justify-content:space-between; align-items:center;">\`) formatted as follows:

   A. UPPER THIRD (TOP CENTERED BLOCK):
      - NAFDAC Logo scaled to 1/10th size (4.8px height): \`<img src="/nafdac_logo2-removebg-preview.png" alt="NAFDAC Logo" style="height:4.8px; width:auto; margin:0 auto 8px auto; display:block;" />\`
      - Exactly this centered bold header hierarchy:
        <h2 style="font-size:13px; font-weight:bold; margin:4px 0; text-transform:uppercase; text-align:center;">NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL (NAFDAC)</h2>
        <h3 style="font-size:12px; font-weight:bold; margin:2px 0; text-transform:uppercase; text-align:center; color:#334155;">VETERINARY MEDICINE AND ALLIED PRODUCTS (VMAP) / DRUG EVALUATION AND RESEARCH (DER) DIRECTORATE</h3>
        <h1 style="font-size:15px; font-weight:bold; margin:16px 0 0 0; text-transform:uppercase; text-align:center; text-decoration:underline;">GOOD MANUFACTURING PRACTICE (GMP) INSPECTION REPORT</h1>
        <h2 style="font-size:14px; font-weight:bold; margin:8px 0; text-transform:uppercase; text-align:center; color:#0f766e;">${effectiveCompanyName}</h2>

   B. MIDDLE THIRD (CENTERED BLOCK):
      <div style="text-align:center; margin:120px 0;">
        <p style="font-size:13px; font-weight:bold; margin:4px 0;">ANNEXURE IV: GMP INSPECTION REPORT</p>
        <p style="font-size:12px; font-weight:bold; color:#475569; margin:2px 0;">SOP Ref. No. VMAP-800-03 / DER-800-06</p>
      </div>

   C. BOTTOM THIRD (FOOTER METADATA BLOCK):
      <div style="width:100%; text-align:center; font-size:11px; line-height:1.6; border-top:1px solid #cbd5e1; padding-top:16px; margin-top:auto;">
        <p style="margin:2px 0;"><strong>Doc No:</strong> ${docNo}</p>
        <p style="margin:2px 0;"><strong>Inspection Date:</strong> ${auditDate}</p>
        <p style="margin:2px 0;"><strong>Distribution List:</strong> NAFDAC DG, Director VMAP/DER, Director NDD, Director Enforcement, Inspectorate, Head of Establishment.</p>
      </div>

2. GENERAL INFORMATION BLOCK (LEFT-ALIGNED ROW):
   - Internal table row summarizing Establishment details, Physical Address, Inspection Type, Product Lines evaluated, and Inspectors.

3. DETAILED EVALUATED QUALITY SYSTEMS NARRATIVE (EXPANDED PROSE):
   - DO NOT JUST LIST SCORES OR BULLETS. Expand each quality system into full, formal, multi-paragraph objective technical narratives:
     * 1. Pharmaceutical Quality System (PQS)
     * 2. Personnel & Training
     * 3. Premises & Equipment
     * 4. Qualification & Validation
     * 5. Material Management & Production
     * 6. Laboratory Control / Quality Control
   - Fully articulate observed practices, regulatory compliance aspects, procedural gaps, equipment conditions, and quality oversight details based on the field notes.

4. DEFICIENCIES MATRIX ROW (LEFT-ALIGNED ROW):
   - Nested table detailing non-conformances split into Critical, Major, and Other categories with S/N, Observation, and Reference Standard.

5. RECOMMENDATION & CONCLUSION ROW (INSIDE THE TABLE):
   - Table row (\`<tr><td style="border:1px solid #1e293b; padding:16px; text-align:left;">...\`) detailing the exact adjudication stance, CAPA timeline requirement (14 working days), root cause mandate, and renewal terms.

6. SIGN-OFF BLOCK ROW:
   - A final table row featuring a 3-column signature table for Lead Inspector and Co-Inspectors.

Output raw inner HTML snippets without <html>, <head>, or <body> tags.
`;

    const userInstructions = `
Generate the detailed expanded tabular HTML report using this raw snapshot:

[DOCUMENT & SITE METADATA]
- Report Doc Number: ${docNo}
- Inspection Dates: ${auditDate}
- Inspection Type: ${type_of_inspection || "Routine GMP Inspection"}
- Establishment / Site Name: ${effectiveCompanyName}
- Facility Physical Address: ${effectiveAddress}
- Evaluated Scope & Product Lines: ${formattedProductLines}
- Scope of Activities: ${Array.isArray(activities_carried_out) ? activities_carried_out.join(", ") : activities_carried_out || "Manufacturing operations as declared"}
- Vicinity/Environmental Assessment: ${vicinity_assessment || "No environmental anomalies flagged."}
- Lead Inspector: ${lead_inspector || "Unassigned"}
- Co-Inspectors: ${co_inspectors || "Unassigned"}

[6 QUALITY SYSTEMS OBSERVATIONS TO EXPAND IN DETAIL]
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
- Final Adjudication Stance: ${final_recommendation || "CAPA PENDING"}
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

    await db.update(applications)
      .set({
        updatedAt: new Date(),
        details: {
          ...currentDetails,
          savedChecklistSnapshot: {
            ...payload,
            report_doc_number: docNo,
            inspected_site_name: effectiveCompanyName,
            facility_address: effectiveAddress,
            product_lines: effectiveProductLines
          }
        }
      })
      .where(eq(applications.id, numericId));

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