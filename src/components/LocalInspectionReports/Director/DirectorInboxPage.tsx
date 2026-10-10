"use client";

import React, { useState, useEffect } from "react";
import { createClient } from "@/utils/supabase/client";
import { useRouter, useSearchParams } from "next/navigation";

export default function DirectorInboxPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeTab = searchParams.get("tab") || "requested";

  const [loading, setLoading] = useState(true);
  const [applications, setApplications] = useState<any[]>([]);
  
  // Modal State for Allocation
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [targetDivision, setTargetDivision] = useState<string>("VMD");
  const [allocationRemarks, setAllocationRemarks] = useState<string>("");
  const [isAllocating, setIsAllocating] = useState(false);

  // Expanded Remarks State
  const [expandedRemarksId, setExpandedRemarksId] = useState<number | null>(null);

  // Fetch applications on load and tab change
  useEffect(() => {
    async function fetchApplications() {
      setLoading(true);
      try {
        const res = await fetch("/api/LocalInspectionReports/DirectorAllocate/director-applications");
        const json = await res.json();
        if (json.success) {
          setApplications(json.data || []);
        }
      } catch (err) {
        console.error("Failed to fetch director applications:", err);
      } finally {
        setLoading(false);
      }
    }
    fetchApplications();
  }, [activeTab]);

  // Handle Allocation Submission
  const handleAllocateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedApp) return;

    setIsAllocating(true);
    try {
      const res = await fetch(`/api/LocalInspectionReports/DirectorAllocate/allocate`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId: selectedApp.id,
          targetDivision,
          remarks: allocationRemarks,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Allocation failed");

      // Refresh list
      setApplications((prev) => prev.filter((a) => a.id !== selectedApp.id));
      setSelectedApp(null);
      setAllocationRemarks("");
    } catch (err: any) {
      alert(err.message || "Error allocating application.");
    } finally {
      setIsAllocating(false);
    }
  };

  // Filter Logic matching the tabs
  const requestedItems = applications.filter((item: any) => {
    const cp = item.currentPoint || item.current_point;
    return cp === "Director Initial Allocation" || item.status === "PENDING_DIRECTOR_ALLOCATION";
  });

  const pendingItems = applications.filter((item: any) => {
    const stepKey = item.details?.inspectionWorkflowMeta?.currentStepKey;
    const cp = item.currentPoint || item.current_point;
    return stepKey === "DIRECTOR_FINAL_SIGN_OFF" || item.status === "PENDING_FINAL_SIGN_OFF" || cp === "Director Final Approval & Sign-Off";
  });

  const finalizedItems = applications.filter((item: any) => {
    const stepKey = item.details?.inspectionWorkflowMeta?.currentStepKey;
    const cp = item.currentPoint || item.current_point;
    return (
      stepKey === "FINALIZED" ||
      cp?.includes("Applicant Notification Hub") ||
      cp === "Report Approved and Archived" ||
      ["APPROVED_AND_ARCHIVED", "APPROVED", "AWAITING_CAPA"].includes(item.status)
    );
  });

  const displayedItems =
    activeTab === "requested"
      ? requestedItems
      : activeTab === "pending"
      ? pendingItems
      : finalizedItems;

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Tabs Header */}
      <div className="flex items-center justify-between border-b border-slate-200 mb-6">
        <div className="flex items-center gap-6">
          <button
            onClick={() => router.push("?tab=requested")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "requested"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>📋</span> Requested Applications
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-mono">
              {requestedItems.length}
            </span>
          </button>

          <button
            onClick={() => router.push("?tab=pending")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "pending"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>📥</span> Pending Sign-Off
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-amber-100 text-amber-800 font-mono">
              {pendingItems.length}
            </span>
          </button>

          <button
            onClick={() => router.push("?tab=finalized")}
            className={`pb-3 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === "finalized"
                ? "border-emerald-600 text-emerald-800"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            <span>🗄️</span> Finalized & Archived
            <span className="ml-1.5 px-2 py-0.5 text-xs rounded-full bg-slate-100 text-slate-700 font-mono">
              {finalizedItems.length}
            </span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-xs text-slate-500">Loading inbox records...</div>
      ) : displayedItems.length === 0 ? (
        <div className="p-12 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
          <p className="text-sm font-bold text-slate-700">No records found under this section.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {displayedItems.map((app: any) => {
            const currentDesk = app.currentPoint || app.current_point;
            const details = app.details || {};
            const isRemarksOpen = expandedRemarksId === app.id;

            return (
              <div
                key={app.id}
                className="p-4 bg-white border border-slate-200 rounded-xl shadow-sm hover:border-slate-300 transition-all flex flex-col gap-3"
              >
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono text-xs text-slate-400 font-bold">#{app.applicationNumber || app.id}</span>
                      <h4 className="font-bold text-slate-800 text-sm">
                        {app.companyName || app.company_name || `Application #${app.id}`}
                      </h4>
                      <span className="px-2 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium">
                        {app.type || "Pre-Registration"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 flex flex-wrap gap-x-4 gap-y-1">
                      <span>Target Directorate: <strong className="text-slate-700">{details.targetDirectorate || "VMD"}</strong></span>
                      <span>Est. Days: <strong className="text-slate-700">{details.estimatedInspectionDays || 3} Days</strong></span>
                      <span>Status: <strong className="font-mono text-emerald-700">{app.status}</strong></span>
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    {activeTab === "requested" && (
                      <button
                        onClick={() => setExpandedRemarksId(isRemarksOpen ? null : app.id)}
                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                      >
                        {isRemarksOpen ? "Hide Remarks" : "View Remarks"}
                      </button>
                    )}

                    {activeTab === "requested" ? (
                      <button
                        onClick={() => {
                          setSelectedApp(app);
                          setTargetDivision(details.targetDirectorate || "VMD");
                        }}
                        className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition shadow-sm"
                      >
                        Allocate ➔
                      </button>
                    ) : (
                      <a
                        href={`/LocalInspectionReports/${app.id}`}
                        className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg transition shadow-sm"
                      >
                        Review & Sign-Off ➔
                      </a>
                    )}
                  </div>
                </div>

                {/* Expandable Sender Remarks / Details Section */}
                {isRemarksOpen && (
                  <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200 text-xs text-slate-600 space-y-1">
                    <p className="font-semibold text-slate-700">Sender / Intake Remarks & Meta:</p>
                    <p><strong>Contact Email:</strong> {details.notificationEmail || "Not provided"}</p>
                    <p><strong>Assigned Divisions:</strong> {details.assignedDivisions?.join(", ") || "None"}</p>
                    {details.productLines?.length > 0 && (
                      <p><strong>Product Lines Attached:</strong> {details.productLines.length} line(s) specified.</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Allocation Modal */}
      {selectedApp && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white border border-slate-200 rounded-xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="text-sm font-bold text-slate-800">
                Allocate Application #{selectedApp.applicationNumber || selectedApp.id}
              </h3>
              <button
                onClick={() => setSelectedApp(null)}
                className="text-slate-400 hover:text-slate-600 font-bold text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAllocateSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Route to Divisional Deputy Director (Division)
                </label>
                <select
                  value={targetDivision}
                  onChange={(e) => setTargetDivision(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 text-xs font-bold text-slate-800 focus:outline-none focus:border-blue-500"
                >
                  <option value="VMD">Divisional Deputy Director (VMD - Veterinary Medicine)</option>
                  <option value="IRSD">Divisional Deputy Director (IRSD - Inspection, Relations & Stakeholders)</option>
                  <option value="AFPD">Divisional Deputy Director (AFPD - Animal Feed & Premix)</option>
                  <option value="PAD">Divisional Deputy Director (PAD - Pesticides & Agro-chemicals)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Allocation Remarks / Instructions
                </label>
                <textarea
                  rows={3}
                  value={allocationRemarks}
                  onChange={(e) => setAllocationRemarks(e.target.value)}
                  placeholder="Enter specific instructions or remarks for the Divisional Deputy Director..."
                  className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 text-xs text-slate-800 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAllocating}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition shadow-sm"
                >
                  {isAllocating ? "Allocating..." : "Categorize & Treat"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}