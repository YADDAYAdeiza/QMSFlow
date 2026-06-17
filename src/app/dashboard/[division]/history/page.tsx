export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, companies, users } from "@/db/schema";
import { eq, and, isNotNull, ilike, notAnsiNull } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import DossierLink from "@/components/DossierLink";
import { 
  Clock, 
  History, 
  User, 
  Inbox, 
  ArrowRightCircle, 
  Factory, 
  Landmark,
  CheckCircle2
} from 'lucide-react';

export default async function StaffHistoryDashboard({ 
  params 
}: { 
  params: Promise<{ division: string }> 
}) {
  const { division: urlDivision } = await params;
  
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // 1. SESSION & PROFILE SECURITY
  if (authError || !authUser) {
    redirect("/login");
  }

  const profileResult = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const profile = profileResult[0];

  if (!profile) {
    redirect("/login?error=unregistered");
  }

  const userDivision = (profile.division || "VMD").toUpperCase();
  const requestedDivision = urlDivision.toUpperCase();

  // Enforce Zoned Access
  if (userDivision !== requestedDivision && profile.role !== "Admin") {
    redirect(`/dashboard/${userDivision.toLowerCase()}/history`);
  }

  const staffName = profile.name || "Specialist";

  // 2. FETCH HISTORICAL TASKS (Scoped to Staff ID where processing concluded)
  const historicalTasksRaw = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      endTime: qmsTimelines.endTime,
      point: qmsTimelines.point,
      applicationNumber: applications.applicationNumber,
      applicationDetails: applications.details, 
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        ilike(qmsTimelines.division, userDivision),
        eq(qmsTimelines.staffId, authUser.id),
        isNotNull(qmsTimelines.endTime) // <-- QMS metric logic: filtering out ongoing works
      )
    )
    .orderBy(qmsTimelines.endTime);

  // 3. QMS STATS & CALCULATION LOGIC
  const treatedTasks = (historicalTasksRaw ?? []).map(task => {
    const details = (task.applicationDetails as any) || {};
    
    // Exact Time Metric spent working on this dossier phase before submitting it up
    const start = task.startTime ? new Date(task.startTime).getTime() : Date.now();
    const end = task.endTime ? new Date(task.endTime).getTime() : Date.now();
    const elapsedMs = Math.max(0, end - start); 
    
    const minutes = Math.floor(elapsedMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const processedDuration = days > 0 
      ? `${days}d ${hours % 24}h` 
      : hours > 0 
        ? `${hours}h ${minutes % 60}m` 
        : `${minutes}m`;

    const isComplianceReview = 
      details.isComplianceReview === true || 
      !!details.inspectionReportUrl;

    const formattedClosedDate = task.endTime 
      ? new Date(task.endTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
      : "---";

    return {
      ...task,
      processedDuration,
      isComplianceReview,
      formattedClosedDate,
      displayCompanyName: task.companyName || "Unknown Entity",
      displayAppNumber: task.applicationNumber || "No Reference",
      dossierUrl: details.inspectionReportUrl || details.poaUrl
    };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-emerald-600 font-black uppercase tracking-[0.3em] text-[10px]">
               <CheckCircle2 className="w-3 h-3" /> Historical Reporting Logs
            </div>
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight flex items-center gap-3 italic text-slate-900 leading-none">
              <History className="w-8 h-8 text-emerald-600" />
              {userDivision} Performance Archive
            </h1>
            <p className="text-slate-500 text-sm font-medium">Review and report on your previously executed assessments and dossier actions.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-emerald-600 bg-emerald-50/40 border-emerald-100">
            Total Handled: {treatedTasks.length} Files
          </div>
        </header>
        
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">File Reference</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Stage Handled</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Time-On-Task</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Date Dispatched</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">Reference Info</th>
              </tr>
            </thead>
            <tbody>
              {treatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-24 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">No historically completed assessments found.</p>
                  </td>
                </tr>
              ) : treatedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-emerald-50/20 transition-colors border-b border-slate-100 group">
                  <td className="p-6">
                    <p className="font-mono text-sm font-bold text-slate-700">#{task.displayAppNumber}</p>
                    <p className="text-[11px] font-black text-slate-500 uppercase mt-1 tracking-tight">{task.displayCompanyName}</p>
                  </td>

                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit border ${
                        task.isComplianceReview ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {task.isComplianceReview ? <Landmark className="w-3 h-3" /> : <Factory className="w-3 h-3" />}
                        {task.isComplianceReview ? 'Compliance Audit' : 'Dossier Review'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                        {task.point}
                      </span>
                    </div>
                  </td>

                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-slate-400" />
                      <span className="font-mono text-[11px] font-bold text-slate-600">{task.processedDuration}</span>
                    </div>
                  </td>
                  
                  <td className="p-6">
                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-2.5 py-1 rounded-md">
                      {task.formattedClosedDate}
                    </span>
                  </td>

                  <td className="p-6 text-right">
                    <div className="inline-flex items-center justify-end max-w-xs">
                       <DossierLink url={task.dossierUrl} />
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}