"use client";

import React, { useState } from "react";

export interface HistoryEntry {
  action: string;
  actorRole: string;
  actorId?: string;
  comments: string;
  fromStep?: string;
  toStep?: string;
  timestamp: string;
}

interface BatchHistoryModalProps {
  batchReference: string;
  title: string;
  history: HistoryEntry[] | null | undefined;
}

export default function BatchHistoryModal({
  batchReference,
  title,
  history,
}: BatchHistoryModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  // Safely parses history whether passed as an array, null/undefined, or JSON string
  const historyList: HistoryEntry[] = React.useMemo(() => {
    if (!history) return [];
    if (Array.isArray(history)) return history;
    if (typeof history === "string") {
      try {
        return JSON.parse(history);
      } catch {
        return [];
      }
    }
    return [];
  }, [history]);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "APPROVE":
        return "bg-emerald-100 text-emerald-800 border-emerald-300";
      case "REWORK":
        return "bg-amber-100 text-amber-800 border-amber-300";
      case "RECOMMEND_RESUBMIT":
      case "RECOMMEND_FOR_APPROVAL":
        return "bg-blue-100 text-blue-800 border-blue-300";
      default:
        return "bg-slate-100 text-slate-800 border-slate-300";
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md border border-slate-300 inline-flex items-center gap-1.5 transition-colors cursor-pointer"
      >
        <span>📜</span> View History ({historyList.length})
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 print:hidden text-left">
          <div className="bg-white rounded-xl w-full max-w-2xl p-6 shadow-2xl border border-slate-200 space-y-4 max-h-[85vh] flex flex-col box-border overflow-hidden text-left">
            
            {/* Header section with explicit left alignment and word break handling */}
            <div className="flex justify-between items-start border-b pb-3 border-slate-200 gap-3 w-full min-w-0 text-left">
              <div className="min-w-0 flex-1 overflow-hidden text-left">
                <h3 className="text-base font-bold text-slate-900 truncate block text-left">
                  Audit Trail & Minutes History
                </h3>
                <p className="text-xs text-slate-500 font-mono mt-1 break-all text-left">
                  <span className="font-semibold text-slate-700">Ref: {batchReference}</span>
                  {title ? ` — ${title}` : ""}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold cursor-pointer shrink-0 p-1 rounded-md hover:bg-slate-100 transition-colors"
                aria-label="Close modal"
              >
                ✕
              </button>
            </div>

            {/* History Timeline Content */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-4 min-w-0 text-left">
              {historyList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-xs italic">
                  No approval or rework history logged for this schedule batch yet.
                </div>
              ) : (
                <div className="relative border-l-2 border-slate-200 ml-3 pl-4 space-y-6 my-2 text-left">
                  {historyList.map((entry, idx) => {
                    const formattedDate = entry.timestamp
                      ? new Date(entry.timestamp).toLocaleString("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        })
                      : "N/A";

                    return (
                      <div key={idx} className="relative group min-w-0 text-left">
                        {/* Dot on timeline */}
                        <div className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-slate-400 border-2 border-white ring-2 ring-slate-100" />

                        <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 space-y-2 min-w-0 text-left">
                          <div className="flex flex-wrap justify-between items-center gap-2">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-md border uppercase ${getActionBadge(
                                entry.action
                              )}`}
                            >
                              {entry.action ? entry.action.replace(/_/g, " ") : "ACTION"}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium">
                              {formattedDate}
                            </span>
                          </div>

                          <div className="text-xs font-semibold text-slate-800 truncate text-left">
                            Actor: {entry.actorRole || "Divisional Deputy Director"}
                          </div>

                          {entry.fromStep && entry.toStep && (
                            <div className="text-[11px] text-slate-500 flex items-center gap-1 font-mono truncate text-left">
                              <span>{entry.fromStep}</span>
                              <span>➔</span>
                              <span className="font-semibold text-slate-700">
                                {entry.toStep}
                              </span>
                            </div>
                          )}

                          <div className="text-xs text-slate-700 bg-white p-2.5 rounded border border-slate-200 italic whitespace-pre-wrap break-words mt-1 text-left">
                            "{entry.comments || "No comments provided."}"
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="flex justify-end pt-2 border-t border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold rounded-md transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}