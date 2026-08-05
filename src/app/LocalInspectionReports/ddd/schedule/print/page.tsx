import { db } from "@/db";
import { 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  applications, 
  companies, 
  users,
  scheduleBatches 
} from "@/db/schema";
import { eq, gte, lte, and, asc, inArray } from "drizzle-orm";
import { format, parseISO } from "date-fns";
import React from "react";
import BatchScheduleEditor, { 
  EditableScheduleItem, 
  InspectorPoolItem 
} from "@/components/LocalInspectionReports/BatchScheduleEditor";

export const dynamic = "force-dynamic";

export default async function PrintInspectionSchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const { startDate, endDate } = (await searchParams) || {};

  const today = new Date();
  const defaultStart = startDate || new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split("T")[0];
  const defaultEnd = endDate || new Date(today.getFullYear(), today.getMonth() + 1, 0).toISOString().split("T")[0];

  // 1. Query Schedule Batches for status & history
  const currentBatch = await db
    .select({
      id: scheduleBatches.id,
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

  const activeBatch = currentBatch[0] || null;
  const isApproved = activeBatch?.status === "APPROVED";

  // 2. Fetch Inspector Pool for the Editor Dropdowns
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

  // 3. Fetch Scheduled Inspections
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
    .where(
      and(
        gte(inspectionSchedules.scheduledDate, defaultStart),
        lte(inspectionSchedules.scheduledDate, defaultEnd)
      )
    )
    .orderBy(asc(inspectionSchedules.scheduledDate));

  const scheduleIds = rawSchedules.map((s) => s.scheduleId);

  // 4. Fetch Assigned Team Members
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

  // 5. Transform Data into Editable Row Format
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
      />
    </main>
  );
}