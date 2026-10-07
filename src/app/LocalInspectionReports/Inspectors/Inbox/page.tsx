import React from "react";
import Link from "next/link";
import { db } from "@/db";
import { 
  applications, 
  companies, 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  scheduleBatches,
  users 
} from "@/db/schema";
import { eq, and, inArray, or } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldAlert, ClipboardList, UserCheck, Eye, Lock, FileCheck, CheckCircle2 } from "lucide-react";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

export const dynamic = "force-dynamic";

const INSPECTION_LOCK_THRESHOLD_DAYS = -20; 

interface Task {
  scheduleId: string;
  rawScheduledDate: Date | null;
  scheduledDate: string;
  scheduleStatus: string;
  assignedRole: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
  isLocked: boolean;
  application: {
    id: string;
    fileNumber: string;
    companyName: string;
    currentPoint: string;
  };
}

interface VettingTask {
  applicationId: string;
  fileNumber: string;
  companyName: string;
  currentPoint: string;
}

interface EndorsementTask {
  applicationId: string;
  fileNumber: string;
  companyName: string;
  currentPoint: string;
  updatedAt: string;
}

function formatDateSafe(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "Pending Data";
  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) return "Pending Data";
    const day = String(d.getUTCDate()).padStart(2, "0");
    const month = String(d.getUTCMonth() + 1).padStart(2, "0");
    const year = d.getUTCFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return "Pending Data";
  }
}

function getLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

function checkIfLocked(scheduledDateInput: string | Date | null | undefined): boolean {
  if (!scheduledDateInput) return true;
  const targetDate = new Date(scheduledDateInput);
  if (isNaN(targetDate.getTime())) return true;

  const unlockDate = new Date(targetDate);
  unlockDate.setDate(unlockDate.getDate() + INSPECTION_LOCK_THRESHOLD_DAYS);

  const todayStr = getLocalDateString(new Date());
  const unlockStr = getLocalDateString(unlockDate);

  if (!todayStr || !unlockStr) return true;
  return todayStr < unlockStr;
}

export default async function InspectorWorkspacePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab: requestedTab } = await searchParams;
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {}
        },
      },
    }
  );

  const { data: { user }, error: authError } = await supabase.auth.getUser();
  if (authError || !user) redirect("/login");

  const userEmail = user.email;
  if (!userEmail) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Active session metadata missing email reference. Please re-authenticate.
        </div>
      </div>
    );
  }

  const [userRecord] = await db
    .select({
      id: users.id,
      name: users.name,
      role: users.role,
      division: users.division,
    })
    .from(users)
    .where(eq(users.email, userEmail));

  if (!userRecord) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-xs font-medium">
          User profile record not found. Please contact system administration.
        </div>
      </div>
    );
  }

  const isDDD = userRecord.role === "Divisional Deputy Director";
  const activeTab = requestedTab || (isDDD ? "endorsements" : "field");

  // ------------------------------------------------------------------
  // 1. Fetch Field Tasks (For Staff/Inspectors)
  // ------------------------------------------------------------------
  let fieldTasks: Task[] = [];
  try {
    const rawAssignments = await db
      .select({
        scheduleId: inspectionSchedules.id,
        scheduledDate: inspectionSchedules.scheduledDate,
        scheduleStatus: inspectionSchedules.status,
        assignedRole: inspectionTeamAssignments.role,
        applicationId: applications.id,
        fileNumber: applications.applicationNumber,
        currentPoint: applications.currentPoint,
        companyName: companies.name,
      })
      .from(inspectionTeamAssignments)
      .innerJoin(inspectionSchedules, eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id))
      .innerJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .innerJoin(scheduleBatches, eq(inspectionSchedules.batchId, scheduleBatches.id))
      .where(
        and(
          eq(inspectionTeamAssignments.inspectorId, userRecord.id),
          eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.APPROVED),
          inArray(applications.currentPoint, [
            inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title,
            "Staff Technical Field Review",
            "STAFF_TECHNICAL_REVIEW",
            "Field Inspection In Progress",
            "Draft Report",
            "Inspection Drafted"
          ])
        )
      );

    const uniqueAssignmentsMap = new Map<string | number, typeof rawAssignments[number]>();
    for (const row of rawAssignments) {
      if (!uniqueAssignmentsMap.has(row.scheduleId)) {
        uniqueAssignmentsMap.set(row.scheduleId, row);
      }
    }

    fieldTasks = Array.from(uniqueAssignmentsMap.values()).map((row) => ({
      scheduleId: String(row.scheduleId),
      rawScheduledDate: row.scheduledDate ? new Date(row.scheduledDate) : null,
      scheduledDate: formatDateSafe(row.scheduledDate),
      scheduleStatus: row.scheduleStatus ?? "APPROVED",
      assignedRole: row.assignedRole as Task["assignedRole"],
      isLocked: checkIfLocked(row.scheduledDate),
      application: {
        id: String(row.applicationId),
        fileNumber: row.fileNumber || "No File #",
        companyName: row.companyName,
        currentPoint: row.currentPoint ?? inspectionReportWorkflow.steps.STAFF_TECHNICAL_REVIEW.title,
      },
    }));
  } catch (err) {
    console.error("Field Query Error:", err);
  }

  // ------------------------------------------------------------------
  // 2. Fetch IRSD Vetting Tasks (For IRSD Staff / IRSD Divisional Deputy Director)
  // ------------------------------------------------------------------
  let vettingTasks: VettingTask[] = [];
  try {
    const isIRSD_DDD = userRecord.role === "Divisional Deputy Director" && userRecord.division === "IRSD";

    const rawVetting = await db
      .select({
        applicationId: applications.id,
        fileNumber: applications.applicationNumber,
        currentPoint: applications.currentPoint,
        companyName: companies.name,
      })
      .from(applications)
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .where(
        and(
          inArray(applications.currentPoint, [
            "IRSD Staff Compliance Vetting",
            "IRSD_STAFF_VETTING"
          ]),
          or(
            eq(applications.assignedVettingInspectorId, userRecord.id),
            ...(isIRSD_DDD ? [eq(applications.assignedVettingInspectorId, userRecord.id)] : [])
          )
        )
      );

    vettingTasks = rawVetting.map((row) => ({
      applicationId: String(row.applicationId),
      fileNumber: row.fileNumber || "No File #",
      companyName: row.companyName,
      currentPoint: row.currentPoint || "IRSD Staff Compliance Vetting",
    }));
  } catch (err) {
    console.error("Vetting Query Error:", err);
  }

  // ------------------------------------------------------------------
  // 3. Fetch Technical Endorsement Tasks (For Divisional Deputy Director)
  // ------------------------------------------------------------------
  let endorsementTasks: EndorsementTask[] = [];
  try {
    const rawEndorsements = await db
      .select({
        id: applications.id,
        fileNumber: applications.applicationNumber,
        currentPoint: applications.currentPoint,
        status: applications.status,
        updatedAt: applications.updatedAt,
        companyName: companies.name,
      })
      .from(applications)
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .where(
        or(
          inArray(applications.currentPoint, [
            inspectionReportWorkflow.steps.DDD_TECHNICAL_REVIEW.title,
            "DDD_TECHNICAL_REVIEW",
            "Divisional Deputy Director Technical Endorsement",
            "Staff Technical Field Review"
          ]),
          eq(applications.status, "PENDING_TECHNICAL_ENDORSEMENT")
        )
      );

    endorsementTasks = rawEndorsements.map((row) => ({
      applicationId: String(row.id),
      fileNumber: row.fileNumber || "No File #",
      companyName: row.companyName,
      currentPoint: row.currentPoint || "Divisional Deputy Director Technical Endorsement",
      updatedAt: formatDateSafe(row.updatedAt),
    }));
  } catch (err) {
    console.error("Endorsement Query Error:", err);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-slate-900">
      <div className="mb-6 border-b border-slate-200 pb-5 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-slate-900">
            {isDDD ? "Divisional Deputy Director Management Desk" : "Inspector Assignment Desk"}
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            {userRecord.name} • {userRecord.role} ({userRecord.division || "VMD"})
          </p>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="flex border-b border-slate-200 mb-6 gap-6">
        {isDDD && (
          <Link
            href="?tab=endorsements"
            className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
              activeTab === "endorsements"
                ? "border-purple-600 text-purple-600"
                : "border-transparent text-slate-400 hover:text-slate-600"
            }`}
          >
            Technical Endorsement Desk ({endorsementTasks.length})
          </Link>
        )}
        <Link
          href="?tab=field"
          className={`pb-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === "field"
              ? "border-blue-600 text-blue-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          Field Inspection Tasks ({fieldTasks.length})
        </Link>
        <Link
          href="?tab=vetting"
          className={`pb-3 text-xs font-bold transition-colors border-b-2 flex items-center gap-2 ${
            activeTab === "vetting"
              ? "border-emerald-600 text-emerald-600"
              : "border-transparent text-slate-400 hover:text-slate-600"
          }`}
        >
          IRSD Vetting Desk ({vettingTasks.length})
        </Link>
      </div>

      {/* Tab: Technical Endorsements (Divisional Deputy Director) */}
      {activeTab === "endorsements" && (
        <>
          {endorsementTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-purple-100 rounded-lg text-slate-400 text-xs font-medium bg-purple-50/20">
              No field technical reports currently awaiting your endorsement.
            </div>
          ) : (
            <div 
              suppressHydrationWarning 
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {endorsementTasks.map((task) => (
                <div
                  key={task.applicationId}
                  suppressHydrationWarning
                  className="bg-white border border-purple-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono text-purple-800 bg-purple-50 px-1.5 py-0.5 rounded font-semibold">
                        {task.fileNumber}
                      </span>
                      <span className="text-[9px] font-bold border border-purple-200 bg-purple-50 text-purple-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Awaiting Endorsement
                      </span>
                    </div>

                    <div className="flex flex-col gap-1">
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {task.companyName}
                      </h3>
                      <p className="text-[11px] text-slate-400">
                        Submitted for Technical Review & IRSD Handoff
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-purple-50/50 border-t border-purple-100 rounded-b-lg flex justify-end">
                    <Link
                      href={`/LocalInspectionReports/${task.applicationId}?step=DDD_TECHNICAL_REVIEW`}
                      className="w-full text-center text-xs font-semibold py-2 px-3 rounded bg-purple-600 hover:bg-purple-700 text-white transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      Review & Endorse Report
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {/* Tab: Field Assignments */}
      {activeTab === "field" && (
        <>
          {fieldTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium bg-white">
              No pending approved field inspections assigned to your profile.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {fieldTasks.map((task) => {
                const isLead = task.assignedRole === "TEAM_LEADER";
                const isTrainee = task.assignedRole === "TRAINEE_INSPECTOR";
                let roleBadgeStyles = "bg-blue-50 text-blue-800 border-blue-200";
                if (isLead) roleBadgeStyles = "bg-purple-50 text-purple-800 border-purple-200";
                if (isTrainee) roleBadgeStyles = "bg-slate-100 text-slate-600 border-slate-300";

                return (
                  <div
                    key={task.scheduleId}
                    className={`bg-white border rounded-lg shadow-sm transition-shadow flex flex-col justify-between ${
                      task.isLocked ? "border-slate-200 opacity-80" : "border-slate-200 hover:shadow-md"
                    }`}
                  >
                    <div className="p-4 flex flex-col gap-3">
                      <div className="flex justify-between items-start gap-2">
                        <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-tight">
                          {task.application.fileNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {task.isLocked && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-bold bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded uppercase tracking-wider">
                              <Lock className="w-2.5 h-2.5" />
                              Locked
                            </span>
                          )}
                          <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${roleBadgeStyles}`}>
                            {task.assignedRole.replace("_", " ")}
                          </span>
                        </div>
                      </div>

                      <div>
                        <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                          {task.application.companyName}
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Target Date: <span className="font-semibold text-slate-600">{task.scheduledDate}</span>
                        </p>
                      </div>
                    </div>

                    <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex justify-end gap-2">
                      {task.isLocked ? (
                        <button disabled className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed flex items-center justify-center gap-1.5 select-none">
                          <Lock className="w-3.5 h-3.5" />
                          Locked ({task.scheduledDate})
                        </button>
                      ) : isTrainee ? (
                        <Link href={`/LocalInspectionReports/${task.application.id}?mode=readonly`} className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-white border border-slate-200 text-slate-600 flex items-center justify-center gap-1.5">
                          <Eye className="w-3.5 h-3.5" />
                          View Audit Documents
                        </Link>
                      ) : (
                        <>
                          <Link href={`/LocalInspectionReports/${task.application.id}?mode=checklist`} className="text-center text-xs font-medium py-1.5 px-3 rounded bg-white border border-slate-200 text-slate-700 flex items-center gap-1">
                            <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                            Checklists
                          </Link>
                          <Link href={`/LocalInspectionReports/${task.application.id}?mode=field-notes`} className={`text-center text-xs font-semibold py-1.5 px-3 rounded text-white flex items-center gap-1 ${isLead ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-blue-700"}`}>
                            <UserCheck className="w-3.5 h-3.5" />
                            {isLead ? "Sign-Off" : "Record Inputs"}
                          </Link>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </>
      )}

      {/* Tab: IRSD Vetting Desk */}
      {activeTab === "vetting" && (
        <>
          {vettingTasks.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-emerald-100 rounded-lg text-slate-400 text-xs font-medium bg-emerald-50/20">
              No applications currently pending your IRSD compliance vetting.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {vettingTasks.map((vetTask) => (
                <div
                  key={vetTask.applicationId}
                  className="bg-white border border-emerald-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
                >
                  <div className="p-4 flex flex-col gap-3">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-[10px] font-mono text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded font-semibold">
                        {vetTask.fileNumber}
                      </span>
                      <span className="text-[9px] font-bold border border-emerald-200 bg-emerald-50 text-emerald-800 px-1.5 py-0.5 rounded uppercase tracking-wider">
                        Compliance Vetting
                      </span>
                    </div>

                    <div>
                      <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                        {vetTask.companyName}
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-1">
                        Assigned for Desk Review & Compliance Vetting
                      </p>
                    </div>
                  </div>

                  <div className="px-4 py-3 bg-emerald-50/50 border-t border-emerald-100 rounded-b-lg flex justify-end">
                    <Link
                      href={`/LocalInspectionReports/${vetTask.applicationId}?step=IRSD_STAFF_VETTING`}
                      className="w-full text-center text-xs font-semibold py-2 px-3 rounded bg-emerald-600 hover:bg-emerald-700 text-white transition-colors shadow-sm flex items-center justify-center gap-1.5"
                    >
                      <FileCheck className="w-3.5 h-3.5" />
                      Perform Vetting Review
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}