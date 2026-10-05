import React from "react";
import { createClient } from "@/utils/supabase/server";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { applications } from "@/db/schema";
import { or, eq, sql } from "drizzle-orm";

interface PageProps {
  searchParams: Promise<{ tab?: string }>;
}

export default async function DirectorInboxPage({ searchParams }: PageProps) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const resolvedParams = await searchParams;
  const activeTab = resolvedParams.tab === "finalized" ? "FINALIZED" : "PENDING";

  // Server-side fetch for all relevant Director applications
  const allDirectorApplications = await db.query.applications.findMany({
    where: or(
      // Pending Director Sign-Off
      eq(applications.currentPoint, "Director Final Approval & Sign-Off"),
      eq(applications.status, "PENDING_FINAL_SIGN_OFF"),

      // Finalized & Certified Desk Points
      eq(applications.currentPoint, "Applicant Notification Hub - Final Approval Certified"),
      eq(applications.currentPoint, "Applicant Notification Hub - CAPA Request Issued"),
      eq(applications.currentPoint, "Report Approved and Archived"),

      // Status & Workflow Meta matches
      eq(applications.status, "APPROVED_AND_ARCHIVED"),
      eq(applications.status, "APPROVED"),
      eq(applications.status, "AWAITING_CAPA"),
      sql`${applications.details}->'inspectionWorkflowMeta'->>'currentStepKey' = 'FINALIZED'`
    )
  });

  // Filter 1: Pending Sign-Off Items
  const pendingItems = allDirectorApplications.filter((item: any) => {
    const stepKey = item.details?.inspectionWorkflowMeta?.currentStepKey;
    const currentPoint = item.currentPoint || item.current_point;

    return (
      stepKey === "DIRECTOR_FINAL_SIGN_OFF" ||
      item.status === "PENDING_FINAL_SIGN_OFF" ||
      currentPoint === "Director Final Approval & Sign-Off"
    );
  });

  // Filter 2: Finalized / Approved / CAPA Issued Items
  const finalizedItems = allDirectorApplications.filter((item: any) => {
    const stepKey = item.details?.inspectionWorkflowMeta?.currentStepKey;
    const currentPoint = item.currentPoint || item.current_point;

    return (
      stepKey === "FINALIZED" ||
      currentPoint === "Applicant Notification Hub - Final Approval Certified" ||
      currentPoint === "Applicant Notification Hub - CAPA Request Issued" ||
      currentPoint === "Report Approved and Archived" ||
      item.status === "APPROVED_AND_ARCHIVED" ||
      item.status === "APPROVED" ||
      item.status === "AWAITING_CAPA"
    );
  });

  const displayedItems = activeTab === "PENDING" ? pendingItems : finalizedItems;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header & URL-driven Navigation Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6">
        <div className="flex items-center gap-6">
          <a
            href="?tab=pending"
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "PENDING"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>📥</span> Pending Sign-Off
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono">
              {pendingItems.length}
            </span>
          </a>

          <a
            href="?tab=finalized"
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "FINALIZED"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>🗄️</span> Finalized & Archived
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-mono">
              {finalizedItems.length}
            </span>
          </a>
        </div>
      </div>

      {/* Item Listing */}
      {displayedItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl mx-auto mb-3">
            {activeTab === "PENDING" ? "📥" : "🗄️"}
          </div>
          <p className="text-sm font-bold text-slate-700">
            No dossiers found under {activeTab === "PENDING" ? "Pending Sign-Off" : "Finalized & Archived"}.
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Applications will automatically appear here as they are routed across custody desks.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((app: any) => {
            const currentDesk = app.currentPoint || app.current_point;
            return (
              <div
                key={app.id}
                className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col sm:flex-row justify-between sm:items-center gap-4"
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-mono text-xs text-slate-400 font-bold">#{app.id}</span>
                    <h4 className="font-bold text-slate-800 text-sm">
                      {app.companyName || app.company_name || `Application #${app.id}`}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-500">
                    Current Desk: <span className="font-semibold text-slate-700">{currentDesk}</span> • Status: <span className="font-mono text-emerald-700 font-bold">{app.status}</span>
                  </p>
                </div>

                <a
                  href={`/LocalInspectionReports/${app.id}`}
                  className="inline-flex items-center justify-center px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition-all shadow-sm shrink-0"
                >
                  Approval ➔
                </a>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}