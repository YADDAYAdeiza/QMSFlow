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

    // 1. FETCH DATABASE RECORD IMMEDIATELY (Before AI generation to avoid pooler timeout)
    const numericId = Number(application_id);
    const appRecord = await db.query.applications.findFirst({
      where: eq(applications.id, numericId)
    });

    if (!appRecord) {
      throw new Error(`Application record with ID ${application_id} could not be resolved.`);
    }

    const currentDetails = (appRecord.details as any) || {};

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

    const docNo = report_doc_number || `TWL-LAG-RI-01-${new Date().getFullYear()}`;
    const auditDate = inspection_dates || "3rd March, 2026";

    // Format Product Lines into readable text for AI context
    const formattedProductLines = Array.isArray(effectiveProductLines) && effectiveProductLines.length > 0
      ? effectiveProductLines.map((line: any, idx: number) => {
          if (typeof line === "string") return line;
          const name = line.lineName || line.name || `Line #${idx + 1}`;
          const type = line.lineType ? ` (${line.lineType})` : "";
          const prods = Array.isArray(line.products) && line.products.length > 0
            ? ` -> Products: ${line.products.map((p: any) => p.name || p).join(", ")}`
            : "";
          return `${name}${type}${prods}`;
        }).join(" | ")
      : "General Finished Product Manufacturing Line";

    // Reusable signature card generator adhering to Turner Wright layout structure
    const renderSignatureCard = (name: string, role: string, sigUrl?: string) => {
      const sigGraphic = sigUrl
        ? `<img src="${sigUrl}" alt="${name} Signature" class="signature-img" data-signed="false" style="max-height:45px; width:auto; margin:0 auto; display:block; visibility:hidden;" />`
        : `<span style="font-size:10px; color:#94a3b8; font-style:italic;">[Signature Pending]</span>`;
  
      return `
        <td data-card-name="${name.trim().toLowerCase()}" style="width:48%; vertical-align:bottom; border:none; padding:12px; box-sizing:border-box;">
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

    const findSignatureForPerson = (name: string, sigs: Record<string, string>) => {
      if (!name) return "";
      const cleanName = name.trim().toLowerCase();
      for (const [key, val] of Object.entries(sigs)) {
        if (key.trim().toLowerCase() === cleanName) {
          return val;
        }
      }
      return "";
    };

    // 1. Lead Inspector
    const resolvedLeadSig = lead_inspector_signature_url || lead_signature_url || findSignatureForPerson(leadName, signatures);
    if (leadName && leadName !== "Unassigned") {
      allSignCards.push(renderSignatureCard(leadName, "Lead Inspector, VMAP/IRSD", resolvedLeadSig));
      processedNames.add(leadName);
    }

    // 2. Co-Inspectors
    coInspectorsList.forEach((inspectorName) => {
      if (!processedNames.has(inspectorName)) {
        const sigUrl = findSignatureForPerson(inspectorName, signatures);
        allSignCards.push(renderSignatureCard(inspectorName, "Co-Inspector, VMAP", sigUrl));
        processedNames.add(inspectorName);
      }
    });

    // 3. Trainee Inspectors
    traineesList.forEach((traineeName) => {
      if (!processedNames.has(traineeName)) {
        const sigUrl = findSignatureForPerson(traineeName, signatures);
        allSignCards.push(renderSignatureCard(traineeName, "Trainee Inspector / Observer", sigUrl));
        processedNames.add(traineeName);
      }
    });

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
        <td style="border:1px solid #1e293b; padding:24px 16px; page-break-inside:avoid; background-color:#ffffff;">
          <p style="font-weight:bold; font-size:12px; margin-bottom:16px; color:#0f172a; text-transform:uppercase;">SIGNATURES AND DATE</p>
          <table style="width:100%; border-collapse:collapse; border:none;">
            ${dynamicSignoffTableRows}
          </table>
        </td>
      </tr>
    `;

    const systemPrompt = `
You are an expert NAFDAC Veterinary Medicine and Allied Products (VMAP) / Drug Evaluation and Research (DER) Directorate AI Assistant.
Your task is to synthesize raw inspection checklist inputs into clean HTML table rows that conform precisely to the official NAFDAC GMP Inspection Report format (Annexure-2, SOP Ref. No. DER-800-03 / VMAP-800-03), mirroring the layout structure of the Turner Wright official audit report.

OUTPUT FORMAT INSTRUCTIONS:
- Do NOT output <html>, <head>, <body>, or top-level wrapper <table> tags.
- Output ONLY valid <tr> table rows representing the report sections specified below.
- Do NOT include the Sign-Off block row as it will be appended programmatically.
- Use clean inline CSS styling (font-family: Arial, sans-serif; font-size: 11px; line-height: 1.4; color: #111;) to match standard NAFDAC official document aesthetics.

REQUIRED SECTIONS AS TR ROWS:

1. COVER PAGE / HEADER BLOCK ROW:
   - Top banner: <div style="font-size: 10px; color: #666; border-bottom: 1px solid #ccc; padding-bottom: 4px; margin-bottom: 12px;">Annexure - 2 | SOP Ref. No. DER-800-03 &nbsp;|&nbsp; Title: VMAP Pharmaceutical GMP Inspection Report Format</div>
   - NAFDAC Header block:
     * Logo image: <img src="/nafdac_logo2-removebg-preview.png" alt="NAFDAC Logo" style="height: 50px; width: auto; margin: 0 auto 8px auto; display: block;" />
     * <h2 style="font-size: 12px; font-weight: bold; text-align: center; margin: 2px 0; text-transform: uppercase;">NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL (NAFDAC)</h2>
     * <h3 style="font-size: 11px; font-weight: bold; text-align: center; margin: 2px 0; text-transform: uppercase; color: #334155;">DRUG EVALUATION AND RESEARCH (DER) / VMAP DIRECTORATE</h3>
     * <h1 style="font-size: 14px; font-weight: bold; text-align: center; margin: 12px 0 4px 0; text-transform: uppercase; text-decoration: underline;">GOOD MANUFACTURING PRACTICE (GMP) INSPECTION REPORT</h1>
     * <h2 style="font-size: 13px; font-weight: bold; text-align: center; margin: 4px 0 16px 0; color: #0f766e;">${effectiveCompanyName}</h2>
   - Metadata Block Table (Audited Establishment, Audit Date, Report Doc No, Distribution List).

2. GENERAL INFORMATION & INSPECTION SCOPE ROW:
   - Inspected site details (Factory Site, Corporate Head Office, Contact phone, E-mail, Website).
   - Activities carried out by company (Checklist items evaluated).
   - Inspection details table (Date of Inspection, Type of Inspection, Inspection Team members: Lead, Co-Inspectors, Trainees, References).

3. INTRODUCTION & NARRATIVE EVALUATION ROW:
   - Detailed professional introduction of the establishment, marketing authorizations, and scope of inspection using the 6 Quality System Inspection Technique (QSIT).

4. INSPECTED AREAS & QUALITY SYSTEMS OBSERVATIONS ROW (SECTIONS 1 TO 8):
   - Detailed breakdown of inspected areas (Warehouses, Production lines, QC Laboratory, Utilities).
   - Structured observations and findings for all 6 core quality systems:
     1. Pharmaceutical Quality System (PQS) [Score: ${pqs_score}%]
     2. Personnel & Training [Score: ${personnel_score}%]
     3. Premises & Equipment [Score: ${premises_equipment_score}%]
     4. Qualification & Validation [Score: ${qualification_validation_score}%]
     5. Material Management [Score: ${material_management_score}%]
     6. Laboratory Control / QC [Score: ${laboratory_control_score}%]

5. DEFICIENCIES MATRIX ROW:
   - A structured HTML table listing non-conformances classified into Critical, Major, and Other categories, referencing relevant NAFDAC/cGMP regulations.

6. RECOMMENDATIONS, SUMMARY & CONCLUSION ROW:
   - Final adjudication recommendation, CAPA timelines (14 working days), and summary statement on manufacturing capacity.
`;

    const userInstructions = `
Generate the complete official tabular HTML report rows using this live inspection snapshot:

[ESTABLISHMENT & METADATA]
- Report Doc Number: ${docNo}
- Audit Date: ${auditDate}
- Type of Inspection: ${type_of_inspection || "Routine Inspection"}
- Establishment Name: ${effectiveCompanyName}
- Facility Address: ${effectiveAddress}
- Evaluated Product Lines: ${formattedProductLines}
- Activities Carried Out: ${Array.isArray(activities_carried_out) ? activities_carried_out.join(", ") : activities_carried_out || "Finished Product Manufacturing"}
- Vicinity Assessment: ${vicinity_assessment || "No environmental anomalies noted."}

[INSPECTION TEAM]
- Lead Inspector: ${formattedLead}
- Co-Inspectors: ${formattedCoInspectors}
- Trainee Inspectors: ${formattedTrainees}

[QUALITY SYSTEMS SCORES & NOTES]
1. Pharmaceutical Quality System (Score: ${pqs_score ?? 100}%): ${pqs_notes || "Compliant baseline parameters observed."}
2. Personnel & Training (Score: ${personnel_score ?? 100}%): ${personnel_notes || "Staff qualifications verified."}
3. Premises & Equipment (Score: ${premises_equipment_score ?? 100}%): ${premises_equipment_notes || "Facility layouts and HVAC systems checked."}
4. Qualification & Validation (Score: ${qualification_validation_score ?? 100}%): ${qualification_validation_notes || "Protocols and validation status reviewed."}
5. Material Management (Score: ${material_management_score ?? 100}%): ${material_management_notes || "Warehouse and storage controls satisfactory."}
6. Laboratory Control (Score: ${laboratory_control_score ?? 100}%): ${laboratory_control_notes || "QC instrumentation and testing records verified."}

[DEFICIENCIES & ADJUDICATION]
- Critical Deficiencies Count: ${critical_count ?? 0}
- Major Deficiencies Count: ${major_count ?? 0}
- Other Deficiencies Count: ${other_count ?? 0}
- Logged Observations: ${JSON.stringify(observations || [])}
- Final Recommendation Stance: ${final_recommendation || "APPROVED"}
`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: [
        { role: "user", parts: [{ text: systemPrompt + "\n\n" + userInstructions }] }
      ]
    });

    const aiGeneratedRows = response.text || "<tr><td>Error generating narrative report rows.</td></tr>";

    const finalMasterTableHtml = `
      <table style="width:100%; border-collapse:collapse; border:1px solid #1e293b; font-family: Arial, sans-serif; background-color: #ffffff;">
        ${aiGeneratedRows}
        ${dynamicSignoffBlockHtml}
      </table>
    `;

    // 2. SAVE BACK TO DATABASE (Fresh transaction/write call after AI generation)
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