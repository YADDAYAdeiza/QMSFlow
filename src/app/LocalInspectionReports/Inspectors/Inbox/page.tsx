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
import { eq, and, inArray } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { ShieldAlert, ClipboardList, UserCheck, Eye, Lock } from "lucide-react";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

export const dynamic = "force-dynamic";

// ============================================================================
// CONFIGURATION (Adjust & Git Push to change locking policy)
// ============================================================================
//  0 = Locked until the exact scheduled day (00:00:00 local time)
// -1 = Unlocks 1 day prior to scheduled date
// -2 = Unlocks 2 days prior to scheduled date (Handles foreign timezones & travel)
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

// Deterministic date formatter
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

// Helper: Formats a date to YYYY-MM-DD in West Africa Time (Africa/Lagos)
function getLocalDateString(dateInput?: string | Date | null): string {
  if (!dateInput) return "";
  const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(d.getTime())) return "";
  return d.toLocaleDateString("en-CA", { timeZone: "Africa/Lagos" });
}

// Helper to evaluate if the inspection is still locked
function checkIfLocked(scheduledDateInput: string | Date | null | undefined): boolean {
  if (!scheduledDateInput) return true; // Lock if date is undefined/missing
  
  const targetDate = new Date(scheduledDateInput);
  if (isNaN(targetDate.getTime())) return true;

  // Calculate unlock threshold date
  const unlockDate = new Date(targetDate);
  unlockDate.setDate(unlockDate.getDate() + INSPECTION_LOCK_THRESHOLD_DAYS);

  const todayStr = getLocalDateString(new Date());
  const unlockStr = getLocalDateString(unlockDate);

  if (!todayStr || !unlockStr) return true;

  return todayStr < unlockStr;
}

export default async function InspectorWorkspacePage() {
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

  // Authenticate securely against Supabase Auth server (replaces session check)
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
          Inspector profile record not found. Please contact system administration.
        </div>
      </div>
    );
  }

  let tasks: Task[] = [];
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
      .innerJoin(
        inspectionSchedules,
        eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id)
      )
      .innerJoin(
        applications,
        eq(inspectionSchedules.applicationId, applications.id)
      )
      .innerJoin(
        companies,
        eq(applications.companyId, companies.id)
      )
      .innerJoin(
        scheduleBatches,
        eq(inspectionSchedules.batchId, scheduleBatches.id)
      )
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

    tasks = Array.from(uniqueAssignmentsMap.values()).map((row) => ({
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
  } catch (dbError) {
    console.error("Direct Database Fetch Failure:", dbError);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-slate-900">
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Inspector Field Assignment Desk
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {userRecord.name} • Inspector ({userRecord.division || "VMD"})
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
        Pending Scheduled Inspections ({tasks.length})
      </h2>

      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium bg-white">
          No pending approved field inspections assigned to your profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
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

                  <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Stage:</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {task.application.currentPoint}
                    </span>
                  </div>
                </div>

                {/* Card Actions Block */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex justify-end gap-2">
                  {task.isLocked ? (
                    /* Locked UI State */
                    <button
                      disabled
                      className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed flex items-center justify-center gap-1.5 select-none"
                    >
                      <Lock className="w-3.5 h-3.5" />
                      Locked Until Scheduled Date ({task.scheduledDate})
                    </button>
                  ) : isTrainee ? (
                    /* Unlocked Trainee UI */
                    <Link 
                      href={`/LocalInspectionReports/${task.application.id}?mode=readonly`}
                      className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Audit Documents (Read-Only)
                    </Link>
                  ) : (
                    /* Unlocked Inspector UI */
                    <>
                      <Link 
                        href={`/LocalInspectionReports/${task.application.id}?mode=checklist`}
                        className="text-center text-xs font-medium py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors flex items-center gap-1"
                      >
                        <ClipboardList className="w-3.5 h-3.5 text-slate-400" />
                        Checklists
                      </Link>
                      
                      <Link 
                        href={`/LocalInspectionReports/${task.application.id}?mode=field-notes`}
                        className={`text-center text-xs font-semibold py-1.5 px-3 rounded text-white transition-colors shadow-sm flex items-center gap-1 ${
                          isLead 
                            ? "bg-purple-600 hover:bg-purple-700" 
                            : "bg-blue-600 hover:bg-blue-700"
                        }`}
                      >
                        <UserCheck className="w-3.5 h-3.5" />
                        {isLead ? "Execute Final Sign-Off" : "Record Audit Inputs"}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}