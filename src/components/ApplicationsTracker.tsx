import { db } from "@/db";
import { applications } from "@/db/schema";
import { desc } from "drizzle-orm";
import Link from "next/link";
import { Factory, Globe, FileSearch } from "lucide-react";

// We pass the "basePath" as a prop so the "Open" button 
// links to the correct review screen for that specific role.
interface TrackerProps {
  rolePath: "lod" | "director";
}

export default async function ApplicationsTracker({ rolePath }: TrackerProps) {
  const allApps = await db.query.applications.findMany({
    orderBy: [desc(applications.id)],
    with: {
      localApplicant: true,
      foreignFactory: true,
    },
  });

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-end mb-10">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">
              Master Tracker
            </h1>
            <p className="text-slate-500 text-sm mt-2 font-medium">
              Real-time oversight of all regulatory facility dossiers.
            </p>
          </div>
          <div className="bg-white border-2 border-slate-900 px-4 py-2 rounded-xl shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]">
            <span className="text-slate-900 font-black text-xs uppercase tracking-widest">
              Total Dossiers: {allApps.length}
            </span>
          </div>
        </header>

        <div className="overflow-hidden border-2 border-slate-900 rounded-[2rem] bg-white shadow-[12px_12px_0px_0px_rgba(15,23,42,1)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-6 text-[10px] uppercase tracking-[0.2em] font-black">Application ID</th>
                <th className="p-6 text-[10px] uppercase tracking-[0.2em] font-black">Stakeholders</th>
                <th className="p-6 text-[10px] uppercase tracking-[0.2em] font-black">Current Point</th>
                <th className="p-6 text-[10px] uppercase tracking-[0.2em] font-black">Status</th>
                <th className="p-6 text-[10px] uppercase tracking-[0.2em] font-black text-right">Dossier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {allApps.map((app) => (
                <tr key={app.id} className="hover:bg-blue-50/50 transition-colors group">
                  <td className="p-6">
                    <p className="font-mono font-black text-blue-600 text-lg">#{app.applicationNumber}</p>
                    <span className="text-[10px] font-bold text-slate-400 uppercase">{app.type}</span>
                  </td>
                  
                  <td className="p-6">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2 text-slate-900 font-bold text-sm">
                        <Factory className="w-3 h-3 text-slate-400" />
                        {app.localApplicant?.name || "Unknown Applicant"}
                      </div>
                      <div className="flex items-center gap-2 text-slate-500 font-medium text-xs italic">
                        <Globe className="w-3 h-3 text-slate-300" />
                        {app.foreignFactory?.name || "Local Facility"}
                      </div>
                    </div>
                  </td>

                  <td className="p-6">
                    <span className="text-[11px] font-black text-slate-600 uppercase tracking-tight bg-slate-100 px-3 py-1 rounded-lg">
                      {app.currentPoint}
                    </span>
                  </td>

                  <td className="p-6">
                    <span className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase border-2 ${
                      app.status === 'CLEARED' || app.status === 'CERTIFIED'
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                        : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {app.status?.replace('_', ' ') || 'PROCESSING'}
                    </span>
                  </td>

                  <td className="p-6 text-right">
                    <Link 
                      href={`/dashboard/${rolePath}/review/${app.id}`}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg shadow-slate-200 group-hover:-translate-y-1"
                    >
                      <FileSearch className="w-4 h-4" /> Open
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {allApps.length === 0 && (
          <div className="mt-10 p-20 text-center bg-slate-100 rounded-[3rem] border-4 border-dashed border-slate-200">
            <p className="text-slate-400 font-black uppercase italic tracking-[0.3em]">No applications found.</p>
          </div>
        )}
      </div>
    </div>
  );
}