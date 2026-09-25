// src/app/LocalInspectionReports/page.tsx
import Link from "next/link";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

export default async function LocalInspectionReportsPage() {
  const cookieStore = await cookies();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // The `setAll` method was called from a Server Component.
          }
        },
      },
    }
  );

  // Get authenticated user session
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  let userRecord = null;

  if (authUser) {
    const { data } = await supabase
      .from("users")
      .select("id, name, role, division, directorate")
      .eq("id", authUser.id)
      .single();

    userRecord = data;
  }

  // Access control & dynamic routing checks
  const isDDD = userRecord?.role === "Divisional Deputy Director";
  const isDirector = userRecord?.role === "Director";

  let schedulesHref: string | null = null;
  if (isDDD) {
    schedulesHref = "/LocalInspectionReports/ddd/schedule/inbox";
  } else if (isDirector) {
    schedulesHref = "/LocalInspectionReports/Director/schedules";
  }

  const isLOD =
    userRecord?.division === "LOD" ||
    userRecord?.role === "LOD" ||
    userRecord?.directorate === "LOD";

  return (
    <div className="min-h-screen bg-slate-50/50 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto space-y-8">
        {/* Header Section with User Context */}
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-6">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-blue-100 text-blue-700">
                Personal Inspector Workspace
              </span>
              {userRecord?.division && (
                <>
                  <span className="text-slate-300">|</span>
                  <span className="text-xs font-semibold text-slate-500">
                    {userRecord.division} Division
                  </span>
                </>
              )}
            </div>
            <h1 className="text-3xl font-black tracking-tight text-slate-900 uppercase italic">
              Local Inspection Hub
            </h1>
            <p className="text-xs text-slate-600">
              Personal performance benchmarks, workload queue, and inspection
              routing management.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold uppercase tracking-wider transition-all shadow-sm">
              + New Inspection Log
            </button>
          </div>
        </header>

        {/* 1. User KPI & Performance Benchmarks */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            My Performance Metrics (Q3)
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Assigned Reviews</span>
                <span className="text-blue-600">📋</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">07</div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                4 Pending Site Visits
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>Avg Turnaround Time</span>
                <span className="text-amber-500">⏱️</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                3.4 Days
              </div>
              <p className="text-[11px] font-medium text-emerald-600 mt-1">
                ↓ 12% faster than agency SLA
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>CAPA Clearances</span>
                <span className="text-emerald-500">✅</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">18</div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Resolved this month
              </p>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase">
                <span>QMS Rating</span>
                <span className="text-indigo-500">⭐</span>
              </div>
              <div className="text-2xl font-black text-slate-900 mt-2">
                98.5%
              </div>
              <p className="text-[11px] font-medium text-slate-500 mt-1">
                Compliance score
              </p>
            </div>
          </div>
        </section>

        {/* 2. Direct Sub-Folder Navigation Cards */}
        <section className="space-y-3">
          <h2 className="text-xs font-black uppercase tracking-widest text-slate-400">
            Module Workspaces
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            {/* My Inspections Inbox */}
            <Link
              href="/LocalInspectionReports/Inspectors/Inbox"
              className="group bg-white border border-slate-200 hover:border-blue-500 rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-10 w-10 bg-blue-50 group-hover:bg-blue-600 group-hover:text-white text-blue-600 rounded-lg flex items-center justify-center font-bold text-lg transition-colors">
                  📥
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  My Inspections Inbox
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Conduct site inspections, author detailed field findings, and
                  forward technical reports.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 group-hover:text-blue-600">
                  Open Module
                </span>
                <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>

            {/* LOD Role: New Requested Applications -> Points to seed */}
            {isLOD && (
              <Link
                href="/LocalInspectionReports/seed"
                className="group bg-white border border-purple-200 hover:border-purple-500 rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between bg-gradient-to-b from-purple-50/30 to-white"
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="h-10 w-10 bg-purple-100 group-hover:bg-purple-600 group-hover:text-white text-purple-700 rounded-lg flex items-center justify-center font-bold text-lg transition-colors">
                      🌱
                    </div>
                    <span className="text-[10px] font-black uppercase tracking-wider bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                      LOD Workspace
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-purple-700 transition-colors">
                    New Requested Applications
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Seed, log, and ingest incoming inspection requests from external applicants and regional hubs.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-purple-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-purple-700 group-hover:text-purple-900">
                    Open Ingestion Pipeline
                  </span>
                  <span className="text-xs text-purple-400 group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </div>
              </Link>
            )}

            {/* Inspection Schedules -> Dynamic target based on DDD vs Director role */}
            {schedulesHref && (
              <Link
                href={schedulesHref}
                className="group bg-white border border-slate-200 hover:border-indigo-500 rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  <div className="h-10 w-10 bg-indigo-50 group-hover:bg-indigo-600 group-hover:text-white text-indigo-600 rounded-lg flex items-center justify-center font-bold text-lg transition-colors">
                    📅
                  </div>
                  <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                    Inspection Schedules
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    View, create, and forward upcoming facility inspection
                    timetables for executive approval.
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-700 group-hover:text-indigo-600">
                    Open Module
                  </span>
                  <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">
                    &rarr;
                  </span>
                </div>
              </Link>
            )}

            {/* CAPA Management */}
            <Link
              href="/LocalInspectionReports/test-capa"
              className="group bg-white border border-slate-200 hover:border-amber-500 rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-10 w-10 bg-amber-50 group-hover:bg-amber-600 group-hover:text-white text-amber-600 rounded-lg flex items-center justify-center font-bold text-lg transition-colors">
                  ⚠️
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-amber-600 transition-colors">
                  CAPA Management
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Review logged deficiencies, issue directive letters, and track
                  corrective action plans.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 group-hover:text-amber-600">
                  Open Module
                </span>
                <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>

            {/* Final Clearances & Archive */}
            <Link
              href="/LocalInspectionReports/applicant"
              className="group bg-white border border-slate-200 hover:border-emerald-500 rounded-xl p-6 shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="h-10 w-10 bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white text-emerald-600 rounded-lg flex items-center justify-center font-bold text-lg transition-colors">
                  🛡️
                </div>
                <h3 className="text-base font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Final Clearances & Archive
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Access sign-off reports, GMP certificates, and archived local
                  site inspection history.
                </p>
              </div>
              <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-700 group-hover:text-emerald-600">
                  Open Module
                </span>
                <span className="text-xs text-slate-400 group-hover:translate-x-1 transition-transform">
                  &rarr;
                </span>
              </div>
            </Link>
          </div>
        </section>

        {/* 3. Active Work Queue Table */}
        <section className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden space-y-0">
          <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                Active Work Queue
              </h2>
              <p className="text-xs text-slate-500">
                Inspection files pending your action or review
              </p>
            </div>
            <span className="px-2.5 py-1 bg-slate-100 text-slate-700 font-bold text-[11px] rounded-full">
              3 Tasks Requiring Action
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 text-[10px] font-black uppercase text-slate-400 border-b border-slate-200">
                  <th className="py-3 px-6">App ID</th>
                  <th className="py-3 px-6">Company / Facility</th>
                  <th className="py-3 px-6">Stage</th>
                  <th className="py-3 px-6">SLA Status</th>
                  <th className="py-3 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    #APP-2026-8801
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    Apex Veterinary Biologicals Ltd.
                    <span className="block text-[10px] text-slate-400">
                      Vaccine Production Line A
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                      CAPA Review Pending
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">
                    2 Days Left
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      Review File &rarr;
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    #APP-2026-9042
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    BioVet Pharma Manufacturing
                    <span className="block text-[10px] text-slate-400">
                      Oral Liquids & Suspensions
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-800">
                      Report Sign-Off
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">
                    Due Today
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      Sign Off &rarr;
                    </button>
                  </td>
                </tr>

                <tr className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-4 px-6 font-bold text-slate-900">
                    #APP-2026-7739
                  </td>
                  <td className="py-4 px-6 font-medium text-slate-800">
                    GrandCare Veterinary Feeds
                    <span className="block text-[10px] text-slate-400">
                      Premix & Additive Site
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                      Clearance Ready
                    </span>
                  </td>
                  <td className="py-4 px-6 text-slate-500 font-medium">
                    On Schedule
                  </td>
                  <td className="py-4 px-6 text-right">
                    <button className="text-xs font-bold text-blue-600 hover:text-blue-800">
                      Generate Certificate &rarr;
                    </button>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}