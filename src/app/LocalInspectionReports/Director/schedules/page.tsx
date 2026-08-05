import { db } from "@/db";
import { scheduleBatches, users } from "@/db/schema";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";
import { eq, or, and, desc } from "drizzle-orm";
import React from "react";
import Link from "next/link";
import DirectorBatchActionModal from "./DirectorBatchActionModal"; // Client Modal for Approve / Rework Actions
import BatchHistoryModal from "./BatchHistoryModal";

export const dynamic = "force-dynamic";

export default async function DirectorScheduleInboxPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = (await searchParams) || {};
  const activeTab = tab || "pending";

  // 1. Fetch all schedule batches relevant to the Directorate
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
        // Pending Director Review
        and(
          eq(scheduleBatches.currentPoint, inspectionScheduleBatchWorkflow.steps.DIRECTOR_APPROVAL_REVIEW.currentPoint),
          eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL)
        ),
        // Approved
        eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.APPROVED),
        // Rework Tracking
        eq(scheduleBatches.status, inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED)
      )
    )
    .orderBy(desc(scheduleBatches.createdAt));

  // 2. Filter records into Tab groups using workflow constants
  const pendingBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.PENDING_APPROVAL
  );

  const approvedBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.APPROVED
  );

  const reworkBatches = rawBatches.filter(
    (b) => b.status === inspectionScheduleBatchWorkflow.statuses.REWORK_REQUIRED
  );

  // 3. Determine active list
  let currentList = pendingBatches;
  if (activeTab === "approved") currentList = approvedBatches;
  if (activeTab === "rework") currentList = reworkBatches;

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 font-sans">
      <header className="border-b pb-5 border-slate-200">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Directorate Inspection Schedule Approvals
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Review, endorse, or return proposed inspection schedule batches.
        </p>
      </header>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <Link
          href="?tab=pending"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "pending"
              ? "border-blue-600 text-blue-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Pending My Approval ({pendingBatches.length})
        </Link>
        <Link
          href="?tab=rework"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "rework"
              ? "border-amber-600 text-amber-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Out for Rework ({reworkBatches.length})
        </Link>
        <Link
          href="?tab=approved"
          className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors ${
            activeTab === "approved"
              ? "border-emerald-600 text-emerald-600 font-semibold"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Approved Logs ({approvedBatches.length})
        </Link>
      </div>

      {/* Table Display */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No schedule batches found matching this filter.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500">
                  <th className="p-4">Batch Ref</th>
                  <th className="p-4">Schedule Title</th>
                  <th className="p-4">Date Range</th>
                  <th className="p-4">Endorsed By (Head IRSD)</th>
                  <th className="p-4">Status</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm">
                {currentList.map((batch) => (
                  <tr key={batch.id} className="hover:bg-slate-50/50">
                    <td className="p-4 font-mono font-medium text-slate-900">
                      {batch.batchReference}
                    </td>
                    <td className="p-4 font-semibold text-slate-800">{batch.title}</td>
                    <td className="p-4 text-slate-600">
                      {batch.startDate} to {batch.endDate}
                    </td>
                    <td className="p-4 text-slate-600">
                      {batch.endorsedByName || "Pharm (Mrs.) Uba Florence"}
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
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* Link to view print preview sheet */}
                      <Link
                        href={`/LocalInspectionReports/ddd/schedule/print?startDate=${batch.startDate}&endDate=${batch.endDate}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 inline-flex items-center gap-1"
                      >
                        👁️ Preview Sheet
                      </Link>

                      {/* Modal for Director to Approve or Request Rework */}
                      {activeTab === "pending" && (
                        <DirectorBatchActionModal batchId={batch.id} title={batch.title} />
                      )}
                    </td>
                    <td className="p-4 text-right space-x-2 whitespace-nowrap">
                      {/* Link to view print preview sheet */}
                      <Link
                        href={`/LocalInspectionReports/ddd/schedule/print?startDate=${batch.startDate}&endDate=${batch.endDate}`}
                        target="_blank"
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 inline-flex items-center gap-1"
                      >
                        👁️ Preview Sheet
                      </Link>

                      {/* History & Minutes Modal */}
                      <BatchHistoryModal
                        batchReference={batch.batchReference}
                        title={batch.title}
                        history={batch.history as any}
                      />

                      {/* Modal for Director to Approve or Request Rework */}
                      {activeTab === "pending" && (
                        <DirectorBatchActionModal batchId={batch.id} title={batch.title} />
                      )}
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