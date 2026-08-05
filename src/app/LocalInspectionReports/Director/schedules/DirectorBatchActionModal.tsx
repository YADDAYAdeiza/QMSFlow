"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

interface DirectorBatchActionModalProps {
  batchId: string;
  title: string;
}

export default function DirectorBatchActionModal({
  batchId,
  title,
}: DirectorBatchActionModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [actionType, setActionType] = useState<"APPROVE" | "REWORK">("APPROVE");
  const [comments, setComments] = useState("");
  const [isPending, startTransition] = useTransition();

  const router = useRouter();

  const handleOpen = (type: "APPROVE" | "REWORK") => {
    setActionType(type);
    setIsOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    startTransition(async () => {
      try {
        const response = await fetch(
          "/api/LocalInspectionReports/schedule/director-action",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              batchId,
              action: actionType,
              comments,
            }),
          }
        );

        if (!response.ok) {
          const errData = await response.json();
          throw new Error(errData.error || "Failed to process workflow action.");
        }

        setIsOpen(false);
        setComments("");
        alert(
          actionType === "APPROVE"
            ? "Inspection schedule batch successfully APPROVED and finalized!"
            : "Schedule batch returned to Divisional Deputy Director (Head IRSD) for rework."
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
        {/* Approve Button */}
        <button
          type="button"
          onClick={() => handleOpen("APPROVE")}
          className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
        >
          ✓ Approve
        </button>

        {/* Request Rework Button */}
        <button
          type="button"
          onClick={() => handleOpen("REWORK")}
          className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
        >
          ↩ Request Rework
        </button>
      </div>

      {/* Modal Backdrop */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden">
          <div className="bg-white rounded-xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex justify-between items-center border-b pb-3 border-slate-200">
              <h3 className="text-base font-bold text-slate-900">
                {actionType === "APPROVE"
                  ? "Director Approval & Sign-off"
                  : "Return Schedule for Rework"}
              </h3>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-slate-600 bg-slate-50 p-3 rounded-lg border border-slate-200">
              <span className="font-semibold text-slate-800">Target Schedule: </span>
              {title}
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  {actionType === "APPROVE"
                    ? "Director Approval Minutes / Directives (Optional/Required):"
                    : "Rework Directives & Specific Revisions Required:"}
                </label>
                <textarea
                  required
                  rows={4}
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder={
                    actionType === "APPROVE"
                      ? "e.g., Approved as presented. Ensure team leaders receive copies ahead of field deployment."
                      : "e.g., Please reassign the Team Leader for Row 2 due to scheduling conflicts."
                  }
                  className="w-full text-xs p-3 border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-slate-800 text-slate-800"
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
                  disabled={isPending}
                  className={`px-4 py-1.5 text-white text-xs font-semibold rounded-md shadow-xs transition-colors flex items-center gap-1 cursor-pointer ${
                    actionType === "APPROVE"
                      ? "bg-emerald-700 hover:bg-emerald-800"
                      : "bg-amber-600 hover:bg-amber-700"
                  }`}
                >
                  {isPending
                    ? "Processing..."
                    : actionType === "APPROVE"
                    ? "Confirm Approval"
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