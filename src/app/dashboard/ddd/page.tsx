import { db } from "@/db";
import { applications, companies, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import AssignToStaffModal from "@/components/AssignToStaffModal";
import DossierLink from "@/components/DossierLink"; // Using the component we built
import { MessageSquare, User } from "lucide-react";

export default async function DDDInboxPage() {
  // 1. Fetch applications for Divisional Deputy Director
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

  // 2. Fetch Technical Staff
  const staffList = await db
    .select({
      id: users.id,
      name: users.name,
    })
    .from(users);

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <header className="mb-8">
        <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">
          Divisional Deputy Director Desk
        </h1>
        <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
          Technical Allocation & Review Queue
        </p>
      </header>
      
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">App #</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Details</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest">Director's Minute</th>
              <th className="p-4 text-[10px] font-black uppercase tracking-widest text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => {
              const details = (app.details as any) || {};
              const comments = details.comments || [];
              
              // Find the last comment from the Director
              const directorNote = [...comments]
                .reverse()
                .find(c => c.role === 'Director')?.text || "No specific instructions";

              return (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-4 align-top">
                    <p className="font-mono text-sm font-bold text-blue-600">#{app.applicationNumber}</p>
                    <p className="text-[10px] font-black text-slate-400 uppercase mt-1">{app.companyName}</p>
                  </td>
                  
                  <td className="p-4 align-top">
                    <div className="flex flex-col gap-2">
                       <DossierLink url={details.poaUrl || details.inspectionReportUrl} />
                       <span className="text-[9px] font-bold text-slate-400 italic">
                         Divisions: {details.assignedDivisions?.join(", ")}
                       </span>
                    </div>
                  </td>

                  <td className="p-4 align-top max-w-xs">
                    <div className="flex gap-2 items-start bg-slate-50 p-3 rounded-lg border border-slate-100">
                      <MessageSquare className="w-3 h-3 text-blue-500 mt-1 flex-shrink-0" />
                      <p className="text-[11px] text-slate-600 italic leading-relaxed">
                        "{directorNote}"
                      </p>
                    </div>
                  </td>

                  <td className="p-4 text-right align-top">
                    <AssignToStaffModal 
                      appId={app.id} 
                      staffList={staffList} 
                    />
                  </td>
                </tr>
              );
            })}
            
            {inbox.length === 0 && (
              <tr>
                <td colSpan={4} className="p-20 text-center">
                   <div className="flex flex-col items-center gap-2">
                     <User className="w-8 h-8 text-slate-200" />
                     <p className="text-slate-400 font-bold uppercase text-[10px] tracking-widest">Inbox Zero • No pending assignments</p>
                   </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}