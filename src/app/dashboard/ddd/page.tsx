import { db } from "@/db";
import { applications, companies, users } from "@/db/schema";
import { eq, and, or, sql } from "drizzle-orm";
import DossierLink from "@/components/DossierLink";
import { MessageSquare, User, ArrowRightCircle, ShieldCheck, Activity } from "lucide-react";
import Link from "next/link";

export default async function DDDInboxPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ as?: string }> 
}) {
  const { as } = await searchParams;
  
  // 1. Identification for Testing Switcher
  const actingDivision = as?.toUpperCase() || "VMD";
  
  const userMap: Record<string, string> = {
    VMD: "9215bf99-489e-4468-b9aa-bcd926d11c08",
    IRSD: "cfb8ccbd-7753-43f0-aa51-a9c449a52de6",
    PAD: "da0e45e5-cf4e-49b7-b22e-34e313df899d",
    AFPD: "e6be1703-3075-4e5c-b07f-8a6f166f74c6"
  };

  const loggedInUserId = userMap[actingDivision];

  // 2. Fetch Inbox with Dual-Role Hub Logic
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
    .where(and(
      // The Core Filter
      actingDivision === "IRSD" 
        ? // IRSD sees: Files for Clearance OR Technical work minuted to them
          or(
            eq(applications.currentPoint, 'IRSD Hub Clearance'),
            and(
              eq(applications.currentPoint, 'Technical DD Review'),
              sql`${applications.details}->'assignedDivisions' ? 'IRSD'`
            )
          )
        : // Technical DDs (VMD, etc) only see Technical Point for their division
          and(
            eq(applications.currentPoint, 'Technical DD Review'),
            sql`${applications.details}->'assignedDivisions' ? ${actingDivision}`
          )
    ));

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      {/* TESTING SWITCHER OVERLAY */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 bg-slate-900 text-white px-6 py-3 rounded-full shadow-2xl flex items-center gap-4 border border-slate-700">
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-400">Switch Desk:</span>
        {Object.keys(userMap).map((div) => (
          <Link 
            key={div}
            href={`?as=${div.toLowerCase()}`}
            className={`px-4 py-1 rounded-full text-[10px] font-bold transition-all ${actingDivision === div ? 'bg-blue-600 text-white' : 'hover:bg-slate-800 text-slate-400'}`}
          >
            {div}
          </Link>
        ))}
      </div>

      <header className="mb-8 flex justify-between items-end">
        <div>
          <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic">
            {actingDivision} Divisional Deputy Director
          </h1>
          <p className="text-slate-500 text-xs font-bold uppercase tracking-widest">
            {actingDivision === "IRSD" ? "Agency Recommendation Hub & Technical Queue" : "Technical Review Queue"}
          </p>
        </div>
      </header>
      
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Dossier / Company</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Point Type</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-slate-300">Latest Instruction</th>
              <th className="p-6 text-[10px] font-black uppercase tracking-widest text-right text-slate-300">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => {
              const details = (app.details as any) || {};
              const lastComment = [...(details.comments || [])].reverse()[0];
              
              const isHubPoint = app.currentPoint === 'IRSD Hub Clearance';

              return (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors border-b border-slate-100">
                  <td className="p-6">
                    <p className="font-mono text-sm font-bold text-blue-600">#{app.applicationNumber}</p>
                    <p className="text-[11px] font-black text-slate-800 uppercase mt-1 tracking-tight">{app.companyName}</p>
                  </td>

                  <td className="p-6">
                    {isHubPoint ? (
                      <span className="bg-emerald-100 text-emerald-700 text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit">
                        <ShieldCheck className="w-3 h-3" /> Hub Clearance
                      </span>
                    ) : (
                      <span className="bg-blue-100 text-blue-700 text-[8px] font-black px-2 py-1 rounded uppercase flex items-center gap-1 w-fit">
                        <Activity className="w-3 h-3" /> Technical Review
                      </span>
                    )}
                  </td>
                  
                  <td className="p-6">
                    <div className="flex flex-col gap-2 max-w-md">
                       <DossierLink url={details.inspectionReportUrl || details.poaUrl} />
                       <div className="flex gap-2 items-start bg-slate-50 p-3 rounded-xl border border-slate-100">
                          <MessageSquare className="w-3 h-3 text-slate-400 mt-1" />
                          <p className="text-[10px] text-slate-600 italic leading-snug line-clamp-2">
                            {lastComment?.text || "Processing..."}
                          </p>
                       </div>
                    </div>
                  </td>

                  <td className="p-6 text-right">
                    <Link 
                      href={`/dashboard/ddd/review/${app.id}?as=${actingDivision.toLowerCase()}`}
                      className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-full text-[10px] font-black uppercase hover:bg-blue-600 transition-all shadow-md"
                    >
                      Process Dossier <ArrowRightCircle className="w-4 h-4" />
                    </Link>
                  </td>
                </tr>
              );
            })}
            
            {inbox.length === 0 && (
              <tr>
                <td colSpan={4} className="p-32 text-center text-slate-400 italic">
                  No dossiers currently at this desk.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}