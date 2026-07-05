// app/(dashboard)/ddd/capa/page.tsx
export const dynamic = "force-dynamic";

import { db } from "@/db";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { Clock, CheckCircle2, AlertTriangle, FileText } from "lucide-react";
import { eq, and } from "drizzle-orm";
// These imports will work seamlessly now that capaSubmissions is defined in the schema file
import { capaSubmissions, applications } from "@/db/schema"; 

export default async function DDDCapaPage({
  searchParams,
}: {
  searchParams: Promise<{ as?: string; subtab?: string }>
}) {
  const { as, subtab } = await searchParams;
  const actingDivision = as?.toUpperCase() || "VMD";
  const currentSubtab = subtab || "pending"; 

  // 1. Map UI subtabs directly to your database status states
  let dbStatusCondition = "PENDING_VERIFICATION";
  if (currentSubtab === "passed") dbStatusCondition = "VERIFIED_PASSED";
  if (currentSubtab === "rework") dbStatusCondition = "REJECTED_REWORK";

  // 2. Fetch the data by joining CAPA Submissions with the Master Application Tracking table
  const records = await db
    .select({
      id: capaSubmissions.id,
      applicationId: capaSubmissions.application_id, // Updated to reference database snake_case field
      refNumber: capaSubmissions.ref_number,
      capaItems: capaSubmissions.capa_items,         // Updated to reference database snake_case field
      signatures: capaSubmissions.signatures,
      submittedAt: capaSubmissions.submitted_at,
      capaStatus: capaSubmissions.status,
      // Pulled from master application row
      masterStatus: applications.status,
      companyDetails: applications.details
    })
    .from(capaSubmissions)
    .innerJoin(applications, eq(capaSubmissions.application_id, applications.id))
    .where(
      and(
        eq(capaSubmissions.status, dbStatusCondition)
      )
    );

  return (
    <div>
      {/* Subtabs Navigation */}
      <div className="flex gap-4 mb-6">
        <Link 
          href={`?as=${actingDivision.toLowerCase()}&subtab=pending`} 
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border",
            currentSubtab === 'pending' ? 'bg-amber-600 text-white shadow-lg border-transparent' : 'bg-white text-slate-400 border-slate-200'
          )}
        >
          <Clock className="w-3 h-3" /> Pending Verification
        </Link>
        <Link 
          href={`?as=${actingDivision.toLowerCase()}&subtab=passed`} 
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border",
            currentSubtab === 'passed' ? 'bg-emerald-600 text-white shadow-lg border-transparent' : 'bg-white text-slate-400 border-slate-200'
          )}
        >
          <CheckCircle2 className="w-3 h-3" /> Verified & Passed
        </Link>
        <Link 
          href={`?as=${actingDivision.toLowerCase()}&subtab=rework`} 
          className={cn(
            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center gap-2 transition-all border",
            currentSubtab === 'rework' ? 'bg-rose-600 text-white shadow-lg border-transparent' : 'bg-white text-slate-400 border-slate-200'
          )}
        >
          <AlertTriangle className="w-3 h-3" /> Rework
        </Link>
      </div>

      {/* Rendered Data Workload */}
      <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
        {records.length === 0 ? (
          <div className="p-12 text-center text-xs font-medium text-slate-400 uppercase tracking-wider">
            No CAPA submissions found under this segment.
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[10px] font-black uppercase tracking-widest text-slate-500">
                <th className="px-6 py-4">Ref Number / ID</th>
                <th className="px-6 py-4">Facility / Site</th>
                <th className="px-6 py-4">Deficiencies Logged</th>
                <th className="px-6 py-4">Submission Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {records.map((row) => {
                // Parse your JSON fields safely
                const items = typeof row.capaItems === "string" ? JSON.parse(row.capaItems) : row.capaItems;
                const details = row.companyDetails as any;
                const siteName = details?.savedChecklistSnapshot?.inspected_site_name || "Orange Kalbe Limited";

                return (
                  <tr key={row.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4 font-mono font-bold text-slate-700">
                      {row.refNumber} <br />
                      <span className="text-[10px] font-normal text-slate-400">App ID: #{row.applicationId}</span>
                    </td>
                    <td className="px-6 py-4 font-semibold text-slate-900">
                      {siteName}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2 py-1 rounded-md bg-rose-50 border border-rose-100 font-bold text-rose-700 text-[10px]">
                        {Array.isArray(items) ? items.length : 0} Items Awaiting Review
                      </span>
                    </td>
                    <td className="px-6 py-4 text-slate-500 font-medium">
                      {row.submittedAt ? new Date(row.submittedAt).toLocaleDateString() : "Pending"}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-slate-200 bg-white font-black uppercase tracking-wider text-[10px] hover:bg-slate-50 transition-colors shadow-sm">
                        <FileText className="w-3.5 h-3.5 text-blue-600" /> Review Dossier
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}