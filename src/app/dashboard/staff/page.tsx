export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { Briefcase, ChevronRight, Search, UserCheck, ShieldAlert, Layers } from "lucide-react";
import Link from "next/link";
import QMSCountdown from "@/components/QMSCountdown";

export default async function StaffWorkspacePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ division?: string }> 
}) {
  const { division } = await searchParams;
  
  // Normalize division (Defaults to VMD)
  const upperDiv = division?.toUpperCase() || "VMD";

  // Fetch applications at Technical Review stage for the entire division
  const inbox = await db.query.applications.findMany({
    where: (apps, { eq, and }) => and(
      eq(apps.currentPoint, 'Staff Technical Review'),
    ),
    with: {
      company: true,
      timelines: {
        where: (tm, { eq, and, isNull }) => and(
          eq(tm.division, upperDiv),
          isNull(tm.endTime)
          // ✅ staffId filter removed to make it agnostic
        ),
      }
    }
  });

  // Filter for records that have an active timeline for this specific desk
  const activeInbox = inbox.filter(app => app.timelines.length > 0);

  const QMS_MAX_SECONDS = 48 * 3600; 
  const nowMs = Date.now();

  return (
    <div className="p-10 bg-slate-50 min-h-screen font-sans pb-32">
      
      {/* --- DIVISION SWITCHER --- */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700 backdrop-blur-md bg-opacity-90">
        <span className="text-[9px] font-black uppercase tracking-widest text-blue-400 flex items-center gap-2">
          <Layers className="w-3 h-3" /> Technical Desk:
        </span>
        {["VMD", "PAD", "AFPD", "IRSD"].map((div) => (
          <Link 
            key={div} 
            href={`?division=${div.toLowerCase()}`} 
            className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${upperDiv === div ? 'bg-blue-600 text-white shadow-lg' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            {div}
          </Link>
        ))}
      </div>

      <header className="mb-10 flex justify-between items-end">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <div className="bg-blue-600 p-2 rounded-xl shadow-lg">
              <Briefcase className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {upperDiv} Technical Desk
            </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              QMS Monitoring • Global Division View
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        {activeInbox.map((app) => {
          const activeTimeline = app.timelines[0];
          const startMs = activeTimeline.startTime ? new Date(activeTimeline.startTime).getTime() : nowMs;
          const elapsed = Math.floor((nowMs - startMs) / 1000);
          const remaining = Math.max(0, QMS_MAX_SECONDS - elapsed);
          
          const dossierUrl = `/dashboard/${upperDiv.toLowerCase()}/review/${app.id}`;

          return (
            <div key={app.id} className="group bg-white rounded-[2rem] p-6 border-2 border-slate-100 hover:border-blue-400 transition-all flex items-center justify-between shadow-sm hover:shadow-xl">
              <div className="flex items-center gap-6">
                <div className="h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 group-hover:bg-blue-600 transition-colors">
                  <Search className="w-6 h-6 text-slate-300 group-hover:text-white" />
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">#{app.applicationNumber}</span>
                  </div>
                  <h3 className="text-sm font-black uppercase text-slate-800 mt-1">
                    {app.company?.name || "Unspecified Company"}
                  </h3>
                  <div className="flex items-center gap-2 mt-2 text-slate-400">
                    <UserCheck className="w-3 h-3" />
                    <span className="text-[10px] font-bold uppercase italic">
                      Current Reviewer: {activeTimeline.staffId ? "Assigned" : "Unassigned"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-8">
                <div className={`rounded-xl px-4 py-2 border transition-colors ${
                    remaining < 3600 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-900 border-slate-800 text-white'
                }`}>
                  <QMSCountdown 
                    startTime={new Date(startMs)} 
                    initialRemainingSeconds={remaining} 
                  />
                </div>

                <Link 
                  href={dossierUrl}
                  className="bg-slate-100 hover:bg-blue-600 hover:text-white p-5 rounded-[1.5rem] transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center group/btn"
                >
                  <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}

        {activeInbox.length === 0 && (
          <div className="p-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/40">
             <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase italic text-[10px] tracking-[0.3em]">
                No active dossiers in {upperDiv}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}