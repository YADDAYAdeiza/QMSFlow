"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Send, RotateCcw, AlertCircle, CheckCircle2, X } from "lucide-react";

interface PRSBatchActionModalProps {
  batchId: string;
  title: string;
  currentStepKey: string;
}

export default function PRSBatchActionModal({
  batchId,
  title,
  currentStepKey,
}: PRSBatchActionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<"FORWARD_TO_DG" | "REWORK">("FORWARD_TO_DG");
  const [comments, setComments] = useState("");
  const [workloadVerified, setWorkloadVerified] = useState(true);
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const handleOpen = (type: "FORWARD_TO_DG" | "REWORK") => {
    setActionType(type);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/LocalInspectionReports/PRS/schedule/prs-action",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batchId,
              action: actionType,
              comments,
              workloadVerified,
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to process PRS action.");
        }

        setIsOpen(false);
        setComments("");
        alert(
          actionType === "FORWARD_TO_DG"
            ? "Foreign inspection schedule statistically verified and FORWARDED to the DG for express clearance!"
            : "Schedule batch returned to Divisional Deputy Director (IRSD) for workload/team revision."
        );
        router.refresh();
      } catch (err: any) {
        console.error(err);
        alert(err.message || "An error occurred while processing action.");
      }
    });
  };

  return (
    <>
      <div className="inline-flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => handleOpen("FORWARD_TO_DG")}
          className="px-3 py-1.5 bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <Send className="w-3.5 h-3.5" /> Forward to DG for Approval
        </button>

        <button
          type="button"
          onClick={() => handleOpen("REWORK")}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
        >
          <RotateCcw className="w-3.5 h-3.5" /> Request Rework
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                {actionType === "FORWARD_TO_DG" ? (
                  <>
                    <CheckCircle2 className="w-5 h-5 text-indigo-600" />
                    PRS Statistical Clearance & DG Briefing
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-5 h-5 text-amber-600" />
                    Return Schedule for Rework
                  </>
                )}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">Target Schedule: </span>
              {title}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {actionType === "FORWARD_TO_DG" && (
                <div className="bg-indigo-50 border border-indigo-200 p-3 rounded-lg space-y-2">
                  <label className="flex items-center gap-2 text-xs font-semibold text-indigo-900 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={workloadVerified}
                      onChange={(e) => setWorkloadVerified(e.target.checked)}
                      className="rounded text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>I certify that staff workload equity & qualifications have been verified.</span>
                  </label>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionType === "FORWARD_TO_DG"
                    ? "Statistical Remarks & Executive Briefing Notes for DG:"
                    : "Rework Directives & Specific Workload Adjustments Needed:"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === "FORWARD_TO_DG"
                      ? "e.g., Verified: Workload distribution is equitable across teams. No inspector double-bookings. Statistically sound for DG clearance."
                      : "e.g., Team Leader for Row 1 is already assigned to another foreign trip during this period. Please reallocate."
                  }
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-800 text-slate-800"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
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
                  disabled={isPending || (actionType === "FORWARD_TO_DG" && !workloadVerified)}
                  className={`px-4 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer disabled:opacity-50 ${
                    actionType === "FORWARD_TO_DG"
                      ? "bg-indigo-700 hover:bg-indigo-800"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isPending
                    ? "Processing..."
                    : actionType === "FORWARD_TO_DG"
                    ? "Submit to DG"
                    : "Send for Rework"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}