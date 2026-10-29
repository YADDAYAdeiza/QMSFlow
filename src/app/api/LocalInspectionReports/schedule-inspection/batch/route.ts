// @/app/api/LocalInspectionReports/schedule-inspection/batch/route.ts
import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, inspectionTeamAssignments, applications } from "@/db/schema";
import { inArray, eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, scheduledDate, inspectors, facilities, title } = body;

    let targetAppIds: number[] = [];

    await db.transaction(async (tx) => {
      // 1. Support single applicationId if provided directly
      if (applicationId) {
        targetAppIds.push(Number(applicationId));
      }

      // 2. Support facilities array (includes single facility or proximal / multi-facility batches)
      if (Array.isArray(facilities) && facilities.length > 0) {
        const matchingApps = await tx
          .select({ id: applications.id })
          .from(applications)
          .where(inArray(applications.facilityId, facilities));

        for (const app of matchingApps) {
          if (!targetAppIds.includes(app.id)) {
            targetAppIds.push(app.id);
          }
        }
      }

      if (targetAppIds.length === 0) {
        throw new Error("No valid applications or facilities found for scheduling dispatch.");
      }

      // 3. Clean up any existing active schedules for these specific applications to prevent unique constraint crashes
      await tx
        .delete(inspectionSchedules)
        .where(inArray(inspectionSchedules.applicationId, targetAppIds));

      // 4. Generate a unique batch reference string
      const batchReference = `BATCH-${Date.now()}`;

      // 5. Create the schedule batch record
      const [newBatch] = await tx.insert(scheduleBatches).values({
        batchReference,
        title: title || `Inspection Batch - ${new Date().toLocaleDateString()}`,
        startDate: scheduledDate,
        endDate: scheduledDate,
        status: "SCHEDULED",
        createdAt: new Date(),
      }).returning({ id: scheduleBatches.id });

      // 6. Insert individual schedules and team assignments for each target application
      for (const appId of targetAppIds) {
        const [newSchedule] = await tx.insert(inspectionSchedules).values({
          batchId: newBatch.id,
          applicationId: appId,
          scheduledDate,
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

    return NextResponse.json({ success: true, message: "Inspection schedule successfully created and dispatched!" });
  } catch (error: any) {
    console.error("Batch Creation Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}