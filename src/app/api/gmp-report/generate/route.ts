import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { report_doc_number, type_of_inspection, company_name, checklist_raw } = body;

    const prompt = `
      You are an expert Senior GMP Inspector for NAFDAC's Drug Evaluation and Research (DER) Directorate.
      Draft a formal, comprehensive, narrative-style Pharmaceutical GMP Inspection Report based on raw field observations.

      The output must strictly mirror the structural requirements of SOP Ref. No. DER-800-06.

      ADMINISTRATIVE RUNTIME BOUNDARIES:
      - Report Document Number: ${report_doc_number}
      - Type of Inspection Code: ${type_of_inspection}
      - Inspected Manufacturing Entity: ${company_name}

      RAW BULLETED OBSERVATIONS:
      1. Pharmaceutical Quality System (PQS):
         - Positives Sighted: ${checklist_raw.pqs_positives?.join("; ") || "None recorded"}
         - Non-Conformances: ${checklist_raw.pqs_deficiencies?.join("; ") || "None recorded"}

      2. Premises and Equipment:
         - Positives Sighted: ${checklist_raw.premises_positives?.join("; ") || "None recorded"}
         - Non-Conformances: ${checklist_raw.premises_deficiencies?.join("; ") || "None recorded"}

      OUTPUT PROTOCOL:
      - Convert raw snippets into authoritative, fully realized professional narrative paragraphs.
      - Maintain a rigorous, objective, legal-regulatory tone.
      - Ensure explicit inclusion of standard terminology regarding risk mitigation and contamination safeguards where applicable.
      - Return ONLY standard semantic HTML formatting inside a <div> layout block (use <h2>, <h3>, <p>, <ul>, <li>). 
      - Do not include markdown wraps or backticks (\`\`\`html).
    `;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    return NextResponse.json({ 
      success: true, 
      report_html: response.text 
    });
  } catch (error: any) {
    console.error("GMP Core Generation Exception:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}