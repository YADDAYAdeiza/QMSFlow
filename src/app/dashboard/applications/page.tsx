import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { desc, eq } from "drizzle-orm";
import Link from "next/link";

export default async function ApplicationsOverview() {
  // Fetch all applications and join with their latest timeline entry
  const allApps = await db.query.applications.findMany({
    orderBy: [desc(applications.id)],
    // You can add 'with' relations here if you set them up in schema
  });

  return (
    <div className="p-8 bg-white min-h-screen">
      <div className="max-w-7xl mx-auto">
        <header className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">MASTER APPLICATION TRACKER</h1>
            <p className="text-slate-500 text-sm">Real-time status of all regulatory dossiers.</p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 px-4 py-2 rounded-lg">
             <span className="text-emerald-700 font-bold text-xs uppercase">System Status: Live</span>
          </div>
        </header>

        <div className="overflow-hidden border-2 border-slate-900 rounded-xl shadow-[8px_8px_0px_0px_rgba(15,23,42,1)]">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-4 text-xs uppercase tracking-widest font-bold">App #</th>
                <th className="p-4 text-xs uppercase tracking-widest font-bold">Company</th>
                <th className="p-4 text-xs uppercase tracking-widest font-bold">Status</th>
                <th className="p-4 text-xs uppercase tracking-widest font-bold text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {allApps.map((app) => (
                <tr key={app.id} className="hover:bg-slate-50 transition-colors">
                  <td className="p-4 font-mono font-bold text-slate-700">#{app.id}</td>
                  <td className="p-4 font-medium text-slate-900">
                    {/* If you have company names in a relation, use that here */}
                    {app.companyId || "General Applicant"}
                  </td>
                  <td className="p-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${
                      app.status === 'CLEARED' 
                        ? 'bg-emerald-100 text-emerald-700 border border-emerald-300' 
                        : 'bg-blue-100 text-blue-700 border border-blue-300'
                    }`}>
                      {app.status || 'PROCESSING'}
                    </span>
                  </td>
                  <td className="p-4 text-right">
                    <Link 
                      href={`/dashboard/director/review/${app.id}`}
                      className="text-xs font-bold text-slate-900 underline decoration-2 underline-offset-4 hover:text-blue-600"
                    >
                      VIEW DOSSIER
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}