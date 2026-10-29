// @/app/LocalInspectionReports/ddd/schedule/print/page.tsx
export const dynamic = "force-dynamic";

import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  applications, 
  companies, 
  users,
  scheduleBatches,
  facilities
} from "@/db/schema";
import { eq, and, gte, lte, asc, inArray, SQL } from "drizzle-orm";
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
  const resolvedParams = await searchParams;
  const { batchId, startDate, endDate, readOnly } = resolvedParams || {};

  console.log("🔍 [PrintSchedulePage] Incoming Search Params:", { batchId, startDate, endDate });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const userId = user?.id;

  const userRole = user?.user_metadata?.role || "";
  const isReadOnly = 
    readOnly === "true" || 
    userRole === "Director" || 
    userRole === "Director VMAP" || 
    userRole === "DIRECTOR";

  // 1. Fetch Batch Metadata if batchId exists
  let activeBatch = null;
  if (batchId) {
    const [found] = await db
      .select({
        id: scheduleBatches.id,
        title: scheduleBatches.title,
        startDate: scheduleBatches.startDate,
        endDate: scheduleBatches.endDate,
        status: scheduleBatches.status,
        history: scheduleBatches.history,
      })
      .from(scheduleBatches)
      .where(eq(scheduleBatches.id, batchId))
      .limit(1);
    activeBatch = found || null;
    console.log("📦 [PrintSchedulePage] Found Active Batch:", activeBatch);
  }

  // 2. Resolve Date Range Defaults
  const today = new Date();
  const filterStart = startDate || activeBatch?.startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const filterEnd = endDate || activeBatch?.endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  console.log("📅 [PrintSchedulePage] Resolved Date Window:", { filterStart, filterEnd });

  // 3. Fetch Inspector Pool
  const rawUsers = await db
    .select({
      id: users.id,
      name: users.name,
      rank: users.rank,
      directorate: users.directorate,
    })
    .from(users);

  const inspectorPool: InspectorPoolItem[] = rawUsers.map((u) => ({
    id: u.id,
    full_name: u.name || "Unnamed Officer",
    division: u.rank || u.directorate || "VMAP",
  }));

  // 4. Build Filter Conditions
  const queryConditions: SQL[] = [];
  if (batchId) {
    queryConditions.push(eq(inspectionSchedules.batchId, batchId));
  } else {
    queryConditions.push(gte(inspectionSchedules.scheduledDate, filterStart));
    queryConditions.push(lte(inspectionSchedules.scheduledDate, filterEnd));
  }

  // 5. Query Schedules
  const rawSchedules = await db
    .select({
      scheduleId: inspectionSchedules.id,
      scheduledDate: inspectionSchedules.scheduledDate,
      applicationId: applications.id,
      applicationType: applications.type,
      details: applications.details,
      companyName: companies.name,
      companyAddress: companies.address,
      facilityName: facilities.name,
      facilityAddress: facilities.address,
    })
    .from(inspectionSchedules)
    .innerJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(facilities, eq(applications.facilityId, facilities.id))
    .where(and(...queryConditions))
    .orderBy(asc(inspectionSchedules.scheduledDate));

  console.log("📋 [PrintSchedulePage] Raw Schedules Query Result Count:", rawSchedules.length);
  console.log("📋 [PrintSchedulePage] Raw Schedules Data:", rawSchedules);

  // 6. Fetch Team Assignments
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

  // 7. Map Rows for BatchScheduleEditor
  const initialRows: EditableScheduleItem[] = rawSchedules.map((row) => {
    const rowAssignments = assignments.filter((a) => a.scheduleId === row.scheduleId);
    const teamLeader = rowAssignments.find((a) => a.role === "TEAM_LEADER")?.inspectorId || "";
    const coInspectors = rowAssignments.filter((a) => a.role === "CO_INSPECTOR").map((a) => a.inspectorId);
    const trainees = rowAssignments.filter((a) => a.role === "TRAINEE_INSPECTOR").map((a) => a.inspectorId);

    const displayName = row.facilityName || row.companyName || "N/A";
    const displayAddress = row.facilityAddress || row.companyAddress || "N/A";

    return {
      scheduleId: row.scheduleId,
      applicationId: row.applicationId,
      companyName: displayName,
      companyAddress: displayAddress,
      inspectionType: row.applicationType || "ROUTINE INSPECTION",
      scheduledDate: row.scheduledDate,
      driver: (row.details as any)?.assignedDriver || "DAN BABA",
      teamLeaderId: teamLeader,
      coInspectorIds: coInspectors,
      traineeInspectorIds: trainees,
    };
  });

  console.log("✨ [PrintSchedulePage] Mapped Initial Rows Count:", initialRows.length);

  const formattedHeaderDate = `${format(parseISO(filterStart), "do MMM yyyy")} TO ${format(parseISO(filterEnd), "do MMM yyyy")}`;

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