export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, companies, users } from "@/db/schema";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import DossierLink from "@/components/DossierLink";
import { 
  Clock, 
  LayoutDashboard, 
  User, 
  Inbox, 
  ArrowRightCircle, 
  Factory, 
  Landmark 
} from 'lucide-react';

export default async function StaffDashboard({ 
  params 
}: { 
  params: Promise<{ division: string }> 
}) {
  const { division: urlDivision } = await params;
  
  const supabase = createClient();
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
    console.error("❌ REGISTRY FAIL: UUID not found in 'users' table:", authUser.id);
    redirect("/login?error=unregistered");
  }

  const userDivision = (profile.division || "VMD").toUpperCase();
  const requestedDivision = urlDivision.toUpperCase();

  // Enforce Zoned Access
  if (userDivision !== requestedDivision && profile.role !== "Admin") {
    redirect(`/dashboard/${userDivision.toLowerCase()}`);
  }

  const staffName = profile.name || "Specialist";

  // 2. FETCH TASKS (Scoped to Staff ID and Division)
  const staffTasksRaw = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
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
        or(
          eq(qmsTimelines.point, 'Technical Review'),
          eq(qmsTimelines.point, 'Staff Technical Review'),
          eq(qmsTimelines.point, 'Technical DD Review Return'),
          eq(qmsTimelines.point, 'IRSD Staff Vetting'),
          eq(qmsTimelines.point, 'AFPD Staff Vetting'),
          eq(qmsTimelines.point, 'PAD Staff Vetting')
        ),
        isNull(qmsTimelines.endTime)
      )
    );

  // 3. QMS TIMER & WORKFLOW LOGIC
  const safeTasks = (staffTasksRaw ?? []).map(task => {
    const details = (task.applicationDetails as any) || {};
    
    // QMS Desk Time Calculation
    const start = task.startTime ? new Date(task.startTime).getTime() : Date.now();
    const elapsedMs = Math.max(0, Date.now() - start); 
    const minutes = Math.floor(elapsedMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    const displayTime = days > 0 
      ? `${days}d ${hours % 24}h` 
      : hours > 0 
        ? `${hours}h ${minutes % 60}m` 
        : `${minutes}m`;

    /**
     * LOGIC FIX: 
     * If it's a Facility Verification but has no inspection report yet, 
     * we treat it as a Dossier Review (Administrative phase).
     */
    const isComplianceReview = 
      details.isComplianceReview === true || 
      (details.type === "Facility Verification" && !!details.inspectionReportUrl) ||
      !!details.inspectionReportUrl;

    return {
      ...task,
      displayTime,
      isComplianceReview,
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
            <div className="flex items-center gap-2 mb-1 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
               <User className="w-3 h-3" /> Welcome Back, {staffName}
            </div>
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight flex items-center gap-3 italic text-slate-900 leading-none">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              {userDivision} Staff Workspace
            </h1>
            <p className="text-slate-500 text-sm font-medium">Manage your active regulatory assessments and dossiers.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            QMS Tracking Active
          </div>
        </header>
        
        <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">File Reference</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Review Category</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Time on Task</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Dossier / Comments</th>
                <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">Action</th>
              </tr>
            </thead>
            <tbody>
              {safeTasks.length === 0 ? (
                <tr>
                  <td colSpan={5} className="p-24 text-center">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Inbox className="w-6 h-6 text-slate-300" />
                    </div>
                    <p className="text-xs font-black uppercase tracking-widest text-slate-300">Your assignment queue is currently clear.</p>
                  </td>
                </tr>
              ) : safeTasks.map((task) => (
                <tr key={task.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 group">
                  <td className="p-6">
                    <p className="font-mono text-sm font-bold text-blue-600">#{task.displayAppNumber}</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase mt-1 tracking-tight">{task.displayCompanyName}</p>
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
                      <Clock className="w-3 h-3 text-rose-500" />
                      <span className="font-mono text-[11px] font-bold text-slate-600">{task.displayTime}</span>
                    </div>
                  </td>
                  
                  <td className="p-6">
                    <div className="flex flex-col gap-2 max-w-xs">
                       <DossierLink url={task.dossierUrl} />
                       <p className="text-[10px] italic text-slate-400 line-clamp-1 border-l-2 border-slate-200 pl-2">
                         Active assessment in progress.
                       </p>
                    </div>
                  </td>

                  <td className="p-6 text-right">
                    <Link 
                      href={`/dashboard/${userDivision.toLowerCase()}/review/${task.applicationId}`}
                      className={`inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-md group-hover:-translate-x-1 text-white ${
                        task.isComplianceReview ? 'bg-purple-600 hover:bg-purple-700' : 'bg-slate-900 hover:bg-blue-600'
                      }`}
                    >
                      Open Workfile <ArrowRightCircle className="w-4 h-4" />
                    </Link>
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