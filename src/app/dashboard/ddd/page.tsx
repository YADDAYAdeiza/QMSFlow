export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, companies, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, or, inArray } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import DossierLink from "@/components/DossierLink";
import { recallApplication } from "@/lib/actions/ddd";  
 
import { 
  ArrowRightCircle, Clock, Inbox, Users, 
  Landmark, Factory, ShieldCheck, RotateCcw, AlertOctagon 
} from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { cn } from "@/lib/utils";

export default async function DDDInboxPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ as?: string; view?: string }> 
}) {
  // 1. Resolve Search Params
  const { as, view } = await searchParams;

  // 2. Authentication Check
  const supabase = await createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) {
    redirect("/login");
  }
  
  const loggedInUserId = session.user.id; 

  // 3. Resolve Profile-Driven Fallback Division
  const userProfile = await db
    .select({ division: users.division })
    .from(users)
    .where(eq(users.id, loggedInUserId))
    .then(res => res[0]);

  // STOPS FALLBACK LEAKAGE: Removed the hardcoded || "VMD" string trap completely
  const userDefaultDivision = userProfile?.division?.toUpperCase();
  const actingDivision = as?.toUpperCase() || userDefaultDivision;

  // 3b. Defensive Structural Guard
  if (!actingDivision) {
    return (
      <div className="pt-8 bg-slate-50 min-h-screen font-sans flex items-center justify-center">
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200 text-center max-w-md">
          <div className="w-12 h-12 bg-rose-50 text-rose-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <AlertOctagon className="w-6 h-6" />
          </div>
          <p className="text-rose-600 font-black uppercase tracking-[0.2em] text-[10px] mb-1">Configuration Error</p>
          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tight mb-3">No Division Assigned</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            Your profile does not specify a primary structural division. Sign out and Sign in again, or please request an administrator to update your account settings.
          </p>
        </div>
      </div>
    );
  }

  const isAssignedView = view === "assigned";
  
  // 4. Database Query
  const rawInbox = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details,
      status: applications.status,
      currentPoint: applications.currentPoint,
      companyName: companies.name,
      startTime: qmsTimelines.startTime,
      staffId: qmsTimelines.staffId, 
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .innerJoin(qmsTimelines, eq(qmsTimelines.applicationId, applications.id))
    .where(and(
      isNull(qmsTimelines.endTime),
      eq(qmsTimelines.division, actingDivision),
      isAssignedView 
        ? or(
            eq(applications.currentPoint, 'Staff Technical Review'),
            eq(applications.currentPoint, 'IRSD Staff Vetting') 
          )
        : or(
            eq(qmsTimelines.staffId, loggedInUserId),
            eq(applications.currentPoint, 'Technical DD Review'),
            eq(applications.currentPoint, 'IRSD Hub Clearance'),
            eq(applications.currentPoint, 'IRSD Staff Vetting Return'),
            eq(applications.currentPoint, 'Technical DD Review Return') 
          )
    ));

  // 5. Secondary Staff Name Resolution Step (Strict Normalization)
  let staffMap: Record<string, string> = {};
  
  if (isAssignedView && rawInbox.length > 0) {
    const uniqueStaffIds = Array.from(
      new Set(rawInbox.map(app => String(app.staffId || "")).filter(Boolean))
    );

    if (uniqueStaffIds.length > 0) {
      const fetchedStaff = await db
        .select({ id: users.id, name: users.name })
        .from(users)
        .where(inArray(users.id, uniqueStaffIds));
      
      staffMap = Object.fromEntries(
        fetchedStaff.map(u => [String(u.id).toLowerCase(), u.name])
      );
    }
  }

  // 6. Formatting & Runtime Evaluation Logic
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
    const isRound2 = details.isComplianceReview === true || !!details.inspectionReportUrl;
    
    const lookupKey = String(app.staffId || "").toLowerCase();
    const staffName = lookupKey ? staffMap[lookupKey] || null : null;

    const isReturningFromStaff = 
      app.currentPoint === "Technical DD Review Return" || 
      app.currentPoint === "IRSD Staff Vetting Return" ||
      app.status === "PENDING_DD_RECOMMENDATION" ||
      app.status === "AWAITING_HUB_ENDORSEMENT";

    return { ...app, displayTime, isRound2, staffName, isReturningFromStaff };
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
        
        <div className="flex gap-4 mt-6">
            <Link 
              href={`?as=${actingDivision.toLowerCase()}&view=new`} 
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                !isAssignedView ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200'
              )}
            >
              <Inbox className="w-3 h-3" /> Incoming for Assignment
            </Link>
            <Link 
              href={`?as=${actingDivision.toLowerCase()}&view=assigned`} 
              className={cn(
                "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all",
                isAssignedView ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white text-slate-400 border border-slate-200'
              )}
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
                    <div className="flex flex-col gap-1.5">
                      <span className={cn(
                        "text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit border",
                        app.isRound2 ? 'bg-purple-50 text-purple-700 border-purple-100' : 'bg-blue-50 text-blue-700 border-blue-100'
                      )}>
                        {app.isRound2 ? <Landmark className="w-3 h-3" /> : <Factory className="w-3 h-3" />}
                        {app.isRound2 ? 'Pass 2: Compliance' : 'Pass 1: Facility'}
                      </span>
                      
                      {isAssignedView && app.staffName ? (
                        <div className="text-[10px] font-black uppercase text-purple-700 bg-purple-50/60 px-2.5 py-1 rounded-lg w-fit border border-purple-200/40 flex items-center gap-1.5 tracking-tight mt-0.5">
                          <Users className="w-3 h-3 text-purple-500" />
                          <span>Reviewer: {app.staffName}</span>
                        </div>
                      ) : (
                        <span className="text-[9px] font-bold text-slate-400 uppercase italic">
                          {app.currentPoint === 'Technical DD Review Return' || app.currentPoint === 'IRSD Staff Vetting Return'
                            ? "Returned from Staff Evaluation"
                            : app.currentPoint
                          }
                        </span>
                      )}
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
                       <p className="line-clamp-1 border-l-2 border-slate-200 pl-2 text-slate-500">
                         {lastComment?.text ? `"${lastComment.text}"` : "New assignment tracking session initiated."}
                       </p>
                    </div>
                  </td>

                  <td className="p-6">
                    <div className="flex justify-end gap-2">
                      {isAssignedView && (
                        <form action={async () => {
                          "use server";
                          await recallApplication(String(app.id), actingDivision);
                        }}>
                          <button 
                            type="submit" 
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-amber-50 text-amber-700 border border-amber-200 text-[10px] font-black uppercase hover:bg-amber-600 hover:text-white transition-all shadow-sm"
                          >
                            <RotateCcw className="w-3 h-3" /> Recall
                          </button>
                        </form>
                      )}

                      <Link 
                        href={`/dashboard/ddd/review/${app.id}?as=${actingDivision.toLowerCase()}`}
                        className={cn(
                          "inline-flex items-center gap-2 px-6 py-3 rounded-xl text-[10px] font-black uppercase transition-all shadow-md group-hover:-translate-x-1",
                          isAssignedView 
                            ? "bg-white border border-slate-200 text-slate-900 hover:bg-slate-50" 
                            : app.isReturningFromStaff
                              ? "bg-emerald-600 text-white hover:bg-emerald-700 shadow-emerald-100/50" 
                              : "bg-slate-900 text-white hover:bg-blue-600" 
                        )}
                      >
                        {isAssignedView 
                          ? 'Track' 
                          : app.isReturningFromStaff 
                            ? 'Recommend' 
                            : 'Assign'} <ArrowRightCircle className="w-4 h-4" />
                      </Link>
                    </div>
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