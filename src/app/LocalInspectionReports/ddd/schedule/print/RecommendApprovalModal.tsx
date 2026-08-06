"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import BatchHistoryModal, { HistoryEntry } from "@/app/LocalInspectionReports/Director/schedules/BatchHistoryModal";

interface RecommendApprovalModalProps {
  batchId?: string;
  batchReference?: string;
  title?: string;
  startDate: string;
  endDate: string;
  scheduleIds: string[];
  history?: HistoryEntry[] | null | undefined;
  isRework?: boolean;
  userId?: string;
}

export default function RecommendApprovalModal({
  batchId,
  batchReference,
  title,
  startDate,
  endDate,
  scheduleIds,
  history,
  isRework = false,
  userId,
}: RecommendApprovalModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const historyList = Array.isArray(history) ? history : [];
  const latestDirectorRemark = historyList
    .slice()
    .reverse()
    .find((entry) => entry.action === "REWORK");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!batchId) {
      alert("Error: Batch ID is missing. Please select a valid schedule batch.");
      return;
    }

    // Validate UUID format before passing to backend
    const isValidUuid = userId && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/LocalInspectionReports/schedule/director-action", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // Inside handleSubmit in RecommendApprovalModal.tsx
          body: JSON.stringify({
            batchId,
            scheduleIds: scheduleIds || [],
            startDate,
            endDate,
            comments,
            userId: isValidUuid ? userId : null,
            userRole: "Divisional Deputy Director",
            // 💡 Sends RECOMMEND for initial routing, RESUBMIT for rework routing
            action: isRework ? "RESUBMIT" : "RECOMMEND", 
          }),
        });

        const result = await response.json();

        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to submit recommendation.");
        }

        setIsOpen(false);
        setComments("");
        alert(
          isRework
            ? "Reworked schedule batch successfully resubmitted to the Director!"
            : "Inspection schedule batch successfully routed to the Director for Approval!"
        );
        router.refresh();
      } catch (err: any) {
        console.error("Submission Error:", err);
        alert(err.message || "An error occurred while submitting. Please try again.");
      }
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className={`inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold rounded-md shadow-xs transition-colors print:hidden cursor-pointer text-white ${
          isRework ? "bg-amber-600 hover:bg-amber-700 font-bold" : "bg-emerald-700 hover:bg-emerald-800"
        }`}
      >
        <span>{isRework ? "📤" : "✉️"}</span>
        {isRework ? "Resubmit Reworked Batch" : "Recommend for Approval"}
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {isRework && <AlertTriangle className="w-4 h-4 text-amber-600" />}
                {isRework ? "Resubmit Reworked Inspection Schedule" : "Recommend Schedule for Director Approval"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            {isRework && latestDirectorRemark && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs space-y-1">
                <div className="font-bold text-amber-900 flex justify-between items-center">
                  <span>Director's Rework Directive:</span>
                  <span className="text-[10px] font-normal text-amber-700 font-mono">
                    {latestDirectorRemark.timestamp
                      ? new Date(latestDirectorRemark.timestamp).toLocaleDateString("en-GB")
                      : "N/A"}
                  </span>
                </div>
                <p className="text-amber-800 italic bg-white/70 p-2 rounded border border-amber-200/50">
                  "{latestDirectorRemark.comments}"
                </p>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {isRework ? "Divisional Deputy Director Revisions & Minutes Summary:" : "Endorsement Remarks / Minutes to Director:"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    isRework
                      ? "Detail changes made (e.g., 'Replaced Inspector X with Inspector Y per Director directive')."
                      : "e.g., Respectfully submitted for your review and approval for the upcoming week's inspections."
                  }
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-600 text-slate-800"
                />
              </div>

              <div className="flex justify-between items-center pt-2">
                {batchReference && title ? (
                  <BatchHistoryModal
                    batchReference={batchReference}
                    title={title}
                    history={history}
                  />
                ) : (
                  <div />
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setIsOpen(false)}
                    disabled={isPending}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isPending}
                    className={`px-4 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${
                      isRework ? "bg-amber-600 hover:bg-amber-700" : "bg-emerald-700 hover:bg-emerald-800"
                    }`}
                  >
                    {isPending ? "Submitting..." : isRework ? "Confirm & Resubmit" : "Submit Recommendation"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}