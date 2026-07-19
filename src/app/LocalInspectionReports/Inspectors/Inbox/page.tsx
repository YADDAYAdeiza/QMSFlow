import React from "react";
import Link from "next/link";
import { db } from "@/db";
import { 
  applications, 
  companies, 
  inspectionSchedules, 
  inspectionTeamAssignments, 
  users 
} from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";import { ShieldAlert, ClipboardList, UserCheck, Eye } from "lucide-react";

// Force dynamic execution to guarantee fresh QMS tracking data
export const dynamic = "force-dynamic";

interface Task {
  scheduleId: string;
  scheduledDate: string;
  scheduleStatus: string;
  assignedRole: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
  application: {
    id: string;
    fileNumber: string;
    companyName: string;
    currentPoint: string;
  };
}

export default async function InspectorWorkspacePage() {
  // 1. Establish session identity securely from server cookies
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
          } catch {
            // The `setAll` method was called from a Server Component.
            // This can be ignored if you have middleware handling session refreshes.
          }
        },
      },
    }
  );

  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    redirect("/login");
  }

// 2. Fetch internal QMS user meta profile securely
  const userEmail = session.user.email;
  if (!userEmail) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-xs font-medium flex items-center gap-2">
          <ShieldAlert className="w-4 h-4" />
          Active session metadata missing an email reference. Please re-authenticate.
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

  // 3. Fetch active assignments directly from the database
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
      .innerJoin(inspectionSchedules, eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id))
      .innerJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .where(
        and(
          eq(inspectionTeamAssignments.inspectorId, userRecord.id),
          eq(applications.currentPoint, "Staff Technical Field Review")
        )
      );

    // Map into required interface structure
    tasks = rawAssignments.map((row) => ({
      scheduleId: String(row.scheduleId),
      scheduledDate: row.scheduledDate ? new Date(row.scheduledDate).toLocaleDateString("en-GB") : "Pending Data",
      scheduleStatus: row.scheduleStatus ?? "SCHEDULED",
      assignedRole: row.assignedRole as Task["assignedRole"],
      application: {
        id: String(row.applicationId),
        fileNumber: row.fileNumber || "No File #",
        companyName: row.companyName,
        currentPoint: row.currentPoint ?? "Staff Technical Field Review"
      },
    }));
  } catch (dbError) {
    console.error("Direct Database Fetch Failure:", dbError);
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-slate-900">
      
      {/* Header Profile Section */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Inspector Field Assignment Desk
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {userRecord.name} • Divisional Deputy Director ({userRecord.division || "VMD"})
            </p>
          </div>
        </div>
      </div>

      {/* Task Inbox Count */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
        Pending Scheduled Inspections ({tasks.length})
      </h2>

      {/* Grid of Cards */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium bg-white">
          No pending scheduled site inspections mapped to this profile.
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
                className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Card Main Metadata Body */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-tight">
                      {task.application.fileNumber}
                    </span>
                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${roleBadgeStyles}`}>
                      {task.assignedRole.replace("_", " ")}
                    </span>
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
                    <span className="text-slate-400 font-medium">Current Stage:</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      Divisional Deputy Director
                    </span>
                  </div>
                </div>

                {/* Action Tray */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex justify-end gap-2">
                  {isTrainee ? (
                    <Link 
                      href={`/LocalInspectionReports/${task.application.id}?mode=readonly`}
                      className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors flex items-center justify-center gap-1.5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Audit Documents (Read-Only)
                    </Link>
                  ) : (
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