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
    const batchId = resolvedParams.batchId;
    const body = await request.json();
    const { title, startDate, endDate, inspectors, facilities } = body;

    await db.transaction(async (tx) => {
      // 1. Update batch core metadata
      await tx.update(scheduleBatches)
        .set({
          title,
          startDate,
          endDate,
          updatedAt: new Date(),
        })
        .where(eq(scheduleBatches.id, batchId));

      // 2. If facilities or inspectors are changed, update schedules and team assignments
      if (Array.isArray(facilities) && facilities.length > 0) {
        // Find corresponding application IDs for the selected facilities
        const matchingApps = await tx.select({ id: applications.id, facilityId: applications.facilityId })
          .from(applications)
          .where(inArray(applications.facilityId, facilities));

        // Delete existing schedules for this batch to rebuild the itinerary queue cleanly
        const existingSchedules = await tx.select({ id: inspectionSchedules.id })
          .from(inspectionSchedules)
          .where(eq(inspectionSchedules.batchId, batchId));

        const scheduleIds = existingSchedules.map(s => s.id);
        if (scheduleIds.length > 0) {
          await tx.delete(inspectionTeamAssignments)
            .where(inArray(inspectionTeamAssignments.scheduleId, scheduleIds));
          
          await tx.delete(inspectionSchedules)
            .where(eq(inspectionSchedules.batchId, batchId));
        }

        // Insert new schedules for each facility application in the batch
        for (const app of matchingApps) {
          const [newSchedule] = await tx.insert(inspectionSchedules).values({
            batchId,
            applicationId: app.id,
            scheduledDate: startDate,
            status: "SCHEDULED",
          }).returning({ id: inspectionSchedules.id });

          // Assign the team members to each schedule in the batch
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

    return NextResponse.json({ success: true, message: "Batch successfully updated and re-dispatched!" });
  } catch (error: any) {
    console.error("Batch Update Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Internal Server Error" }, { status: 500 });
  }
}