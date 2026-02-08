export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import QMSCountdown from "@/components/QMSCountdown";
import AssignToDDDButton from "@/components/AssignToDDDButton"; 
import DossierLink from "@/components/DossierLink"; 
import { Inbox, ShieldAlert, CheckCircle2, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function DirectorPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ view?: string }> 
}) {
  const { view } = await searchParams;
  const currentView = (await view) === "final" ? "Director Final Review" : "Director Review";

  const [{ now }] = await db.execute(sql`SELECT now() as now`);
  const serverTime = new Date(now as string).getTime();

  // 1. Fetch Divisional Deputy Directors for accountability
  const availableHeads = await db
    .select({
      id: users.id,
      name: users.name,
      division: users.division,
    })
    .from(users)
    .where(eq(users.role, 'Divisional Deputy Director'));

  // 2. Fetch applications assigned to Director
  const inbox = await db
    .select({
      id: applications.id,
      nr: applications.applicationNumber,
      details: applications.details, 
      start: qmsTimelines.startTime,
      point: applications.currentPoint,
    })
    .from(applications)
    .where(eq(applications.currentPoint, currentView))
    .leftJoin(qmsTimelines, and(
        eq(qmsTimelines.applicationId, applications.id),
        eq(qmsTimelines.point, currentView),
        isNull(qmsTimelines.endTime)
    ));

  const QMS_LIMIT_SECONDS = 48 * 3600;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      <header className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-slate-900 p-2 rounded-lg shadow-lg">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              Directorate Workspace
            </h1>
          </div>
          
          <div className="flex gap-4 mt-6">
            <Link 
              href="?view=review" 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${currentView === 'Director Review' ? 'bg-blue-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
              <ClipboardList className="w-3 h-3" /> New Reviews ({currentView === 'Director Review' ? inbox.length : '0'})
            </Link>
            <Link 
              href="?view=final" 
              className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${currentView === 'Director Final Review' ? 'bg-emerald-600 text-white shadow-lg' : 'bg-white text-slate-400 border border-slate-200'}`}
            >
              <CheckCircle2 className="w-3 h-3" /> Final Approvals ({currentView === 'Director Final Review' ? inbox.length : '0'})
            </Link>
          </div>
        </div>
      </header>

      <div className="grid gap-4 max-w-6xl">
        {inbox.map((app) => {
          const startMs = app.start ? new Date(app.start).getTime() : serverTime;
          const elapsed = Math.floor((serverTime - startMs) / 1000);
          const remaining = Math.max(0, QMS_LIMIT_SECONDS - elapsed);

          const details = app.details as any;
          const savedUrl = details?.poaUrl || details?.inspectionReportUrl;
          
          // ✅ LOGIC: Prioritize LOD Intake's suggested division
          const lodSuggestedDiv = details?.assignedDivisions?.[0] || "VMD";
          const productName = details?.products?.[0] || "Dossier under review";

          return (
            <div key={app.id} className="p-6 bg-white rounded-[2.5rem] shadow-sm border-2 border-slate-100 hover:border-blue-300 transition-all flex justify-between items-center group">
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <p className={`font-mono font-bold text-xl ${currentView === 'Director Final Review' ? 'text-emerald-600' : 'text-blue-600'}`}>
                      #{app.nr}
                    </p>
                    {remaining < 14400 && ( 
                        <span className="flex items-center gap-1 text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase italic">
                            <ShieldAlert className="w-3 h-3" /> Priority Review
                        </span>
                    )}
                </div>
                <div className="flex flex-col">
                   <span className="text-[11px] text-slate-700 font-bold uppercase tracking-tight italic">{productName}</span>
                   <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                    LOD Route: {lodSuggestedDiv} | Manufacturer: {details?.factory_name || "N/A"}
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-xl">
                  <QMSCountdown initialRemainingSeconds={remaining} startTime={new Date(serverTime)} />
                </div>

                <div className="flex items-center gap-2">
                  <DossierLink url={savedUrl} />
                  {currentView === "Director Review" ? (
                    <AssignToDDDButton 
                      appId={app.id} 
                      defaultDivision={lodSuggestedDiv} // ✅ Pass LOD suggestion
                      availableHeads={availableHeads as any}
                    />
                  ) : (
                    <Link 
                      href={`/dashboard/director/review/${app.id}`} 
                      className="bg-emerald-600 text-white px-6 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-emerald-700 transition-colors"
                    >
                      Final Sign-off <CheckCircle2 className="w-4 h-4" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          );
        })}

        {inbox.length === 0 && (
          <div className="p-32 text-center bg-slate-100/30 rounded-[3rem] border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-bold italic uppercase text-xs tracking-[0.3em]">
              Clean Desk: No {currentView === 'Director Review' ? 'New Reviews' : 'Pending Approvals'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}