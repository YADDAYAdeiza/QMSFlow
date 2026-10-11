import { NextResponse } from "next/server";
import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  applications,
  qmsTimelines,
  users 
} from "@/db/schema";
import { eq, and, isNull, inArray, sql } from "drizzle-orm";
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

    // Verify that all provided inspector IDs exist in the users table to prevent FK crashes
    const inspectorIds = inspectors.map(i => i.inspectorId);
    const existingUsers = await db
      .select({ id: users.id })
      .from(users)
      .where(inArray(users.id, inspectorIds));

    const validUserIds = new Set(existingUsers.map(u => u.id));
    const invalidIds = inspectorIds.filter(id => !validUserIds.has(id));

    if (invalidIds.length > 0) {
      return NextResponse.json(
        { success: false, error: `Validation Error: One or more selected inspectors do not exist in the active user registry.` },
        { status: 400 }
      );
    }

    const currentStep = inspectionScheduleBatchWorkflow.steps.INSPECTION_PENDING;
    const nextStep = inspectionScheduleBatchWorkflow.steps.DDD_SCHEDULE_ROUTING; // Updated to intermediate routing step
    const now = new Date();
    let targetScheduleId = scheduleId;

    await db.transaction(async (tx) => {
      // 1. Create or Update the single Inspection Schedule record
      if (targetScheduleId) {
        await tx
          .update(inspectionSchedules)
          .set({
            scheduledDate,
            status: "SCHEDULED",
            updatedAt: now,
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

      // 3. Close active QMS timeline record for INSPECTION_PENDING
      await tx
        .update(qmsTimelines)
        .set({ endTime: now })
        .where(
          and(
            eq(qmsTimelines.applicationId, applicationId),
            isNull(qmsTimelines.endTime)
          )
        );

      // 4. Open NEW QMS timeline record for DDD_SCHEDULE_ROUTING
      await tx.insert(qmsTimelines).values({
        applicationId,
        point: nextStep.currentPoint,
        division: nextStep.division,
        startTime: now,
        details: {
          routed_from: currentStep.key,
          assigned_role: nextStep.role,
          scheduled_date: scheduledDate,
        },
      });

      // 5. Sync Application Status and Point to DDD_SCHEDULE_ROUTING
      await tx
        .update(applications)
        .set({
          currentPoint: nextStep.currentPoint,
          status: nextStep.statusLabel,
          details: sql`jsonb_set(
            COALESCE(${applications.details}, '{}'::jsonb), 
            '{inspectionWorkflowMeta}', 
            COALESCE(${applications.details}->'inspectionWorkflowMeta', '{}'::jsonb) || ${JSON.stringify({ currentStepKey: nextStep.key })}::jsonb
          )`,
          updatedAt: now,
        })
        .where(eq(applications.id, applicationId));
    });

    return NextResponse.json({
      success: true,
      scheduleId: targetScheduleId,
      message: "Single inspection scheduled and routed to DDD Schedule Preparation successfully.",
    });
  } catch (error: any) {
    console.error("Error scheduling inspection:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}