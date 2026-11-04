// @/app/LocalInspectionReports/PRS/schedule/inbox/page.tsx
import { db } from "@/db";
import { scheduleBatches, users } from "@/db/schema";
import { prsInspectionWorkflow } from "@/config/workflows/prsInspectionWorkflow";
import { eq, or, desc } from "drizzle-orm";
import React from "react";
import Link from "next/link";
import { BarChart3, Users, FileText, ArrowRight } from "lucide-react";

export const dynamic = "force-dynamic";

export default async function PRSScheduleInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) || {};
  const activeTab = tab || "incoming";

  // Query batches currently sitting at PRS stages
  const rawBatches = await db
    .select({
      id: scheduleBatches.id,
      batchReference: scheduleBatches.batchReference,
      title: scheduleBatches.title,
      startDate: scheduleBatches.startDate,
      endDate: scheduleBatches.endDate,
      status: scheduleBatches.status,
      currentPoint: scheduleBatches.currentPoint,
      history: scheduleBatches.history,
      createdAt: scheduleBatches.createdAt,
      endorsedByName: users.name,
      isForeign: scheduleBatches.isForeign,
    })
    .from(scheduleBatches)
    .leftJoin(users, eq(scheduleBatches.endorsedBy, users.id))
    .where(
      or(
        eq(scheduleBatches.currentPoint, prsInspectionWorkflow.steps.PRS_SCHEDULE.currentPoint),
        eq(scheduleBatches.currentPoint, prsInspectionWorkflow.steps.PRS_REVIEW.currentPoint),
        eq(scheduleBatches.currentPoint, prsInspectionWorkflow.steps.DG_SCHEDULE.currentPoint)
      )
    )
    .orderBy(desc(scheduleBatches.createdAt));

  // Filter lists by workflow tabs
  const incomingBatches = rawBatches.filter(
    (b) => b.currentPoint === prsInspectionWorkflow.steps.PRS_SCHEDULE.currentPoint
  );
  const underReviewBatches = rawBatches.filter(
    (b) => b.currentPoint === prsInspectionWorkflow.steps.PRS_REVIEW.currentPoint
  );
  const dgPendingBatches = rawBatches.filter(
    (b) => b.currentPoint === prsInspectionWorkflow.steps.DG_SCHEDULE.currentPoint
  );

  let currentList = incomingBatches;
  if (activeTab === "review") currentList = underReviewBatches;
  if (activeTab === "dg_pending") currentList = dgPendingBatches;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      {/* Header Banner */}
      <header className="border-b pb-5 border-slate-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 mb-2 border border-indigo-200">
            📊 Planning, Research & Statistics (PRS) Division
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Foreign Inspection Schedule Intelligence & Verification Hub
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Analyze staff equity, verify training competencies, check double-booking conflicts, and generate statistical briefing packets for the DG.
          </p>
        </div>

        {/* Quick Statistical Summary Indicator Box */}
        <div className="bg-slate-900 text-white p-3.5 rounded-xl flex items-center gap-4 shadow-sm">
          <div className="p-2.5 bg-slate-800 rounded-lg text-indigo-400">
            <BarChart3 className="w-5 h-5" />
          </div>
          <div>
            <p className="text-[10px] uppercase font-bold text-slate-400">Active Pipeline</p>
            <p className="text-lg font-extrabold text-white">{rawBatches.length} Batches Under Review</p>
          </div>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 flex-wrap">
        <Link
          href="?tab=incoming"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "incoming"
              ? "border-indigo-600 text-indigo-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <FileText className="w-4 h-4" /> Incoming PRS Scheduling ({incomingBatches.length})
        </Link>
        <Link
          href="?tab=review"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "review"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Users className="w-4 h-4" /> Under Director PRS Review ({underReviewBatches.length})
        </Link>
        <Link
          href="?tab=dg_pending"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "dg_pending"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <span>⭐</span> Forwarded to DG for Approval ({dgPendingBatches.length})
        </Link>
      </div>

      {/* Batches Table View */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm italic">
            No schedule batches found in this category.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <th className="p-4">Batch Reference</th>
                  <th className="p-4">Schedule Title / Period</th>
                  <th className="p-4">Originating Endorsement</th>
                  <th className="p-4">Current Milestone Status</th>
                  <th className="p-4 text-right">PRS Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {currentList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-bold text-slate-900">
                      {batch.batchReference}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">
                      <div>{batch.title}</div>
                      <div className="text-xs font-normal text-slate-500 mt-0.5 font-mono">
                        {batch.startDate} to {batch.endDate}
                      </div>
                    </td>
                    <td className="p-4 text-slate-600">
                      {batch.endorsedByName || "VMAP Directorate"}
                    </td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                        📍 {batch.currentPoint}
                      </span>
                    </td>
                    <td className="p-4 text-right whitespace-nowrap">
                      <Link
                        href={`/LocalInspectionReports/PRS/schedules/batch/${batch.id}`}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-all"
                      >
                        Open PRS Audit & Analytics Workspace <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}