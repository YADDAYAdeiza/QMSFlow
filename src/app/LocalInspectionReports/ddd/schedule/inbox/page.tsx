import { db } from "@/db";
import { scheduleBatches, users } from "@/db/schema";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";
import { eq, or, and, desc } from "drizzle-orm";
import React from "react";
import Link from "next/link";
// import BatchHistoryModal from "./BatchHistoryModal";
import { AlertTriangle, CheckCircle, Clock, Edit3, Eye } from "lucide-react";
import BatchHistoryModal from "@/app/LocalInspectionReports/Director/schedules/BatchHistoryModal";

export const dynamic = "force-dynamic";

export default async function DivisionalDeputyDirectorScheduleInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) || {};
  const activeTab = tab || "rework"; // Default focus to Rework for quick action

  // Fetch batches relevant to Divisional Deputy Director (IRSD) routing
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
    })
    .from(scheduleBatches)
    .leftJoin(users, eq(scheduleBatches.endorsedBy, users.id))
    .where(
      or(
        // Rework Required (Returned by Director)
        eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED),
        // Pending Director Review
        eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL),
        // Approved Logs
        eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.APPROVED)
      )
    )
    .orderBy(desc(scheduleBatches.createdAt));

  const reworkBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED
  );
  const pendingBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL
  );
  const approvedBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.APPROVED
  );

  let currentList = reworkBatches;
  if (activeTab === "pending") currentList = pendingBatches;
  if (activeTab === "approved") currentList = approvedBatches;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <header className="border-b pb-5 border-slate-200 flex justify-between items-end">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            IRSD Inspection Schedule Management
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Track, revise, and resubmit batch inspection schedules for Directorate endorsement.
          </p>
        </div>
        <Link
          href="/LocalInspectionReports/ddd/schedule/print"
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-xs inline-flex items-center gap-1.5 transition-colors"
        >
          <Edit3 className="w-4 h-4" />
          Create / Draft New Schedule
        </Link>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <Link
          href="?tab=rework"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "rework"
              ? "border-amber-600 text-amber-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-500" />
          Returned for Rework ({reworkBatches.length})
        </Link>
        <Link
          href="?tab=pending"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <Clock className="w-4 h-4 text-blue-500" />
          Pending Director Review ({pendingBatches.length})
        </Link>
        <Link
          href="?tab=approved"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
            activeTab === "approved"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          <CheckCircle className="w-4 h-4 text-emerald-500" />
          Director Approved ({approvedBatches.length})
        </Link>
      </div>

      {/* Rework Alert Header Banner */}
      {activeTab === "rework" && reworkBatches.length > 0 && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold">Attention Required:</span> The Director has returned one or more schedule batches with notes. Click <strong>"Open & Modify Schedule"</strong> to adjust assignments or dates and re-recommend for approval.
          </div>
        </div>
      )}

      {/* Table Display */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No schedule batches found matching this criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="p-4">Batch Ref</th>
                  <th className="p-4">Schedule Title</th>
                  <th className="p-4">Current Desk / Status</th>
                  <th className="p-4">Latest Director Notes</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {currentList.map((batch) => {
                  // Extract latest rework comment if available
                  const historyArr = (batch.history as any[]) || [];
                  const lastReworkNote = historyArr
                    .slice()
                    .reverse()
                    .find((h) => h.action === "RETURNED_FOR_REWORK")?.comment;

                  return (
                    <tr key={batch.id} className="hover:bg-slate-50/50">
                      <td className="p-4 font-mono font-medium text-slate-900">
                        {batch.batchReference}
                      </td>
                      <td className="p-4 font-semibold text-slate-800">
                        <div>{batch.title}</div>
                        <div className="text-xs font-normal text-slate-500">
                          {batch.startDate} to {batch.endDate}
                        </div>
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                            batch.status === inspectionScheduleBatchWorkflow.statuses.APPROVED
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : batch.status === inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-blue-50 text-blue-700 border-blue-200"
                          }`}
                        >
                          {batch.status}
                        </span>
                      </td>
                      <td className="p-4 max-w-xs text-xs text-slate-600 truncate">
                        {lastReworkNote ? (
                          <span className="italic text-amber-900 font-medium bg-amber-50 px-2 py-1 rounded border border-amber-200 block truncate">
                            "{lastReworkNote}"
                          </span>
                        ) : (
                          <span className="text-slate-400">None</span>
                        )}
                      </td>
                      <td className="p-4 text-right space-x-2 whitespace-nowrap">
                        {/* History Modal */}
                        <BatchHistoryModal
                          batchReference={batch.batchReference}
                          title={batch.title}
                          history={batch.history as any}
                        />

                        {/* Action Link based on Status */}
                        {batch.status === inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED ? (
                          <Link
                            href={`/LocalInspectionReports/ddd/schedule/print?startDate=${batch.startDate}&endDate=${batch.endDate}`}
                            className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-md shadow-xs inline-flex items-center gap-1.5 transition-colors"
                          >
                            <Edit3 className="w-3.5 h-3.5" /> Modify & Resubmit
                          </Link>
                        ) : (
                          <Link
                            href={`/LocalInspectionReports/ddd/schedule/print?startDate=${batch.startDate}&endDate=${batch.endDate}&readOnly=true`}
                            target="_blank"
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 inline-flex items-center gap-1"
                          >
                            <Eye className="w-3.5 h-3.5" /> View Sheet
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}