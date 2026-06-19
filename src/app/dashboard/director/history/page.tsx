export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, companies, users } from "@/db/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import { redirect } from "next/navigation";
import DossierLink from "@/components/DossierLink";
import { 
  Clock, 
  History, 
  Inbox, 
  Factory, 
  Landmark,
  CheckCircle2,
  FileText,
  FileCheck,
  Award
} from 'lucide-react';

export default async function DirectorHistoryDashboard() {
  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  // 1. ROLE & PORTAL SECURITY
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

  // Authorize only Directors or Admins for this history pipeline
  if (profile.role !== "Director" && profile.role !== "Admin") {
    const fallbackZone = (profile.division || "VMD").toLowerCase();
    redirect(`/dashboard/${fallbackZone}`);
  }

  // 2. FETCH HISTORICAL ACTIONS COMPLETED BY THE DIRECTOR
  const directorTasksRaw = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      endTime: qmsTimelines.endTime,
      point: qmsTimelines.point,
      division: qmsTimelines.division,
      status: applications.status, 
      applicationNumber: applications.applicationNumber,
      applicationDetails: applications.details, 
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        eq(qmsTimelines.staffId, authUser.id),
        isNotNull(qmsTimelines.endTime)
      )
    )
    .orderBy(qmsTimelines.endTime);

  // 3. RUNTIME COMPILING WITH MASTER DOSSIER + TWO-PASS DEDUPLICATION
  const treatedTasks = (directorTasksRaw ?? []).map(task => {
    const details = (task.applicationDetails as any) || {};
    const comments = details.comments || [];
    
    // --- MASTER FILE: Original Submission Dossier ---
    const originalDossier = details.inspectionReportUrl || details.poaUrl || null;

    // --- PASS 1: GMP CLEARANCE (Facility Verification) ---
    const pass1Clearance = 
      details.gmp_clearance_url || 
      comments.find((c: any) => c.action === "TECHNICAL_PASS_CLEARED")?.attachmentUrl || 
      null;

    // --- PASS 2: GMP CERTIFICATE (Full Issuance) ---
    let pass2Certificate = details.gmp_certificate_url || null;

    if (!pass2Certificate && task.status === "CLEARED" && details.archived_path) {
      if (details.archived_path !== pass1Clearance) {
        pass2Certificate = details.archived_path;
      }
    }

    // Calculate precise time tracking spent on the Director's desk
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
      dossierUrl: originalDossier,
      clearanceUrl: pass1Clearance,
      certificateUrl: pass2Certificate
    };
  });

  return (
    <div className="py-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
               <CheckCircle2 className="w-3 h-3" /> Executive Clearance Logs
            </div>
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight flex items-center gap-3 italic text-slate-900 leading-none">
              <History className="w-8 h-8 text-blue-600" />
              Directorate Executive History
            </h1>
            <p className="text-slate-500 text-sm font-medium">Audit report of all directives, facility clearances, and technical approvals issued by your desk.</p>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 px-6 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest text-blue-600 shadow-sm">
            Total Endorsed: {treatedTasks.length} Applications
          </div>
        </header>
        
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">File Reference</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Target Action / Division</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Time-On-Desk</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Date Cleared</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">GMP Vault Assets</th>
              </tr>
            </thead>
            <tbody>
              {treatedTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-24 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">No historically completed executive actions found.</p>
                  </td>
                </tr>
              ) : treatedTasks.map((task) => (
                <tr key={task.id} className="hover:bg-blue-50/10 transition-colors border-b border-slate-100 group">
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
                        {task.point} ({task.division?.toUpperCase()})
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

                  {/* Vault column featuring Original File + Clearance Pass 1 + Certificate Pass 2 */}
                  <td className="p-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      
                      {/* 1. ORIGINAL DOSSIER LINK */}
                      {task.dossierUrl ? (
                        <div className="flex items-center gap-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 pl-3 pr-1 py-1 rounded-xl transition-all">
                          <span className="text-[9px] font-black text-slate-600 tracking-tight uppercase flex items-center gap-1">
                            <FileText className="w-3 h-3 text-slate-500" /> Original
                          </span>
                          <DossierLink url={task.dossierUrl} />
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold tracking-tight text-slate-300 uppercase italic border border-dashed border-slate-200 px-2 py-1.5 rounded-xl select-none">
                          No Dossier
                        </span>
                      )}

                      {/* 2. PASS 1 CLEARANCE */}
                      {task.clearanceUrl ? (
                        <div className="flex items-center gap-1 bg-emerald-50 hover:bg-emerald-100 border border-emerald-100 pl-3 pr-1 py-1 rounded-xl transition-all">
                          <span className="text-[9px] font-black text-emerald-700 tracking-tight uppercase flex items-center gap-1">
                            <FileCheck className="w-3 h-3 text-emerald-600" /> Pass 1
                          </span>
                          <DossierLink url={task.clearanceUrl} />
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold tracking-tight text-slate-300 uppercase italic border border-dashed border-slate-200 px-2 py-1.5 rounded-xl select-none">
                          No Clearance
                        </span>
                      )}

                      {/* 3. PASS 2 CERTIFICATE */}
                      {task.certificateUrl ? (
                        <div className="flex items-center gap-1 bg-blue-50/50 hover:bg-blue-50 border border-blue-100 pl-3 pr-1 py-1 rounded-xl transition-all">
                          <span className="text-[9px] font-black text-blue-500 tracking-tight uppercase flex items-center gap-1">
                            <Award className="w-3 h-3 text-blue-600" /> Pass 2
                          </span>
                          <DossierLink url={task.certificateUrl} />
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold tracking-tight text-slate-300 uppercase italic border border-dashed border-slate-200 px-2 py-1.5 rounded-xl select-none">
                          No Certificate
                        </span>
                      )}

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