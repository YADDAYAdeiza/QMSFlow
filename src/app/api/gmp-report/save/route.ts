import { NextResponse } from "next/server";
import { db } from "@/db";
import { localInspectionReports } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";

export async function POST(req: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const { 
      applicationId, 
      companyId, 
      reportDocNumber, 
      typeOfInspection, 
      checklistRaw, 
      reportHtml,
      dispatchForReview 
    } = body;

    // Determine status depending on whether user clicks "Save Draft" or "Dispatch"
    const status = dispatchForReview ? "UNDER_REVIEW" : "DRAFT";

    await db.insert(localInspectionReports)
      .values({
        applicationId,
        companyId,
        inspectorId: user.id,
        reportDocNumber,
        typeOfInspection,
        currentStatus: status,
        checklistRaw,
        reportHtml,
        versionHistory: [{
          version: 1,
          updated_by: user.id,
          timestamp: new Date().toISOString(),
          action: status
        }]
      })
      .onConflictDoUpdate({
        target: localInspectionReports.reportDocNumber,
        set: {
          checklistRaw,
          reportHtml,
          currentStatus: status,
          updatedAt: new Date()
        }
      });

    return NextResponse.json({ success: true, status });
  } catch (error: any) {
    console.error("Database Write Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}