// @/app/api/LocalInspectionReports/schedule-inspection/batch/[batchId]/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, inspectionTeamAssignments, applications } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

interface RouteParams {
  params: Promise<{ batchId: string }>;
}

export async function PATCH(request: Request, { params }: RouteParams) {
  try {
    const resolvedParams = await params;
    const batchId = resolvedParams?.batchId;
    const body = await request.json();
    const { title, startDate, endDate, inspectors, facilities } = body;

    if (!batchId) {
      return NextResponse.json({ success: false, error: "Batch ID is required." }, { status: 400 });
    }

    await db.transaction(async (tx) => {
      // 1. Update batch main details
      await tx
        .update(scheduleBatches)
        .set({
          title: title || `Inspection Batch`,
          startDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(eq(scheduleBatches.id, batchId));

      // 2. Clear existing schedules and team assignments for this batch to rebuild cleanly
      const existingSchedules = await tx
        .select({ id: inspectionSchedules.id })
        .from(inspectionSchedules)
        .where(eq(inspectionSchedules.batchId, batchId));

      const scheduleIds = existingSchedules.map(s => s.id);

      if (scheduleIds.length > 0) {
        await tx.delete(inspectionTeamAssignments).where(inArray(inspectionTeamAssignments.scheduleId, scheduleIds));
        await tx.delete(inspectionSchedules).where(eq(inspectionSchedules.batchId, batchId));
      }

      // 3. Resolve new facilities to application IDs
      let targetAppIds: number[] = [];
      if (Array.isArray(facilities) && facilities.length > 0) {
        const matchingApps = await tx
          .select({ id: applications.id })
          .from(applications)
          .where(inArray(applications.facilityId, facilities));

        targetAppIds = matchingApps.map(app => app.id);
      }

      // 4. Insert fresh schedules and team assignments
      for (const appId of targetAppIds) {
        const [newSchedule] = await tx.insert(inspectionSchedules).values({
          batchId,
          applicationId: appId,
          scheduledDate: startDate,
          status: "SCHEDULED",
        }).returning({ id: inspectionSchedules.id });

        if (Array.isArray(inspectors)) {
          for (const ins of inspectors) {
            await tx.insert(inspectionTeamAssignments).values({
              scheduleId: newSchedule.id,
              inspectorId: ins.inspectorId,
              role: ins.role,
            });
          }
        }
      }
    });

    return NextResponse.json({ success: true, message: "Inspection batch successfully updated!" });
  } catch (error: any) {
    console.error("Batch Patch Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}