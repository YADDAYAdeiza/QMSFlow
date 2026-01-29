export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, or, sql, isNull } from "drizzle-orm";
import DossierLink from "@/components/DossierLink";
import { ArrowRightCircle, Activity, Clock, Inbox, Users } from "lucide-react";
import Link from "next/link";

export default async function DDDInboxPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ as?: string; view?: string }> 
}) {
  const { as, view } = await searchParams;
  
  const actingDivision = as?.toUpperCase() || "VMD";
  const isAssignedView = view === "assigned";
  
  const userMap: Record<string, string> = {
    VMD: "9215bf99-489e-4468-b9aa-bcd926d11c08",
    IRSD: "cfb8ccbd-7753-43f0-aa51-a9c449a52de6",
    PAD: "da0e45e5-cf4e-49b7-b22e-34e313df899d",
    AFPD: "e6be1703-3075-4e5c-b07f-8a6f166f74c6"
  };

  const loggedInUserId = userMap[actingDivision];

  // STABLE QUERY: No extra joins on Users to prevent hydration errors
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
      isNull(qmsTimelines.endTime),
      // SWITCH: Either look for MY files, or look for files in my DIVISION at the STAFF stage
      isAssignedView 
        ? and(
            eq(applications.currentPoint, 'Staff Technical Review'),
            eq(qmsTimelines.division, actingDivision)
          )
        : eq(qmsTimelines.staffId, loggedInUserId)
    ));

  const inbox = rawInbox.map(app => {
    const start = app.startTime ? new Date(app.startTime).getTime() : Date.now();
    const elapsedMs = Math.max(0, Date.now() - start); 
    const minutes = Math.floor(elapsedMs / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    let displayTime = days > 0 ? `${days}d ${hours % 24}h` : hours > 0 ? `${hours}h ${minutes % 60}m` : `${minutes}m`;

    return { ...app, displayTime };
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      {/* TESTING SWITCHER */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Switch Desk:</span>
        {Object.keys(userMap).map((div) => (
          <Link key={div} href={`?as=${div.toLowerCase()}&view=${view || 'new'}`} className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${actingDivision === div ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}>
            {div}
          </Link>
        ))}
      </div>

      <header className="mb-8">
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic leading-none">
          {actingDivision} Divisional Deputy Director
        </h1>
        
        {/* VIEW TABS */}
        <div className="flex gap-4 mt-6">
            <Link href={`?as=${actingDivision.toLowerCase()}&view=new`} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${!isAssignedView ? 'bg-blue-600 text-white shadow-lg shadow-blue-100' : 'bg-white text-slate-400 border border-slate-200'}`}>
              <Inbox className="w-3 h-3" /> My Pending Inbox
            </Link>
            <Link href={`?as=${actingDivision.toLowerCase()}&view=assigned`} className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 ${isAssignedView ? 'bg-purple-600 text-white shadow-lg shadow-purple-100' : 'bg-white text-slate-400 border border-slate-200'}`}>
              <Users className="w-3 h-3" /> Track Assigned Staff
            </Link>
        </div>
      </header>
      
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Dossier / Company</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Stage</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Desk Time</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Status</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => {
              const details = (app.details as any) || {};
              const lastComment = [...(details.comments || [])].reverse()[0];

              return (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-6">
                    <p className="font-mono text-sm font-bold text-blue-600">#{app.applicationNumber}</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase mt-1 tracking-tight">{app.companyName}</p>
                  </td>

                  <td className="p-6">
                    <span className={`text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit ${isAssignedView ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
                      <Activity className="w-3 h-3" /> {app.currentPoint}
                    </span>
                  </td>

                  <td className="p-6">
                    <div className="flex items-center gap-2">
                      <Clock className="w-3 h-3 text-rose-500" />
                      <span className="font-mono text-[11px] font-bold text-slate-600">{app.displayTime}</span>
                    </div>
                  </td>
                  
                  <td className="p-6">
                    <div className="flex flex-col gap-2 max-w-md">
                       <DossierLink url={details.inspectionReportUrl || details.poaUrl} />
                       <p className="text-[10px] text-slate-600 italic line-clamp-1 border-l-2 border-slate-200 pl-2">
                         {lastComment?.text || "Waiting for action."}
                       </p>
                    </div>
                  </td>

                  <td className="p-6 text-right">
                    <Link 
                      href={`/dashboard/ddd/review/${app.id}?as=${actingDivision.toLowerCase()}`}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md"
                    >
                      {isAssignedView ? 'Reassign' : 'Process'} <ArrowRightCircle className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {inbox.length === 0 && (
          <div className="p-20 text-center text-slate-400 italic font-medium uppercase text-[10px] tracking-widest">
            No dossiers found in this category.
          </div>
        )}
      </div>
    </div>
  );
}