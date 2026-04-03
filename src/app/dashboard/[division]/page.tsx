export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, companies, users } from "@/db/schema";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, FileText, Clock, LayoutDashboard, User, Inbox } from 'lucide-react';

export default async function StaffDashboard({ 
  params 
}: { 
  params: Promise<{ division: string }> 
}) {
  const { division } = await params;
  const myDivision = (division || "VMD").toUpperCase();
  
  const supabase = createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) {
    redirect("/login");
  }

  // 1. Fetch Staff Profile for the personalized greeting
  const profileResult = await db
    .select({ name: users.name })
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  const staffName = profileResult[0]?.name || "Specialist";

  /**
   * 2. FETCH DATA - Specialist Assignment Logic
   * We filter by the logged-in user's ID and check for both standard 
   * technical points and division-specific Hub Vetting points.
   */
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
        ilike(qmsTimelines.division, myDivision),
        eq(qmsTimelines.staffId, authUser.id),
        or(
          // Standard Technical Workflow Points
          eq(qmsTimelines.point, 'Technical Review'),
          eq(qmsTimelines.point, 'Staff Technical Review'),
          eq(qmsTimelines.point, 'Technical DD Review Return'),
          
          // Division-Specific Hub Vetting Points (IRSD, AFPD, PAD)
          eq(qmsTimelines.point, 'IRSD Staff Vetting'),
          eq(qmsTimelines.point, 'AFPD Staff Vetting'),
          eq(qmsTimelines.point, 'PAD Staff Vetting')
        ),
        isNull(qmsTimelines.endTime)
      )
    );

  const safeTasks = (staffTasksRaw ?? []).map(task => {
    const details = (task.applicationDetails as any) || {};
    return {
      ...task,
      // Logic: It's a compliance review if it's explicitly marked or a Facility Verification type
      isComplianceReview: details.isComplianceReview === true || details.type === "Facility Verification" || !!details.inspectionReportUrl,
      displayCompanyName: task.companyName || "Unknown Entity",
      displayAppNumber: task.applicationNumber || "No Reference"
    };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900 font-sans">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1 text-blue-600 font-black uppercase tracking-widest text-[10px]">
               <User className="w-3 h-3" /> Welcome Back, {staffName}
            </div>
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight flex items-center gap-3 italic text-slate-900 leading-none">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              {myDivision} Specialist Workspace
            </h1>
            <p className="text-slate-500 text-sm font-medium">Manage your active regulatory assessments and dossiers.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            QMS Tracking Active
          </div>
        </header>
        
        <div className="grid gap-6">
          {safeTasks.length > 0 ? safeTasks.map((task) => (
            <div key={task.id} className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-start md:items-center gap-6 transition-all hover:shadow-xl hover:border-blue-100">
              <div className="flex gap-6 items-center">
                <div className={`p-4 rounded-3xl ${task.isComplianceReview ? 'bg-purple-50' : 'bg-blue-50'}`}>
                   {task.isComplianceReview ? <ShieldAlert className="w-6 h-6 text-purple-600" /> : <FileText className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${task.isComplianceReview ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {task.isComplianceReview ? 'Compliance Audit' : 'Dossier Review'}
                    </span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase italic">
                      Stage: {task.point}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic leading-tight">{task.displayCompanyName}</h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter mt-1">REF: {task.displayAppNumber}</p>
                </div>
              </div>

              <div className="flex items-center gap-6 w-full md:w-auto">
                <div className="hidden lg:flex flex-col items-end">
                  <span className="text-[8px] font-black uppercase text-slate-300 tracking-widest mb-1">Time on Task</span>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-slate-500 uppercase">
                    <Clock className="w-3 h-3 text-rose-400" /> {task.startTime ? new Date(task.startTime).toLocaleDateString() : 'Pending'}
                  </div>
                </div>

                <Link 
                  href={`/dashboard/${division.toLowerCase()}/review/${task.applicationId}`}
                  className={`flex-1 md:flex-none px-10 py-4 rounded-2xl font-black text-center uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg ${
                    task.isComplianceReview 
                      ? 'bg-purple-600 hover:bg-purple-700 text-white' 
                      : 'bg-slate-900 hover:bg-blue-600 text-white'
                  }`}
                >
                  Open Workfile
                </Link>
              </div>
            </div>
          )) : (
            <div className="py-24 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
              <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                <Inbox className="w-6 h-6 text-slate-300" />
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-slate-300">Your assignment queue is currently clear.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}