// "use client"
import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull, ilike, or } from "drizzle-orm";
import Link from "next/link";
import { ShieldAlert, FileText, Clock } from 'lucide-react';

export default async function StaffDashboard({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  const myDivision = division.toUpperCase();

  const staffTasks = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      point: qmsTimelines.point,
      applicationNumber: applications.applicationNumber,
      companyName: companies.name,
      // Added isCompliance check from the application record
      isComplianceReview: applications.isComplianceReview 
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        ilike(qmsTimelines.division, myDivision),
        or(
          eq(qmsTimelines.point, 'Technical Review'),
          eq(qmsTimelines.point, 'Technical DD Review Return') // Round 2
        ),
        isNull(qmsTimelines.endTime)
      )
    );

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-black text-slate-900 mb-2 uppercase tracking-tight">
          {myDivision} Specialist Workspace
        </h1>
        <p className="text-slate-500 text-sm mb-8 font-medium">Active regulatory assessments requiring your technical input.</p>
        
        <div className="grid gap-6">
          {staffTasks.map((task) => (
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
                      <Clock className="w-3 h-3" /> {new Date(task.startTime!).toLocaleDateString()}
                    </span>
                  </div>
                  <h2 className="text-xl font-black text-slate-800 tracking-tight">{task.companyName}</h2>
                  <p className="text-xs font-mono text-slate-400 uppercase">{task.applicationNumber}</p>
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
          ))}
        </div>
      </div>
    </div>
  );
}