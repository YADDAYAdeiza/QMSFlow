export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import QMSCountdown from "@/components/QMSCountdown";
import AssignToDDDButton from "@/components/AssignToDDDButton";
import DossierLink from "@/components/DossierLink"; // The new client component
import { Inbox, ShieldAlert } from "lucide-react";

export default async function DirectorPage() {
  // 1. Get the Database "Source of Truth" time for QMS sync
  const [{ now }] = await db.execute(sql`SELECT now() as now`);
  const serverTime = new Date(now as string).getTime();

  // 2. Fetch applications at Director stage
  const inbox = await db
    .select({
      id: applications.id,
      nr: applications.applicationNumber,
      details: applications.details, 
      start: qmsTimelines.startTime,
    })
    .from(applications)
    .where(eq(applications.currentPoint, 'Director'))
    .leftJoin(qmsTimelines, and(
        eq(qmsTimelines.applicationId, applications.id),
        eq(qmsTimelines.point, 'Director'),
        isNull(qmsTimelines.endTime)
    ));

  // QMS Requirement: 48-hour limit
  const QMS_LIMIT_SECONDS = 48 * 3600;

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans">
      {/* HEADER SECTION */}
      <div className="flex justify-between items-end mb-10">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-lg shadow-lg shadow-blue-200">
              <Inbox className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900">
              Director Inbox ({inbox.length})
            </h1>
          </div>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.2em] ml-12">
             Workflow Monitoring • Official QMS Time
          </p>
        </div>
      </div>

      {/* APPLICATIONS LIST */}
      <div className="grid gap-4 max-w-6xl">
        {inbox.map((app) => {
          const startMs = app.start ? new Date(app.start).getTime() : serverTime;
          const elapsed = Math.floor((serverTime - startMs) / 1000);
          const remaining = Math.max(0, QMS_LIMIT_SECONDS - elapsed);

          const details = app.details as any;
          // Extract URLs from the JSONB details object
          const savedUrl = details?.poaUrl || details?.inspectionReportUrl;
          
          // Fallback to Saved Info divisions: VMD, PAD, AFPD, IRSD
          const assignedDivisions = details?.assignedDivisions || ["VMD", "PAD", "AFPD", "IRSD"];
          const productName = details?.products?.[0] || "Dossier under review";

          return (
            <div 
              key={app.id} 
              className="p-6 bg-white rounded-2xl shadow-sm border border-slate-200 flex justify-between items-center hover:shadow-md hover:border-blue-300 transition-all group"
            >
              <div className="flex flex-col gap-1">
                <div className="flex items-center gap-3">
                    <p className="text-blue-600 font-mono font-bold text-xl">
                    #{app.nr}
                    </p>
                    {remaining < 7200 && ( 
                        <span className="flex items-center gap-1 text-[9px] font-black bg-orange-100 text-orange-600 px-2 py-0.5 rounded-full uppercase">
                            <ShieldAlert className="w-3 h-3" /> Priority
                        </span>
                    )}
                </div>
                <div className="flex flex-col gap-0.5">
                   <span className="text-[11px] text-slate-700 font-bold uppercase tracking-tight italic">
                    {productName}
                   </span>
                   <span className="text-[9px] text-slate-400 font-black uppercase tracking-widest">
                    Manufacturer: {details?.factory_name || "N/A"}
                   </span>
                </div>
              </div>

              <div className="flex items-center gap-6">
                {/* QMS COUNTDOWN TIMER */}
                <div className="bg-slate-900 px-4 py-2 rounded-xl border border-slate-800 shadow-xl">
                  <QMSCountdown 
                    initialRemainingSeconds={remaining} 
                    startTime={new Date(serverTime)} 
                  />
                </div>

                <div className="flex items-center gap-2">
                  {/* VIEW DOSSIER (Client Component Link) */}
                  <DossierLink url={savedUrl} />

                  {/* ASSIGN TO DDD (Trigger Modal) */}
                  <AssignToDDDButton 
                    appId={app.id} 
                    divisions={assignedDivisions} 
                  />
                </div>
              </div>
            </div>
          );
        })}

        {/* EMPTY STATE */}
        {inbox.length === 0 && (
          <div className="p-32 text-center bg-slate-100/30 rounded-3xl border-2 border-dashed border-slate-200 flex flex-col items-center">
            <Inbox className="w-12 h-12 text-slate-200 mb-4" />
            <p className="text-slate-400 font-bold italic uppercase text-xs tracking-[0.3em]">
              Zero Pending Tasks for Director
            </p>
          </div>
        )}
      </div>
    </div>
  );
}