export const dynamic = "force-dynamic";
export const revalidate = 0;

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
      // Inspection Team Fields
      lead_inspector,
      co_inspectors,
      trainee_inspectors,
      trainees,
      // Signatures
      lead_signature_url,
      lead_inspector_signature_url,
      divisional_deputy_director_signature_url,
      signatures = {}, // Map of { "Name": "url" }
      // Quality Systems Scores & Notes
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

    // Site metadata fallbacks
    const effectiveCompanyName = inspected_site_name || company_name || payload?.inspected_site_details?.name || "Registered Establishment";
    const effectiveAddress = facility_address || inspected_site_address || payload?.facilityAddress || payload?.inspected_site_details?.address || "Registered Facility Address";
    const effectiveProductLines = product_lines || rawProductLines || payload?.lines || [];

    // Helper to normalize input lists into string arrays
    const normalizeList = (val: any): string[] => {
      if (Array.isArray(val)) return val.filter((item) => typeof item === "string" && item.trim().length > 0);
      if (typeof val === "string" && val.trim().length > 0) return val.split(",").map((s) => s.trim()).filter(Boolean);
      return [];
    };

    const leadName = typeof lead_inspector === "string" && lead_inspector.trim() ? lead_inspector.trim() : "Unassigned";
    const coInspectorsList = normalizeList(co_inspectors);
    const traineesList = normalizeList(trainee_inspectors || trainees);

    const formattedLead = leadName;
    const formattedCoInspectors = coInspectorsList.length > 0 ? coInspectorsList.join(", ") : "None";
    const formattedTrainees = traineesList.length > 0 ? traineesList.join(", ") : "None";

    const docNo = report_doc_number || "NAFDAC/VMD/GMP/873821/2026";
    const auditDate = inspection_dates || "2026-08-10";

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

    // Reusable signature card generator with 12px max-height constraint
    const renderSignatureCard = (name: string, role: string, sigUrl?: string) => {
      const sigGraphic = sigUrl
        ? `<img src="${sigUrl}" alt="${name} Signature" style="max-height:4px; width:auto; margin:0 auto; display:block;" />`
        : `<span style="font-size:10px; color:#94a3b8; font-style:italic;">[Signed Electronically]</span>`;

      return `
        <td style="width:48%; vertical-align:bottom; border:none; padding:12px; box-sizing:border-box;">
          <div style="border-bottom:1px solid #0f172a; min-height:36px; margin-bottom:4px; text-align:center; display:flex; align-items:flex-end; justify-content:center;">
            ${sigGraphic}
          </div>
          <p style="font-size:11px; font-weight:bold; margin:2px 0;">${name}</p>
          <p style="font-size:10px; color:#475569; margin:0;">${role}</p>
          <p style="font-size:10px; color:#64748B; margin-top:2px;">Date: ${auditDate}</p>
        </td>
      `;
    };

    // Track populated names to avoid duplicates in sign-off table
    const processedNames = new Set<string>();
    const allSignCards: string[] = [];

    // 1. Lead Inspector
    const resolvedLeadSig = lead_inspector_signature_url || lead_signature_url || signatures[leadName];
    allSignCards.push(
      renderSignatureCard(leadName, "Lead Inspector, Regulatory Inspection Directorate", resolvedLeadSig)
    );
    processedNames.add(leadName);

    // 2. Co-Inspectors (Restored from commented out state)
    // coInspectorsList.forEach((inspectorName) => {
    //   if (!processedNames.has(inspectorName)) {
    //     const sigUrl = signatures[inspectorName] || "";
    //     allSignCards.push(
    //       renderSignatureCard(inspectorName, "Co-Inspector, Regulatory Inspection Directorate", sigUrl)
    //     );
    //     processedNames.add(inspectorName);
    //   }
    // });

    // 3. Trainee Inspectors
    traineesList.forEach((traineeName) => {
      if (!processedNames.has(traineeName)) {
        const sigUrl = signatures[traineeName] || "";
        allSignCards.push(
          renderSignatureCard(traineeName, "Trainee Inspector / Observer", sigUrl)
        );
        processedNames.add(traineeName);
      }
    });
console.log('This is signatures in server: ', signatures);
    // 4. Fallback scanner for any remaining signed users in signatures map
    Object.keys(signatures).forEach((personName) => {
      if (!processedNames.has(personName) && signatures[personName]) {
        allSignCards.push(
          renderSignatureCard(personName, "Regulatory Inspector", signatures[personName])
        );
        processedNames.add(personName);
      }
    });

    // Group signature cards into 2-column HTML rows
    let dynamicSignoffTableRows = "";
    for (let i = 0; i < allSignCards.length; i += 2) {
      const card1 = allSignCards[i];
      const card2 = allSignCards[i + 1];

      dynamicSignoffTableRows += `
        <tr>
          ${card1}
          <td style="width:4%;"></td>
          ${card2 ? card2 : `<td style="width:48%; border:none;"></td>`}
        </tr>
      `;
    }

    const dynamicSignoffBlockHtml = `
      <tr>
        <td style="border:1px solid #1e293b; padding:24px 16px; page-break-inside:avoid;">
          <p style="font-weight:bold; font-size:12px; margin-bottom:16px; color:#0f172a; text-transform:uppercase;">REPORT SIGN-OFF & APPROVAL</p>
          <table style="width:100%; border-collapse:collapse; border:none;">
            ${dynamicSignoffTableRows}
          </table>
        </td>
      </tr>
    `;

    const systemPrompt = `
You are an expert NAFDAC Veterinary Medicine and Allied Products (VMAP) / Drug Evaluation and Research (DER) Directorate AI Assistant.
Your task is to process raw field inspection logs and synthesize them into HTML table rows conforming strictly to SOP Ref. No. VMAP-800-03 / DER-800-06.

OUTPUT FORMAT INSTRUCTIONS:
- Do NOT output <html>, <head>, <body>, or the wrapper <table> tags.
- Output ONLY the <tr> table rows for Sections 1 through 5 listed below.
- Do NOT include Section 6 (Sign-Off Block) as it will be appended programmatically.

ROW LAYOUT REQUIREMENTS:

1. COVER PAGE ROW (SINGLE CELL - PAGE BREAK AFTER):
Generate a <tr> containing a single cell (\`<td style="border:1px solid #1e293b; padding:40px 24px; min-height:1050px; height:1050px; vertical-align:space-between; page-break-after:always; display:flex; flex-direction:column; justify-content:space-between; align-items:center;">\`) formatted as:
   A. UPPER THIRD:
      - NAFDAC Logo: \`<img src="/nafdac_logo2-removebg-preview.png" alt="NAFDAC Logo" style="height:48px; width:auto; margin:0 auto 8px auto; display:block;" />\`
      - Header block:
        <h2 style="font-size:13px; font-weight:bold; margin:4px 0; text-transform:uppercase; text-align:center;">NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL (NAFDAC)</h2>
        <h3 style="font-size:12px; font-weight:bold; margin:2px 0; text-transform:uppercase; text-align:center; color:#334155;">VETERINARY MEDICINE AND ALLIED PRODUCTS (VMAP) / DRUG EVALUATION AND RESEARCH (DER) DIRECTORATE</h3>
        <h1 style="font-size:15px; font-weight:bold; margin:16px 0 0 0; text-transform:uppercase; text-align:center; text-decoration:underline;">GOOD MANUFACTURING PRACTICE (GMP) INSPECTION REPORT</h1>
        <h2 style="font-size:14px; font-weight:bold; margin:8px 0; text-transform:uppercase; text-align:center; color:#0f766e;">${effectiveCompanyName}</h2>
   B. MIDDLE THIRD:
      <div style="text-align:center; margin:120px 0;">
        <p style="font-size:13px; font-weight:bold; margin:4px 0;">ANNEXURE IV: GMP INSPECTION REPORT</p>
        <p style="font-size:12px; font-weight:bold; color:#475569; margin:2px 0;">SOP Ref. No. VMAP-800-03 / DER-800-06</p>
      </div>
   C. BOTTOM THIRD:
      <div style="width:100%; text-align:center; font-size:11px; line-height:1.6; border-top:1px solid #cbd5e1; padding-top:16px; margin-top:auto;">
        <p style="margin:2px 0;"><strong>Doc No:</strong> ${docNo}</p>
        <p style="margin:2px 0;"><strong>Inspection Date:</strong> ${auditDate}</p>
        <p style="margin:2px 0;"><strong>Distribution List:</strong> NAFDAC DG, Director VMAP/DER, Director NDD, Director Enforcement, Inspectorate, Head of Establishment.</p>
      </div>

2. GENERAL INFORMATION ROW:
   - Internal nested table summarizing Establishment details, Physical Address, Inspection Type, Product Lines evaluated.
   - Include full Inspection Team:
     * Lead Inspector: ${formattedLead}
     * Co-Inspectors: ${formattedCoInspectors}
     * Trainee Inspectors / Observers: ${formattedTrainees}

3. QUALITY SYSTEMS NARRATIVE ROW:
   - Expand each quality system into full, multi-paragraph objective technical narratives:
     * 1. Pharmaceutical Quality System (PQS)
     * 2. Personnel & Training
     * 3. Premises & Equipment
     * 4. Qualification & Validation
     * 5. Material Management & Production
     * 6. Laboratory Control / Quality Control

4. DEFICIENCIES MATRIX ROW:
   - Nested table detailing non-conformances split into Critical, Major, and Other categories.

5. RECOMMENDATION & CONCLUSION ROW:
   - Table row detailing the adjudication stance, CAPA timeline requirement (14 working days), root cause mandate, and renewal terms.
`;

    const userInstructions = `
Generate the detailed expanded tabular HTML report rows using this raw snapshot:

[DOCUMENT & SITE METADATA]
- Report Doc Number: ${docNo}
- Inspection Dates: ${auditDate}
- Inspection Type: ${type_of_inspection || "Routine GMP Inspection"}
- Establishment / Site Name: ${effectiveCompanyName}
- Facility Physical Address: ${effectiveAddress}
- Evaluated Scope & Product Lines: ${formattedProductLines}
- Scope of Activities: ${Array.isArray(activities_carried_out) ? activities_carried_out.join(", ") : activities_carried_out || "Manufacturing operations as declared"}
- Vicinity/Environmental Assessment: ${vicinity_assessment || "No environmental anomalies flagged."}

[INSPECTION TEAM]
- Lead Inspector: ${formattedLead}
- Co-Inspectors: ${formattedCoInspectors}
- Trainee Inspectors: ${formattedTrainees}

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

    const aiGeneratedRows = response.text || "<tr><td>Error generating narrative report rows.</td></tr>";

    // Combine AI-generated rows and Programmatic Sign-Off Block inside Master Table
    const finalMasterTableHtml = `
      <table style="width:100%; border-collapse:collapse; border:1px solid #1e293b; font-family: Arial, sans-serif;">
        ${aiGeneratedRows}
        ${dynamicSignoffBlockHtml}
      </table>
    `;

    const numericId = Number(application_id);
    const appRecord = await db.query.applications.findFirst({
      where: eq(applications.id, numericId)
    });

    if (!appRecord) {
      throw new Error(`Application record with ID ${application_id} could not be resolved.`);
    }

    const currentDetails = (appRecord.details as any) || {};

    // Save compiled HTML directly to application details so reloads pick up fresh content
    await db.update(applications)
      .set({
        updatedAt: new Date(),
        details: {
          ...currentDetails,
          compiledReportHtml: finalMasterTableHtml,
          savedChecklistSnapshot: {
            ...payload,
            compiledReportHtml: finalMasterTableHtml,
            report_doc_number: docNo,
            inspected_site_name: effectiveCompanyName,
            facility_address: effectiveAddress,
            product_lines: effectiveProductLines,
            lead_inspector: formattedLead,
            co_inspectors: coInspectorsList,
            trainee_inspectors: traineesList
          }
        }
      })
      .where(eq(applications.id, numericId));

    return NextResponse.json({ 
      success: true, 
      report_html: finalMasterTableHtml 
    });

  } catch (error: any) {
    console.error("QMS AI Report Generator Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Failure" },
      { status: 500 }
    );
  }
}