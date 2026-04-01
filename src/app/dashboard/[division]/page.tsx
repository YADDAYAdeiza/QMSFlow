export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import { redirect } from "next/navigation";
import Link from "next/link";
import { ShieldAlert, FileText, Clock, LayoutDashboard } from 'lucide-react';

export default async function StaffDashboard(props: { 
  params: Promise<{ division: string }> 
}) {
  // 1. UNWRAP PARAMS (Fixes: Cannot convert undefined or null to object)
  const { division } = await props.params;
  const myDivision = (division || "VMD").toUpperCase();
  
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 2. FETCH DATA 
  // Note: We pull 'details' (JSONB) instead of a non-existent 'isComplianceReview' column
  const staffTasksRaw = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      point: qmsTimelines.point,
      applicationNumber: applications.applicationNumber,
      applicationDetails: applications.details, // <--- Pull the JSONB object
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        ilike(qmsTimelines.division, myDivision),
        eq(qmsTimelines.staffId, user.id), 
        or(
          eq(qmsTimelines.point, 'Technical Review'),
          eq(qmsTimelines.point, 'Technical DD Review Return')
        ),
        isNull(qmsTimelines.endTime)
      )
    );

  // 3. DATA HARDENING
  // We process the raw DB rows to extract JSONB keys safely before rendering
  const safeTasks = (staffTasksRaw ?? []).map(task => {
    const details = (task.applicationDetails as any) || {};
    
    return {
      ...task,
      // Logic: It's a compliance review if the flag is true OR if an inspection report exists
      isComplianceReview: details.isComplianceReview === true || !!details.inspectionReportUrl,
      displayCompanyName: task.companyName || "Unknown Entity",
      displayAppNumber: task.applicationNumber || "No Reference"
    };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-slate-900">
      <div className="max-w-5xl mx-auto">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black mb-2 uppercase tracking-tight flex items-center gap-3 italic text-slate-900">
              <LayoutDashboard className="w-8 h-8 text-blue-600" />
              {myDivision} Specialist Workspace
            </h1>
            <p className="text-slate-500 text-sm font-medium">Active regulatory assessments requiring your technical input.</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm text-[10px] font-black uppercase tracking-widest text-slate-400">
            QMS Compliance Active
          </div>
        </header>
        
        <div className="grid gap-6">
          {safeTasks.length > 0 ? safeTasks.map((task) => (
            <div key={task.id} className="group bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 flex justify-between items-center transition-all hover:shadow-xl hover:border-blue-100">
              <div className="flex gap-6 items-center">
                <div className={`p-4 rounded-3xl ${task.isComplianceReview ? 'bg-purple-50' : 'bg-blue-50'}`}>
                   {task.isComplianceReview ? <ShieldAlert className="w-6 h-6 text-purple-600" /> : <FileText className="w-6 h-6 text-blue-600" />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase tracking-widest ${task.isComplianceReview ? 'bg-purple-100 text-purple-700' : 'bg-emerald-100 text-emerald-700'}`}>
                      {task.isComplianceReview ? 'Compliance Audit' : 'Dossier Review'}
                    </span>
                    <span className="flex items-center gap-1 text-[8px] font-bold text-slate-400 uppercase">
                      <Clock className="w-3 h-3" /> {task.startTime ? new Date(task.startTime).toLocaleDateString() : 'New Assignment'}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight uppercase italic">{task.displayCompanyName}</h2>
                  <p className="text-xs font-mono text-slate-400 uppercase tracking-tighter">REF: {task.displayAppNumber}</p>
                </div>
              </div>

              <Link 
                href={`/dashboard/${division.toLowerCase()}/review/${task.applicationId}`}
                className={`px-8 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all active:scale-95 shadow-lg ${
                  task.isComplianceReview ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-slate-900 hover:bg-blue-600 text-white'
                }`}
              >
                Open Workfile
              </Link>
            </div>
          )) : (
            <div className="py-20 bg-white rounded-[3rem] border border-dashed border-slate-200 text-center">
              <p className="text-xs font-black uppercase tracking-widest text-slate-300">No active assignments found for your account.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}