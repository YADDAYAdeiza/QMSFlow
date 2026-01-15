import { db } from "@/db";
import { applications, companies, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import AssignToStaffModal from "@/components/AssignToStaffModal";
import { supabase } from "@/lib/supabase";

export default async function DDDInboxPage() {
  // 1. Fetch applications currently sitting at the DDD level
  const inbox = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details,
      status: applications.status,
      companyName: companies.name,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.currentPoint, 'Divisional Deputy Director'));

  // 2. Fetch available Technical Staff (filtering by role/division if needed)
  const staffList = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users)
    // .where(eq(users.role, 'TECHNICAL_OFFICER')); // Adjust based on your schema roles

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
          DDD Assignment Desk
        </h1>
        <p className="text-slate-500 text-sm italic">Queue for Technical Allocation</p>
      </header>
      
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">App #</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Company</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Dossier</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => (
              <tr key={app.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                <td className="p-4 font-mono text-xs font-bold text-blue-600">{app.applicationNumber}</td>
                <td className="p-4 text-sm font-bold text-slate-700">{app.companyName}</td>
                <td className="p-4">
                  {/* View Dossier Logic using the fixed public URL method */}
                  {(() => {
                    const rawUrl = (app.details as any)?.poaUrl || "";
                    const filename = rawUrl.split('/').pop();
                    if (!filename) return <span className="text-[10px] text-slate-300 italic">No File</span>;
                    const { data } = supabase.storage.from('documents').getPublicUrl(filename);
                    return (
                      <a href={data.publicUrl} target="_blank" className="text-[10px] font-black text-slate-400 hover:text-blue-600 uppercase underline decoration-2">
                        Open Doc ↗
                      </a>
                    );
                  })()}
                </td>
                <td className="p-4 text-right">
                  {/* THE MODAL IN ACTION */}
                  <AssignToStaffModal 
                    appId={app.id} 
                    staffList={staffList} 
                  />
                </td>
              </tr>
            ))}
            {inbox.length === 0 && (
              <tr>
                <td colSpan={4} className="p-12 text-center text-slate-400 italic text-sm">
                  Your inbox is currently clear. All dossiers have been assigned.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}