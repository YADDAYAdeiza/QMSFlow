import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { 
      companyName, 
      companyAddress, 
      inspectionType, 
      notificationEmail, 
      productLines 
    } = body;

    if (!companyName || !companyAddress || !notificationEmail) {
      return NextResponse.json({ error: "Missing required core facility attributes." }, { status: 400 });
    }

    // 1. Generate unique arbitrary IDs or pull existing sequence indicators
    const generatedCompanyId = Math.floor(100000 + Math.random() * 900000);
    const generatedApplicationId = Math.floor(100000 + Math.random() * 900000);

    // 2. Map structural code definitions based on requested inspection types
    // Pre-Production -> PPD, Pre-Registration -> PRI, Renewal -> REN, GMP-Reassessment -> GMP
    let typeCode = "PRI";
    if (inspectionType === "Pre-Production") typeCode = "PPD";
    if (inspectionType === "Renewal") typeCode = "REN";
    if (inspectionType === "GMP-Reassessment") typeCode = "GMP";

    // 3. Upsert / Insert Company Data
    const { error: compErr } = await supabase
      .from("companies")
      .upsert(
        {
          id: generatedCompanyId,
          name: companyName,
          address: companyAddress,
          category: "LOCAL",
        },
        { onConflict: "id" }
      );

    if (compErr) throw compErr;

    // 4. Transform line fields into structural JSONB format for details tracking
    const formattedProductLines = productLines.map((line: any) => ({
      lineName: `${line.lineType} Manufacturing Line`,
      lineType: line.lineType,
      products: line.products.map((p: any) => ({
        name: p.name,
        classification: p.classification
      }))
    }));

    // 5. Build and insert application payload starting at initial technical desk
    const applicationNumber = `APP-2026-VMD-${typeCode}-${generatedApplicationId}`;
    
    const { error: appErr } = await supabase
      .from("applications")
      .insert({
        id: generatedApplicationId,
        application_number: applicationNumber,
        type: typeCode,
        company_id: generatedCompanyId,
        current_point: "Staff Technical Field Review",
        status: "INSPECTION_PENDING",
        details: {
          notificationEmail: notificationEmail,
          assignedDivisions: ["VMD"], // Mapping to the correct VMD tracking domain
          inspectionTypeMeta: inspectionType,
          productLines: formattedProductLines,
          comments: [
            {
              text: `Application filed for ${inspectionType} inspection pipeline via system creation panel.`,
              action: "INITIALIZE",
              fromStep: "System Registration",
              toStep: "Staff Technical Field Review",
              actorName: "System Portal",
              timestamp: new Date().toISOString()
            }
          ],
          savedChecklistSnapshot: null,
          compiledReportHtml: ""
        }
      });

    if (appErr) throw appErr;

    return NextResponse.json({
      success: true,
      message: `Inspection application successfully compiled. Assigned Tracking Number: ${applicationNumber}`
    });

  } catch (err: any) {
    console.error("Application configuration workflow error:", err);
    return NextResponse.json({ error: err.message || "Failed to process application record." }, { status: 500 });
  }
}