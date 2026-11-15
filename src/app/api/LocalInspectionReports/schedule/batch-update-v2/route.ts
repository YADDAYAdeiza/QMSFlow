// @/app/api/LocalInspectionReports/schedule/batch-update-v2/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";
import { processInspectionBatch, BatchUpdateItem } from "@/lib/LocalInspectionReports/services/inspectionBatchService";
import { dispatchBatchNotifications } from "@/lib/LocalInspectionReports/services/qmsSyncService";

export async function PUT(request: Request) {
  try {
    // 1. Authenticate user session via Supabase
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    // 2. Parse request payload
    const body = await request.json();

    // 📥 LOG WHAT HITS THE SERVER ROUTE DIRECTLY
    console.log("📥 INCOMING SERVER ROUTE PAYLOAD (/api/LocalInspectionReports/schedule/batch-update-v2):", JSON.stringify(body, null, 2));

    const { 
      batchId, 
      updates = [], 
      activeScheduleIds = [], 
      startDate, 
      endDate,
      isForeign = false 
    } = body as {
      batchId?: string;
      updates: BatchUpdateItem[];
      activeScheduleIds?: string[];
      startDate: string;
      endDate: string;
      isForeign?: boolean;
    };

    // 3. Execute core database operations via Batch Service
    const { targetBatchId, emailDispatchQueue } = await processInspectionBatch({
      batchId,
      updates,
      activeScheduleIds,
      startDate,
      endDate,
      isForeign,
      userId: user.id,
    });

    // 4. Dispatch oversight/scheduling emails asynchronously
    await dispatchBatchNotifications(emailDispatchQueue);

    // 5. Return success response
    return NextResponse.json({ 
      success: true, 
      batchId: targetBatchId,
      message: "Batch schedule updated, team assignments synced, and QMS timelines recorded successfully." 
    });

  } catch (error: any) {
    console.error("Error in batch-update-v2 route:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}