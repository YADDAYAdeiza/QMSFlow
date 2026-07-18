import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; 
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const { mode } = await request.json();

    // --- MODE 1: BLANK APPLICATION FOR NEW INSPECTION ---
    if (mode === "blank") {
      const companyId = 904;
      const applicationId = 609 ;

      // 1. Ensure Company Exists using proper .upsert syntax
      const { error: compErr } = await supabase
        .from("companies")
        .upsert(
          {
            id: companyId,
            name: "Falfa Veterinary Biologicals Ltd",
            address: "12 Industrial Estate, Kaduna, Nigeria",
            category: "LOCAL",
          },
          { onConflict: "id" }
        );

      if (compErr) throw compErr;

      // 2. Insert Blank Application
      const { error: appErr } = await supabase
        .from("applications")
        .upsert({
          id: applicationId,
          application_number: `APP-2026-AVB-${applicationId}`,
          type: "PRI",
          company_id: companyId,
          current_point: "Staff Technical Field Review",
          status: "INSPECTION_PENDING",
          details: {
            notificationEmail: "regulatory@alphavet.com",
            assignedDivisions: ["VMD"],
            productLines: [],
            comments: [],
            savedChecklistSnapshot: null,
            compiledReportHtml: ""
          }
        }, { onConflict: "id" });

      if (appErr) throw appErr;

      return NextResponse.json({ success: true, message: `Blank application #${applicationId} initialized.` });
    }

    // --- MODE 2: FILLED APP WITH DEFICIENCIES & CAPA HISTORY ---
    if (mode === "filled_capa") {
      const companyId = 103;
      const applicationId = 505;

      // 1. Ensure Company Exists using proper .upsert syntax
      const { error: compErr } = await supabase
        .from("companies")
        .upsert(
          {
            id: companyId,
            name: "Borange Kalbe Limited",
            address: "Planning Way, Ilupeju, Mushin, Lagos State",
            category: "LOCAL",
          },
          { onConflict: "id" }
        );

      if (compErr) throw compErr;

      // 2. Insert Pre-filled Record
      const { error: appErr } = await supabase
        .from("applications")
        .upsert({
          id: applicationId,
          application_number: "APP-2026-OKL-003",
          type: "PRI",
          company_id: companyId,
          current_point: "Divisional Deputy Director CAPA Verification",
          status: "CAPA_SUBMITTED_PENDING",
          details: {
            notificationEmail: "regulatory@orangekalbe.com",
            assignedDivisions: ["VMD"],
            isComplianceReview: true,
            inspectionWorkflowMeta: {
              lastAction: "FORWARD",
              currentOwnerId: "next-desk-holder-id",
              currentStepKey: "DIRECTOR_FINAL_SIGN_OFF"
            },
            productLines: [
              {
                lineName: "Sterile Injection Liquid Line",
                products: [{"name": "Multivitamin Veterinary Injection"}]
              }
            ],
            comments: [
              {
                text: "Report compiled and forwarded for review.",
                action: "FORWARD",
                fromStep: "Staff Technical Field Review",
                toStep: "Divisional Deputy Director Technical Endorsement",
                actorName: "Officer (VMD)",
                timestamp: "2026-07-03T11:15:00.000Z"
              },
              {
                text: "Returned for amendment: Ensure the differential pressure failure is explicitly captured as a Critical finding.",
                action: "REWORK",
                fromStep: "Divisional Deputy Director Technical Endorsement",
                toStep: "Staff Technical Field Review",
                actorName: "Officer (VMD)",
                timestamp: "2026-07-04T15:20:00.000Z"
              }
            ],
            savedChecklistSnapshot: {
              application_id: String(applicationId),
              report_doc_number: `NAFDAC/VMD/GMP/${applicationId}/2026`,
              inspected_site_name: "Orange Kalbe Limited",
              inspection_dates: "2026-06-30",
              type_of_inspection: "PRI",
              lead_inspector: "Yus",
              co_inspectors: "Da",
              critical_count: 1,
              major_count: 0,
              other_count: 0,
              premises_equipment_score: 60,
              premises_equipment_notes: "Total loss of differential pressure cascading criteria between the aseptic filling suite and adjoining clean changing area.",
              observations: [
                {
                  id: "f8b32d9c-1392-58f4-99f9-6028934efff7",
                  text: "Complete reversal of differential pressure air cascade gradient into Grade A aseptic filling environment.",
                  severity: "Critical"
                }
              ]
            },
            compiledReportHtml: "<h3>NAFDAC GMP Inspection Report</h3><p><strong>Site Name:</strong> Orange Kalbe Limited</p><ul><li><strong>Critical Deficiencies:</strong> Complete reversal of differential pressure air cascade gradient...</li></ul>"
          }
        }, { onConflict: "id" });

      if (appErr) throw appErr;

      return NextResponse.json({ success: true, message: `Filled CAPA application #${applicationId} initialized.` });
    }

    return NextResponse.json({ error: "Invalid configuration type selected." }, { status: 400 });

  } catch (err: any) {
    console.error("Seeding operational error:", err);
    return NextResponse.json({ error: err.message || "Failed to seed records" }, { status: 500 });
  }
}