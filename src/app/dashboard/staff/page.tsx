export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { 
  Briefcase, ChevronRight, Search, UserCheck, 
  ShieldAlert, Layers, Gavel, FileCheck, Clock 
} from "lucide-react";
import Link from "next/link";
import QMSCountdown from "@/components/QMSCountdown";

export default async function StaffWorkspacePage({ 
  searchParams 
}: { 
  searchParams: Promise<{ division?: string }> 
}) {
  const { division } = await searchParams;
  
  const upperDiv = division?.toUpperCase() || "VMD";
  const isIRSD = upperDiv === "IRSD";

  const targetPoint = isIRSD ? "IRSD Staff Vetting" : "Staff Technical Review";

  // Fetch applications based on the active point for the division
  const inbox = await db.query.applications.findMany({
    where: (apps, { eq }) => eq(apps.currentPoint, targetPoint),
    with: {
      // ✅ FIX: Changed 'company' to 'localApplicant' to match named relations in schema.ts
      localApplicant: true, 
      timelines: {
        where: (tm, { eq, and, isNull }) => and(
          eq(tm.division, upperDiv),
          isNull(tm.endTime)
        ),
      }
    }
  });

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
            <div className={`p-2 rounded-xl shadow-lg transition-colors duration-500 ${isIRSD ? 'bg-emerald-600' : 'bg-blue-600'}`}>
              {isIRSD ? <Gavel className="w-5 h-5 text-white" /> : <Briefcase className="w-5 h-5 text-white" />}
            </div>
            <h1 className="text-3xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">
              {upperDiv} {isIRSD ? 'Hub Vetting' : 'Technical Desk'}
            </h1>
          </div>
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">
              QMS Monitoring • {isIRSD ? 'Post-Registration Verification' : 'Technical Assessment Phase'}
          </p>
        </div>
      </header>

      <div className="grid grid-cols-1 gap-4 max-w-5xl">
        {activeInbox.map((app) => {
          const activeTimeline = app.timelines[0];
          const startMs = activeTimeline.startTime ? new Date(activeTimeline.startTime).getTime() : nowMs;
          const elapsed = Math.floor((nowMs - startMs) / 1000);
          const remaining = Math.max(0, QMS_MAX_SECONDS - elapsed);
          
          const appDetails = (app.details as any) || {};
          const hasVerification = !!appDetails.verificationReportUrl;
          const dossierUrl = `/dashboard/staff/review/${app.id}?division=${upperDiv.toLowerCase()}`;

          return (
            <div key={app.id} className={`group bg-white rounded-[2rem] p-6 border-2 transition-all flex items-center justify-between shadow-sm hover:shadow-xl ${isIRSD ? 'hover:border-emerald-400' : 'hover:border-blue-400'} border-slate-100`}>
              <div className="flex items-center gap-6">
                <div className={`h-14 w-14 rounded-2xl bg-slate-50 flex items-center justify-center border border-slate-100 transition-all duration-300 ${isIRSD ? 'group-hover:bg-emerald-600' : 'group-hover:bg-blue-600'}`}>
                  {isIRSD ? <Gavel className="w-6 h-6 text-slate-300 group-hover:text-white" /> : <Search className="w-6 h-6 text-slate-300 group-hover:text-white" />}
                </div>
                
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-blue-600">#{app.applicationNumber}</span>
                    {isIRSD && <span className="text-[8px] bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded font-black uppercase">IRSD Hub</span>}
                    {hasVerification && (
                      <span className="text-[8px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-black uppercase flex items-center gap-1">
                        <FileCheck className="w-2.5 h-2.5" /> Verification Loaded
                      </span>
                    )}
                  </div>
                  <h3 className="text-sm font-black uppercase text-slate-800 mt-1">
                    {/* ✅ FIX: Changed app.company to app.localApplicant */}
                    {app.localApplicant?.name || "Unspecified Company"}
                  </h3>
                  <div className="flex items-center gap-3 mt-2">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <UserCheck className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">
                        {activeTimeline.staffId ? "Officer Assigned" : "Direct Queue"}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-slate-400 border-l pl-3 border-slate-200">
                      <Clock className="w-3 h-3" />
                      <span className="text-[9px] font-bold uppercase tracking-tighter">
                        Started: {new Date(startMs).toLocaleTimeString()}
                      </span>
                    </div>
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
                  className={`p-5 rounded-[1.5rem] transition-all transform hover:scale-105 active:scale-95 shadow-sm flex items-center justify-center group/btn ${isIRSD ? 'bg-emerald-50 hover:bg-emerald-600 hover:text-white' : 'bg-slate-100 hover:bg-blue-600 hover:text-white'}`}
                >
                  <ChevronRight className="w-6 h-6 group-hover/btn:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          );
        })}

        {/* --- EMPTY STATE --- */}
        {activeInbox.length === 0 && (
          <div className="p-24 text-center border-2 border-dashed border-slate-200 rounded-[3rem] bg-white/40">
             <ShieldAlert className="w-12 h-12 text-slate-200 mx-auto mb-4" />
             <p className="text-slate-400 font-black uppercase italic text-[10px] tracking-[0.3em]">
                Desk is Clear: No Pending Dossiers for {upperDiv}
             </p>
          </div>
        )}
      </div>
    </div>
  );
}