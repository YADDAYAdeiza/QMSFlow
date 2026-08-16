export const dynamic = "force-dynamic";

import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  applications, 
  companies, 
  users,
  scheduleBatches 
} from "@/db/schema";
import { eq, gte, lte, and, asc, or, isNull, inArray, notInArray, SQL } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import React from "react";
import BatchScheduleEditor, { 
  EditableScheduleItem, 
  InspectorPoolItem 
} from "@/components/LocalInspectionReports/BatchScheduleEditor";
import { createClient } from "@/utils/supabase/server";

export default async function PrintInspectionSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ batchId?: string; startDate?: string; endDate?: string; readOnly?: string }>;
}) {
  const { batchId, startDate, endDate, readOnly } = (await searchParams) || {};

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const userRole = user?.user_metadata?.role || "";
  const isReadOnly = 
    readOnly === "true" || 
    userRole === "Director" || 
    userRole === "Director VMAP" || 
    userRole === "DIRECTOR";

  // 1. Resolve Active Batch Record
  let activeBatch = null;

  if (batchId) {
    const [foundById] = await db
      .select({
        id: scheduleBatches.id,
        startDate: scheduleBatches.startDate,
        endDate: scheduleBatches.endDate,
        status: scheduleBatches.status,
        history: scheduleBatches.history,
      })
      .from(scheduleBatches)
      .where(eq(scheduleBatches.id, batchId))
      .limit(1);

    activeBatch = foundById || null;
  }

  const today = new Date();
  const defaultStart = activeBatch?.startDate || startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = activeBatch?.endDate || endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  if (!activeBatch) {
    const currentBatch = await db
      .select({
        id: scheduleBatches.id,
        startDate: scheduleBatches.startDate,
        endDate: scheduleBatches.endDate,
        status: scheduleBatches.status,
        history: scheduleBatches.history,
      })
      .from(scheduleBatches)
      .where(
        and(
          eq(scheduleBatches.startDate, defaultStart),
          eq(scheduleBatches.endDate, defaultEnd)
        )
      )
      .limit(1);

    activeBatch = currentBatch[0] || null;
  }

  // Create batch shell if it still does not exist
  if (!activeBatch) {
    try {
      const [newBatch] = await db
        .insert(scheduleBatches)
        .values({
          batchReference: `SCHEDULE-${defaultStart}-${defaultEnd}`,
          title: `VMAP Inspection Schedule (${defaultStart} to ${defaultEnd})`,
          startDate: defaultStart,
          endDate: defaultEnd,
          status: "PENDING_RECOMMENDATION",
          currentPoint: "Divisional Deputy Director IRSD Routing",
          history: [],
        })
        .returning({
          id: scheduleBatches.id,
          startDate: scheduleBatches.startDate,
          endDate: scheduleBatches.endDate,
          status: scheduleBatches.status,
          history: scheduleBatches.history,
        });

      activeBatch = newBatch;
    } catch (err) {
      const [reFetched] = await db
        .select({
          id: scheduleBatches.id,
          startDate: scheduleBatches.startDate,
          endDate: scheduleBatches.endDate,
          status: scheduleBatches.status,
          history: scheduleBatches.history,
        })
        .from(scheduleBatches)
        .where(
          and(
            eq(scheduleBatches.startDate, defaultStart),
            eq(scheduleBatches.endDate, defaultEnd)
          )
        )
        .limit(1);

      activeBatch = reFetched || null;
    }
  }

  const isApproved = activeBatch?.status === "APPROVED";

  // Fetch Inspector Pool
  const rawUsers = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
    })
    .from(users);

  const inspectorPool: InspectorPoolItem[] = rawUsers.map((u) => ({
    id: u.id,
    full_name: u.name,
    division: u.role || "IRSD",
    is_available: true,
  }));

  // ------------------------------------------------------------------
  // STEP 2: Query schedules matching active batchId directly
  // ------------------------------------------------------------------
  const baseWhereConditions: SQL[] = [
    notInArray(applications.status, ["REJECTED", "CANCELLED"]),
  ];

  if (!isApproved && !isReadOnly) {
    baseWhereConditions.push(
      inArray(applications.currentPoint, [
        "Divisional Deputy Director Technical Assignment",
        "Divisional Deputy Director IRSD Routing",
        "PENDING_BATCH_RECOMMENDATION",
        "Staff Technical Review",
        "Staff Technical Field Review"
      ])
    );
  }

  if (activeBatch?.id) {
  baseWhereConditions.push(
    or(
      eq(inspectionSchedules.batchId, activeBatch.id),
      and(
        isNull(inspectionSchedules.batchId),
        gte(inspectionSchedules.scheduledDate, defaultStart),
        lte(inspectionSchedules.scheduledDate, defaultEnd)
      )
    )!
  );
} else {
  baseWhereConditions.push(
    gte(inspectionSchedules.scheduledDate, defaultStart),
    lte(inspectionSchedules.scheduledDate, defaultEnd)
  );
}

  const rawSchedules = await db
    .select({
      scheduleId: inspectionSchedules.id,
      scheduledDate: inspectionSchedules.scheduledDate,
      applicationType: applications.type,
      details: applications.details,
      companyName: companies.name,
      companyAddress: companies.address,
    })
    .from(inspectionSchedules)
    .innerJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(and(...baseWhereConditions))
    .orderBy(asc(inspectionSchedules.scheduledDate));

  const scheduleIds = rawSchedules.map((s) => s.scheduleId);

  let assignments: Array<{ scheduleId: string; inspectorId: string; role: string }> = [];
  if (scheduleIds.length > 0) {
    assignments = await db
      .select({
        scheduleId: inspectionTeamAssignments.scheduleId,
        role: inspectionTeamAssignments.role,
        inspectorId: inspectionTeamAssignments.inspectorId,
      })
      .from(inspectionTeamAssignments)
      .where(inArray(inspectionTeamAssignments.scheduleId, scheduleIds));
  }

  const initialRows: EditableScheduleItem[] = rawSchedules.map((row, index) => {
    const rowAssignments = assignments.filter((a) => a.scheduleId === row.scheduleId);
    const teamLeader = rowAssignments.find((a) => a.role === "TEAM_LEADER")?.inspectorId || "";
    const coInspectors = rowAssignments.filter((a) => a.role === "CO_INSPECTOR").map((a) => a.inspectorId);
    const trainees = rowAssignments.filter((a) => a.role === "TRAINEE_INSPECTOR").map((a) => a.inspectorId);

    const address = row.companyAddress || row.details?.companyAddress || "N/A";

    return {
      scheduleId: row.scheduleId,
      sn: index + 1,
      companyName: row.companyName || "N/A",
      companyAddress: address,
      inspectionType: row.applicationType || "ROUTINE INSPECTION",
      scheduledDate: row.scheduledDate,
      driver: row.details?.assignedDriver || "DAN BABA",
      teamLeaderId: teamLeader,
      coInspectorIds: coInspectors,
      traineeInspectorIds: trainees,
    };
  });

  const formattedHeaderDate = `${format(parseISO(defaultStart), "do")} - ${format(parseISO(defaultEnd), "do MMMM yyyy")}`;

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white text-black font-sans">
      <BatchScheduleEditor
        batchId={activeBatch?.id}
        batchStatus={activeBatch?.status}
        batchHistory={activeBatch?.history as any[]}
        startDate={defaultStart}
        endDate={defaultEnd}
        scheduleIds={scheduleIds}
        initialRows={initialRows}
        inspectorPool={inspectorPool}
        formattedHeaderDate={formattedHeaderDate}
        isApproved={isApproved}
        userId={userId}
        isReadOnly={isReadOnly}
      />
    </main>
  );
}