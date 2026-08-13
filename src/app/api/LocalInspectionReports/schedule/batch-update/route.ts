import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionSchedules, inspectionTeamAssignments, applications } from "@/db/schema";
import { eq, and, gte, lte, notInArray, inArray, SQL } from "drizzle-orm";

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
    const { updates, activeScheduleIds, batchId, startDate, endDate } = body;

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

        const scopeConditions: SQL[] = [
          gte(inspectionSchedules.scheduledDate, startDate),
          lte(inspectionSchedules.scheduledDate, endDate),
        ];

        if (batchId) {
          scopeConditions.push(eq(inspectionSchedules.batchId, batchId));
        }

        if (activeScheduleIds.length > 0) {
          removedSchedules = await tx
            .select({ 
              id: inspectionSchedules.id,
              applicationId: inspectionSchedules.applicationId 
            })
            .from(inspectionSchedules)
            .where(
              and(
                ...scopeConditions,
                notInArray(inspectionSchedules.id, activeScheduleIds)
              )
            );
        } else {
          removedSchedules = await tx
            .select({ 
              id: inspectionSchedules.id,
              applicationId: inspectionSchedules.applicationId 
            })
            .from(inspectionSchedules)
            .where(and(...scopeConditions));
        }

        const removedScheduleIds = removedSchedules.map((s) => s.id);
        const removedApplicationIds = removedSchedules
          .map((s) => s.applicationId)
          .filter((id): id is number => id !== null);

        if (removedScheduleIds.length > 0) {
          await tx
            .delete(inspectionTeamAssignments)
            .where(inArray(inspectionTeamAssignments.scheduleId, removedScheduleIds));

          await tx
            .delete(inspectionSchedules)
            .where(inArray(inspectionSchedules.id, removedScheduleIds));

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
        await tx
          .update(inspectionSchedules)
          .set({
            scheduledDate: row.scheduledDate,
            ...(row.driver !== undefined && { driver: row.driver }),
            ...(batchId ? { batchId } : {}), // 🔒 Binds batchId directly
            updatedAt: new Date(),
          })
          .where(eq(inspectionSchedules.id, row.scheduleId));

        await tx
          .delete(inspectionTeamAssignments)
          .where(eq(inspectionTeamAssignments.scheduleId, row.scheduleId));

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