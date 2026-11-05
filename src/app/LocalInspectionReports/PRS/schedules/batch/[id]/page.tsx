// @/app/LocalInspectionReports/PRS/schedules/batch/[id]/page.tsx
import { db } from "@/db";
import { 
  scheduleBatches, 
  inspectionSchedules, 
  applications, 
  companies,
  facilities,
  inspectionTeamAssignments, 
  users 
} from "@/db/schema";
import { prsInspectionWorkflow } from "@/config/workflows/prsInspectionWorkflow";
import { eq, inArray, and, aliasedTable, lte, gte, ne } from "drizzle-orm";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, BarChart3 } from "lucide-react";
import { format, parseISO } from "date-fns";
import PRSBatchActionModal from "./PRSBatchActionModal";
import BatchHistoryModal from "@/components/LocalInspectionReports/BatchHistoryModal";
import PRSBatchScheduleEditor from "../PRSBatchScheduleEditor";
// import PRSBatchScheduleEditor, { EditableScheduleItem, InspectorPoolItem } from "@/components/LocalInspectionReports/PRS/PRSBatchScheduleEditor";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id?: string }>;
}

export default async function PRSBatchWorkspacePage({ params }: PageProps) {
  const resolvedParams = await params?.catch(() => ({})) || {};
  const batchId = resolvedParams?.id;

  if (!batchId) {
    notFound();
  }

  // 1. Fetch Batch Record safely
  const [rawBatch] = await db
    .select({
      id: scheduleBatches.id,
      batchReference: scheduleBatches.batchReference,
      title: scheduleBatches.title,
      startDate: scheduleBatches.startDate,
      endDate: scheduleBatches.endDate,
      status: scheduleBatches.status,
      currentPoint: scheduleBatches.currentPoint,
      history: scheduleBatches.history,
      createdAt: scheduleBatches.createdAt,
      endorsedByName: users.name,
      isForeign: scheduleBatches.isForeign,
    })
    .from(scheduleBatches)
    .leftJoin(users, eq(scheduleBatches.endorsedBy, users.id))
    .where(eq(scheduleBatches.id, batchId))
    .limit(1);

  if (!rawBatch) {
    notFound();
  }

  // Safely normalize history
  let safeHistory: any[] = [];
  try {
    const hist = rawBatch.history;
    if (typeof hist === "string") {
      const parsed = JSON.parse(hist);
      safeHistory = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(hist)) {
      safeHistory = hist;
    } else if (hist && typeof hist === "object") {
      safeHistory = [hist];
    }
  } catch {
    safeHistory = [];
  }

  const batch = {
    ...rawBatch,
    history: safeHistory,
    batchReference: rawBatch.batchReference || "",
    title: rawBatch.title || "",
  };

  const localCompanies = aliasedTable(companies, "local_companies");
  const foreignCompanies = aliasedTable(companies, "foreign_companies");

  // 2. Query inspection schedules linked to this batch
  const rawSchedules = await db
    .select({
      scheduleId: inspectionSchedules.id,
      scheduledDate: inspectionSchedules.scheduledDate,
      status: inspectionSchedules.status,
      localCompanyName: localCompanies.name,
      localCompanyAddress: localCompanies.address,
      foreignCompanyName: foreignCompanies.name,
      foreignCompanyAddress: foreignCompanies.address,
      facilityName: facilities.name,
      facilityAddress: facilities.address,
      facilityCountry: facilities.country,
      inspectionType: applications.type,
      appDetails: applications.details,
    })
    .from(inspectionSchedules)
    .leftJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
    .leftJoin(localCompanies, eq(applications.companyId, localCompanies.id))
    .leftJoin(foreignCompanies, eq(applications.foreignFactoryId, foreignCompanies.id))
    .leftJoin(facilities, eq(applications.facilityId, facilities.id))
    .where(eq(inspectionSchedules.batchId, batchId));

  const scheduleIds = rawSchedules.map((s) => s.scheduleId).filter(Boolean);

  // 3. Query all users to form the available Inspector Pool
  const allInspectors = await db
    .select({
      id: users.id,
      full_name: users.name,
      division: users.division,
    })
    .from(users);

  const inspectorPool: InspectorPoolItem[] = allInspectors.map((u) => ({
    id: u.id,
    full_name: u.full_name || "Unknown Inspector",
    division: u.division || "STAFF",
  }));

  // 4. Build EditableScheduleItem rows for the BatchScheduleEditor
  const teamBySchedule: Record<
    string,
    { teamLeaderId?: string; coInspectorIds: string[]; traineeInspectorIds: string[] }
  > = {};

  const assignedInspectorIds: string[] = [];

  if (scheduleIds.length > 0) {
    const assignments = await db
      .select({
        scheduleId: inspectionTeamAssignments.scheduleId,
        inspectorId: inspectionTeamAssignments.inspectorId,
        role: inspectionTeamAssignments.role,
      })
      .from(inspectionTeamAssignments)
      .where(inArray(inspectionTeamAssignments.scheduleId, scheduleIds));

    for (const item of assignments) {
      if (!item || !item.scheduleId) continue;
      const sId = item.scheduleId;

      if (!teamBySchedule[sId]) {
        teamBySchedule[sId] = { coInspectorIds: [], traineeInspectorIds: [] };
      }

      assignedInspectorIds.push(item.inspectorId);

      if (item.role === "TEAM_LEADER") {
        teamBySchedule[sId].teamLeaderId = item.inspectorId;
      } else if (item.role === "TRAINEE_INSPECTOR") {
        teamBySchedule[sId].traineeInspectorIds.push(item.inspectorId);
      } else {
        teamBySchedule[sId].coInspectorIds.push(item.inspectorId);
      }
    }
  }

  const initialRows: EditableScheduleItem[] = rawSchedules.map((s) => {
    let appDetails: any = {};
    try {
      appDetails = typeof s.appDetails === "string" ? JSON.parse(s.appDetails) : (s.appDetails || {});
    } catch {
      appDetails = {};
    }

    const team = teamBySchedule[s.scheduleId] || { coInspectorIds: [], traineeInspectorIds: [] };

    return {
      scheduleId: s.scheduleId,
      companyName: s.foreignCompanyName || s.facilityName || s.localCompanyName || appDetails.companyName || "N/A",
      companyAddress: s.foreignCompanyAddress || s.facilityAddress || s.localCompanyAddress || "N/A",
      inspectionType: s.inspectionType || appDetails.type || "FOREIGN GMP INSPECTION",
      scheduledDate: s.scheduledDate ? String(s.scheduledDate) : "",
      teamLeaderId: team.teamLeaderId || "",
      coInspectorIds: team.coInspectorIds,
      traineeInspectorIds: team.traineeInspectorIds,
      driver: appDetails.assignedDriver || "FLIGHT / EXECUTIVE SHUTTLE",
    };
  });

  // 5. WORKLOAD CONFLICT DETECTOR: Check double-booking overlaps across active batches
  const overlappingConflicts: Record<string, string[]> = {};
  if (assignedInspectorIds.length > 0 && batch.startDate && batch.endDate) {
    const conflicts = await db
      .select({
        inspectorId: inspectionTeamAssignments.inspectorId,
        batchRef: scheduleBatches.batchReference,
      })
      .from(inspectionTeamAssignments)
      .innerJoin(inspectionSchedules, eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id))
      .innerJoin(scheduleBatches, eq(inspectionSchedules.batchId, scheduleBatches.id))
      .where(
        and(
          inArray(inspectionTeamAssignments.inspectorId, assignedInspectorIds),
          ne(scheduleBatches.id, batchId),
          and(
            lte(scheduleBatches.startDate, batch.endDate),
            gte(scheduleBatches.endDate, batch.startDate)
          )
        )
      );

    for (const c of conflicts) {
      if (!overlappingConflicts[c.inspectorId]) {
        overlappingConflicts[c.inspectorId] = [];
      }
      if (!overlappingConflicts[c.inspectorId].includes(c.batchRef)) {
        overlappingConflicts[c.inspectorId].push(c.batchRef);
      }
    }
  }

  const isAtPRSReview = batch.currentPoint === prsInspectionWorkflow.steps.PRS_SCHEDULE.currentPoint;

  const formattedHeaderDate =
    batch.startDate && batch.endDate
      ? `${format(parseISO(String(batch.startDate)), "do MMM yyyy")} TO ${format(
          parseISO(String(batch.endDate)),
          "do MMM yyyy"
        )}`
      : "SCHEDULE PERIOD";

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white text-black font-sans">
      
      {/* Top Breadcrumb & Metadata Controls */}
      <div className="max-w-5xl mx-auto mb-4 flex justify-between items-center print:hidden">
        <Link
          href="/LocalInspectionReports/PRS/schedule/inbox"
          className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" /> Back to PRS Inbox
        </Link>
        <div className="flex items-center gap-2">
          <BatchHistoryModal
            batchReference={batch.batchReference}
            title={batch.title}
            history={batch.history}
          />
          {isAtPRSReview && (
            <PRSBatchActionModal 
              batchId={batch.id} 
              title={batch.title} 
              currentStepKey={batch.currentPoint} 
            />
          )}
        </div>
      </div>

      {/* PRS Workload Conflict Banner */}
      <div className="max-w-5xl mx-auto mb-6 p-4 bg-indigo-900 text-white rounded-xl shadow-md print:hidden flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-bold uppercase tracking-wider">
            <BarChart3 className="w-4 h-4" /> PRS Workload Equity & Conflict Verification
          </div>
          <h2 className="text-sm font-semibold">
            Target Facilities: <span className="font-bold text-white">{initialRows.length}</span> | 
            Personnel Assigned: <span className="font-bold text-white">{assignedInspectorIds.length}</span>
          </h2>
        </div>
        <div>
          {Object.keys(overlappingConflicts).length > 0 ? (
            <div className="bg-amber-500/20 border border-amber-400/30 px-3 py-1.5 rounded-lg text-amber-200 text-xs flex items-center gap-2 font-medium">
              <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
              <span>Warning: {Object.keys(overlappingConflicts).length} inspector(s) have overlapping dates. Click "Edit Batch Schedule" below to re-assign.</span>
            </div>
          ) : (
            <div className="bg-emerald-500/20 border border-emerald-400/30 px-3 py-1.5 rounded-lg text-emerald-200 text-xs flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>Workload Equity Verified: Zero double-booking conflicts detected.</span>
            </div>
          )}
        </div>
      </div>

      {/* Interactive PRS Batch Schedule Editor Container */}
      <PRSBatchScheduleEditor
        batchId={batch.id}
        batchStatus={batch.status || ""}
        batchHistory={batch.history}
        startDate={String(batch.startDate || "")}
        endDate={String(batch.endDate || "")}
        scheduleIds={scheduleIds}
        initialRows={initialRows}
        inspectorPool={inspectorPool}
        formattedHeaderDate={formattedHeaderDate}
        isApproved={batch.status === "APPROVED" || batch.status === "DG_APPROVAL_PENDING"}
        isReadOnly={!isAtPRSReview}
      />
    </main>
  );
}