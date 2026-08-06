import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionSchedules, inspectionTeamAssignments, applications } from "@/db/schema";
import { eq, and, gte, lte, notInArray, inArray } from "drizzle-orm";

interface InspectorAssignmentUpdate {
  inspectorId: string;
  role: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
}

interface ScheduleRowUpdate {
  scheduleId: string;
  scheduledDate: string;
  driver?: string;
  inspectors: InspectorAssignmentUpdate[];
}

interface BatchUpdateRequest {
  updates: ScheduleRowUpdate[];
  activeScheduleIds?: string[];
  batchId?: string;
  startDate?: string;
  endDate?: string;
}

export async function PUT(request: Request) {
  try {
    const body: BatchUpdateRequest = await request.json();
    const { updates, activeScheduleIds, startDate, endDate } = body;

    if (!Array.isArray(updates)) {
      return NextResponse.json(
        { success: false, error: "Invalid payload format: updates must be an array." },
        { status: 400 }
      );
    }

    await db.transaction(async (tx) => {
      // 1. Handle Deletions / Removals from Batch
      if (Array.isArray(activeScheduleIds) && startDate && endDate) {
        let removedSchedules: { id: string; applicationId: number | null }[] = [];

        if (activeScheduleIds.length > 0) {
          // Find schedules in date range NOT present in activeScheduleIds
          removedSchedules = await tx
            .select({ 
              id: inspectionSchedules.id,
              applicationId: inspectionSchedules.applicationId 
            })
            .from(inspectionSchedules)
            .where(
              and(
                gte(inspectionSchedules.scheduledDate, startDate),
                lte(inspectionSchedules.scheduledDate, endDate),
                notInArray(inspectionSchedules.id, activeScheduleIds)
              )
            );
        } else {
          // If activeScheduleIds is an empty array, all items in this date range were removed
          removedSchedules = await tx
            .select({ 
              id: inspectionSchedules.id,
              applicationId: inspectionSchedules.applicationId 
            })
            .from(inspectionSchedules)
            .where(
              and(
                gte(inspectionSchedules.scheduledDate, startDate),
                lte(inspectionSchedules.scheduledDate, endDate)
              )
            );
        }

        const removedScheduleIds = removedSchedules.map((s) => s.id);
        const removedApplicationIds = removedSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (removedScheduleIds.length > 0) {
          // A. Wipe child team assignments first to respect FK relations
          await tx
            .delete(inspectionTeamAssignments)
            .where(inArray(inspectionTeamAssignments.scheduleId, removedScheduleIds));

          // B. Delete target schedule records
          await tx
            .delete(inspectionSchedules)
            .where(inArray(inspectionSchedules.id, removedScheduleIds));

          // C. Reset parent applications back to 'Unassigned Tasks' state
          if (removedApplicationIds.length > 0) {
            await tx
              .update(applications)
              .set({
                status: "INSPECTION_PENDING",
                currentPoint: "Staff Technical Field Review",
                updatedAt: new Date(),
              })
              .where(inArray(applications.id, removedApplicationIds));
          }
        }
      }

      // 2. Perform Updates for Active / Retained Schedule Rows
      for (const row of updates) {
        // Update primary schedule row properties (date & driver)
        await tx
          .update(inspectionSchedules)
          .set({
            scheduledDate: row.scheduledDate,
            ...(row.driver !== undefined && { driver: row.driver }),
            updatedAt: new Date(),
          })
          .where(eq(inspectionSchedules.id, row.scheduleId));

        // Wipe existing team assignments for this row
        await tx
          .delete(inspectionTeamAssignments)
          .where(eq(inspectionTeamAssignments.scheduleId, row.scheduleId));

        // Re-insert updated team assignments
        if (row.inspectors && row.inspectors.length > 0) {
          const newAssignments = row.inspectors.map((ins) => ({
            scheduleId: row.scheduleId,
            inspectorId: ins.inspectorId,
            role: ins.role,
            createdAt: new Date(),
          }));

          await tx.insert(inspectionTeamAssignments).values(newAssignments);
        }
      }
    });

    return NextResponse.json({
      success: true,
      message: "Batch schedule updated, synchronized, and applications reset successfully.",
    });
  } catch (error: any) {
    console.error("Batch Schedule Update Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update batch schedule." },
      { status: 500 }
    );
  }
}