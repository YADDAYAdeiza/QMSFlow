export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, or } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import DossierLink from "@/components/DossierLink";
import { 
  ArrowRightCircle, 
  Clock, 
  Inbox, 
  Users, 
  Landmark, 
  Factory, 
  ShieldCheck 
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

export default async function DDDInboxPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ as?: string; view?: string }> 
}) {
  // 1. Resolve Search Params
  const { as, view } = await searchParams;

  // 2. Authentication Check
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  const loggedInUserId = session.user.id; 
  console.log('This is logged in user: ', loggedInUserId);

  /**
   * 3. Division Logic:
   * Maps to VMD, PAD, AFPD, or IRSD based on the 'as' URL parameter.
   */
  const actingDivision = as?.toUpperCase() || "VMD";
  const isAssignedView = view === "assigned";
  
  /**
   * 4. Universal Query for all Divisional Deputy Directors
   * - Technical Divisions (VMD, PAD, AFPD) look for 'Technical DD Review'
   * - IRSD looks for 'IRSD Hub Clearance'
   */
  const rawInbox = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details,
      status: applications.status,
      currentPoint: applications.currentPoint,
      companyName: companies.name,
      startTime: qmsTimelines.startTime,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .innerJoin(qmsTimelines, eq(qmsTimelines.applicationId, applications.id))
    .where(and(
      // Ensure we are looking at an active timeline step
      isNull(qmsTimelines.endTime),
      
      // Filter by the division specified in the URL toggle
      eq(qmsTimelines.division, actingDivision),
      
      isAssignedView 
        ? eq(applications.currentPoint, 'Staff Technical Review') // Items assigned to staff
        : or(
            // Item is personally on the DDD's desk
            eq(qmsTimelines.staffId, loggedInUserId),
            
            // Workflow Step: Standard Technical Divisions
            eq(applications.currentPoint, 'Technical DD Review'),
            
            // Workflow Step: IRSD Specific Hub
            eq(applications.currentPoint, 'IRSD Hub Clearance')
          )
    ));

  // 5. Format Time and Metadata for the View
  const inbox = rawInbox.map(app => {
    const start = app.startTime ? new Date(app.startTime).getTime() : Date.now();
    const elapsedMs = Math.max(0, Date.now() - start); 
    const minutes = Math.floor(elapsedMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    let displayTime = days > 0 
      ? `${days}d ${hours % 24}h` 
      : hours > 0 
        ? `${hours}h ${minutes % 60}m` 
        : `${minutes}m`;

    const details = (app.details as any) || {};
    // Round 2 is typically Compliance/Post-Reg (e.g., Facility Verification)
    const isRound2 = details.isComplianceReview === true || !!details.inspectionReportUrl;

    return { ...app, displayTime, isRound2 };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
          <ShieldCheck className="w-4 h-4" /> Executive Oversight
        </div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic leading-none">
          {actingDivision} Divisional Deputy Director
        </h1>
        
        {/* Navigation Toggles */}
        <div className="flex gap-4 mt-6">
            <Link 
              href={`?as=${actingDivision.toLowerCase()}&view=new`} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!isAssignedView ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
              <Inbox className="w-3 h-3" /> Incoming for Assignment
            </Link>
            <Link 
              href={`?as=${actingDivision.toLowerCase()}&view=assigned`} 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all ${isAssignedView ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
              <Users className="w-3 h-3" /> Monitoring Staff Reviews
            </Link>
        </div>
      </header>
      
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">File Reference</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Type / Stage</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Desk Time</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Status & Source</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.length === 0 ? (
              <tr>
                <td colSpan={5} className="p-20 text-center">
                  <p className="text-slate-400 text-xs font-black uppercase tracking-[0.2em]">Queue is clear for {actingDivision}</p>
                </td>
              </tr>
            ) : inbox.map((app) => {
              const details = (app.details as any) || {};
              const lastComment = [...(details.comments || [])].reverse()[0];

              return (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100 group">
                  <td className="p-6">
                    <p className="font-mono text-sm font-bold text-blue-600">#{app.applicationNumber}</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase mt-1 tracking-tight">{app.companyName}</p>
                  </td>

                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <span className={`text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit border ${
                        app.isRound2 ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      }`}>
                        {app.isRound2 ? <Landmark className="w-3 h-3" /> : <Factory className="w-3 h-3" />}
                        {app.isRound2 ? 'Post-Registration' : 'Pre-Registration'}
                      </span>
                      <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                        {app.currentPoint}
                      </span>
                    </div>
                  </td>

                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-rose-500" />
                      <span className="font-mono text-[11px] font-bold text-slate-600">{app.displayTime}</span>
                    </div>
                  </td>
                  
                  <td className="p-6 text-xs italic text-slate-400">
                    <div className="flex flex-col gap-2 max-w-md">
                       <DossierLink url={details.inspectionReportUrl || details.poaUrl} />
                       <p className="line-clamp-1 border-l-2 border-slate-200 pl-2">
                         {lastComment?.text || "New assignment."}
                       </p>
                    </div>
                  </td>

                  <td className="p-6 text-right">
                    <Link 
                      href={`/dashboard/ddd/review/${app.id}?as=${actingDivision.toLowerCase()}`}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md group-hover:-translate-x-1"
                    >
                      {isAssignedView ? 'Manage' : 'Assign'} <ArrowRightCircle className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}