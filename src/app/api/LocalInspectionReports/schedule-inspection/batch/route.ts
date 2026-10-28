import { NextResponse } from "next/server";
import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, inspectionTeamAssignments } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { applicationId, scheduledDate, inspectors, facilities } = body;

    await db.transaction(async (tx) => {
      // Generate a unique batch reference string to satisfy the not-null constraint
      const batchReference = `BATCH-${Date.now()}`;

      // 1. Create the schedule batch with the required batchReference
      const [newBatch] = await tx.insert(scheduleBatches).values({
        batchReference,
        title: `Inspection Batch - ${new Date().toLocaleDateString()}`,
        startDate: scheduledDate,
        endDate: scheduledDate,
        status: "SCHEDULED",
        createdAt: new Date(),
      }).returning({ id: scheduleBatches.id });

      // 2. Insert schedules and team assignments for each facility in the batch
      if (Array.isArray(facilities)) {
        for (const facilityId of facilities) {
          const [newSchedule] = await tx.insert(inspectionSchedules).values({
            batchId: newBatch.id,
            applicationId: Number(applicationId),
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
      }
    });

    return NextResponse.json({ success: true, message: "Batch schedule successfully created and dispatched!" });
  } catch (error: any) {
    console.error("Batch Creation Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}