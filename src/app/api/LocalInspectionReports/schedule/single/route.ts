import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  applications 
} from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { scheduleId, applicationId, scheduledDate, inspectors } = body as {
      scheduleId?: string | null;
      applicationId: number;
      scheduledDate: string;
      inspectors: Array<{
        inspectorId: string;
        role: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
      }>;
    };

    if (!applicationId || !scheduledDate || !inspectors || inspectors.length === 0) {
      return NextResponse.json({ success: false, error: "Invalid payload parameters." }, { status: 400 });
    }

    const draftStep = inspectionScheduleBatchWorkflow.steps.SCHEDULE_DRAFT;

    let targetScheduleId = scheduleId;

    await db.transaction(async (tx) => {
      // 1. Create or Update the single Inspection Schedule record
      if (targetScheduleId) {
        await tx
          .update(inspectionSchedules)
          .set({
            scheduledDate,
            status: "SCHEDULED",
            updatedAt: new Date(),
          })
          .where(eq(inspectionSchedules.id, targetScheduleId));
      } else {
        const [inserted] = await tx
          .insert(inspectionSchedules)
          .values({
            applicationId,
            scheduledDate,
            status: "SCHEDULED",
            details: {},
          })
          .returning({ id: inspectionSchedules.id });

        targetScheduleId = inserted.id;
      }

      // 2. Clear & Reset Team Assignments
      await tx
        .delete(inspectionTeamAssignments)
        .where(eq(inspectionTeamAssignments.scheduleId, targetScheduleId!));

      const teamValues = inspectors.map((ins) => ({
        scheduleId: targetScheduleId!,
        inspectorId: ins.inspectorId,
        role: ins.role,
      }));

      await tx.insert(inspectionTeamAssignments).values(teamValues);

      // 3. Sync Application Status
      await tx
        .update(applications)
        .set({
          currentPoint: draftStep.currentPoint,
          status: draftStep.statusLabel,
          details: sql`jsonb_set(
            COALESCE(${applications.details}, '{}'::jsonb), 
            '{inspectionWorkflowMeta}', 
            COALESCE(${applications.details}->'inspectionWorkflowMeta', '{}'::jsonb) || ${JSON.stringify({ currentStepKey: draftStep.key })}::jsonb
          )`,
          updatedAt: new Date(),
        })
        .where(eq(applications.id, applicationId));
    });

    return NextResponse.json({
      success: true,
      scheduleId: targetScheduleId,
      message: "Single inspection scheduled successfully.",
    });
  } catch (error: any) {
    console.error("Error scheduling inspection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}