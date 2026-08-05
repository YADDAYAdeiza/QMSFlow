import { NextResponse } from "next/server";
import { db } from "@/db";
import { inspectionSchedules, inspectionTeamAssignments } from "@/db/schema";
import { eq, inArray } from "drizzle-orm";

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

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { updates } = body as { updates: ScheduleRowUpdate[] };

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json(
        { success: false, error: "No schedule updates provided." },
        { status: 400 }
      );
    }

    // Execute bulk updates inside a database transaction
    await db.transaction(async (tx) => {
      for (const row of updates) {
        // 1. Update the schedule date
        await tx
          .update(inspectionSchedules)
          .set({
            scheduledDate: row.scheduledDate,
            updatedAt: new Date(),
          })
          .where(eq(inspectionSchedules.id, row.scheduleId));

        // 2. Wipe existing team assignments for this schedule row
        await tx
          .delete(inspectionTeamAssignments)
          .where(eq(inspectionTeamAssignments.scheduleId, row.scheduleId));

        // 3. Re-insert updated team assignments
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
      message: "Batch schedule and team assignments updated successfully.",
    });
  } catch (error: any) {
    console.error("Batch Schedule Update Error:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Failed to update batch schedule." },
      { status: 500 }
    );
  }
}