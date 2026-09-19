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
import { eq, and, gte, lte, asc, inArray } from "drizzle-orm";
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

  // 1. Resolve Date Range Defaults (e.g., current month if query params are missing)
  const today = new Date();
  const filterStart = startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const filterEnd = endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  // 2. Fetch Inspector Pool
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

  // 3. Main Query: Filter strictly by scheduledDate within range + Application Status
  const rawSchedules = await db
    .select({
      scheduleId: inspectionSchedules.id,
      scheduledDate: inspectionSchedules.scheduledDate,
      applicationId: applications.id,
      applicationType: applications.type,
      details: applications.details,
      companyName: companies.name,
      companyAddress: companies.address,
    })
    .from(inspectionSchedules)
    .innerJoin(
      applications, 
      and(
        eq(inspectionSchedules.applicationId, applications.id),
        eq(applications.status, "DRAFT"),
        eq(applications.currentPoint, "Divisional Deputy Director IRSD Routing")
      )
    )
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        gte(inspectionSchedules.scheduledDate, filterStart),
        lte(inspectionSchedules.scheduledDate, filterEnd)
      )
    )
    .orderBy(asc(inspectionSchedules.scheduledDate));

  // 4. Fetch Team Assignments for retrieved schedules
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

  // 5. Optional Batch Metadata lookup (only if batchId was explicitly passed)
  let activeBatch = null;
  if (batchId) {
    const [found] = await db
      .select({
        id: scheduleBatches.id,
        status: scheduleBatches.status,
        history: scheduleBatches.history,
      })
      .from(scheduleBatches)
      .where(eq(scheduleBatches.id, batchId))
      .limit(1);
    activeBatch = found || null;
  }

  // 6. Map into rows for BatchScheduleEditor
  const initialRows: EditableScheduleItem[] = rawSchedules.map((row, index) => {
    const rowAssignments = assignments.filter((a) => a.scheduleId === row.scheduleId);
    const teamLeader = rowAssignments.find((a) => a.role === "TEAM_LEADER")?.inspectorId || "";
    const coInspectors = rowAssignments.filter((a) => a.role === "CO_INSPECTOR").map((a) => a.inspectorId);
    const trainees = rowAssignments.filter((a) => a.role === "TRAINEE_INSPECTOR").map((a) => a.inspectorId);

    return {
      scheduleId: row.scheduleId,
      sn: index + 1,
      companyName: row.companyName || "N/A",
      companyAddress: row.companyAddress || row.details?.companyAddress || "N/A",
      inspectionType: row.applicationType || "ROUTINE INSPECTION",
      scheduledDate: row.scheduledDate,
      driver: row.details?.assignedDriver || "DAN BABA",
      teamLeaderId: teamLeader,
      coInspectorIds: coInspectors,
      traineeInspectorIds: trainees,
    };
  });

  const formattedHeaderDate = `${format(parseISO(filterStart), "do MMM yyyy")} - ${format(parseISO(filterEnd), "do MMM yyyy")}`;

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white text-black font-sans">
      <BatchScheduleEditor
        batchId={activeBatch?.id || batchId}
        batchStatus={activeBatch?.status || "PENDING_RECOMMENDATION"}
        batchHistory={(activeBatch?.history as any[]) || []}
        startDate={filterStart}
        endDate={filterEnd}
        scheduleIds={scheduleIds}
        initialRows={initialRows}
        inspectorPool={inspectorPool}
        formattedHeaderDate={formattedHeaderDate}
        isApproved={activeBatch?.status === "APPROVED"}
        userId={userId}
        isReadOnly={isReadOnly}
      />
    </main>
  );
}