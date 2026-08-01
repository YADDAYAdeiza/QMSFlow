"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";

// Instantiate client synchronously inside client component scope
const supabase = createClient();

interface PageProps {
  params: Promise<{ id: string }>;
}

export interface AuditHistoryEntry {
  cycle: number;
  timestamp: string;
  authorRole: "APPLICANT" | "INSPECTOR";
  authorName: string;
  // Applicant Fields
  rootCause?: string;
  proposedCorrection?: string;
  preventiveAction?: string;
  timeline?: string;
  responsibility?: string;
  indicators?: string;
  evidenceUrl?: string;
  // Inspector Fields
  statusRuling?: "Acceptable" | "Deficient";
  remarks?: string;
}

export interface CAPAItem {
  id: string;
  observation: string;
  severity: string;
  rootCause: string;
  correction: string;
  correctiveAction: string;
  timeline: string;
  responsibility: string;
  indicators: string;
  uploadedEvidenceUrl?: string;
  status: string;
  inspectorStatus?: "Acceptable" | "Deficient";
  inspectorRemarks?: string;
  history: AuditHistoryEntry[];
}

export default function InspectorCapaVerifyPage({ params }: PageProps) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submittingAction, setSubmittingAction] = useState<"APPROVING" | "REJECTING" | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [applicantEmail, setApplicantEmail] = useState<string>("");
  const [capaItems, setCapaItems] = useState<CAPAItem[]>([]);

  // 1. Unpack Route Parameters
  useEffect(() => {
    async function resolveParams() {
      try {
        const unwrappedParams = await params;
        setApplicationId(unwrappedParams.id);
      } catch (err: any) {
        console.error("Routing error:", err);
        setErrorMsg("Unable to resolve target application parameters.");
        setLoading(false);
      }
    }
    resolveParams();
  }, [params]);

  // 2. Fetch CAPA submission & associated application email
  useEffect(() => {
    async function fetchCapaSubmission() {
      if (!applicationId) return;

      try {
        setLoading(true);
        setErrorMsg(null);

        // Fetch CAPA submission record
        const { data, error } = await supabase
          .from("capa_submissions")
          .select("*")
          .eq("application_id", parseInt(applicationId, 10))
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error(`No active CAPA submission ledger exists for Application ID: ${applicationId}`);
        }

        setSubmissionData(data);

        // Fetch user email directly from core applications table
        const { data: appData, error: appErr } = await supabase
          .from("applications")
          .select("applicant_email, company_email, email")
          .eq("id", parseInt(applicationId, 10))
          .maybeSingle();

        if (!appErr && appData) {
          const resolvedEmail = appData.applicant_email || appData.company_email || appData.email || "";
          setApplicantEmail(resolvedEmail);
        }

        const rawItems = Array.isArray(data.capa_items) 
          ? data.capa_items 
          : JSON.parse(data.capa_items || "[]");
        
        // Map fields and initialize/migrate threaded history logs
        const initializedItems: CAPAItem[] = rawItems.map((item: any, idx: number) => {
          const currentRootCause = item.rootCause || "—";
          const currentCorrection = item.proposedCorrection || item.correction || "—";
          const currentAction = item.preventiveAction || item.correctiveAction || "—";
          const currentTimeline = item.timeline || "—";
          const currentResp = item.responsiblePerson || item.responsibility || "—";
          const currentInd = item.indicatorsForCompletion || item.indicators || "—";
          const currentEvidence = item.uploadedEvidenceUrl || item.evidence_url;

          // Parse or construct historical trail
          let itemHistory: AuditHistoryEntry[] = Array.isArray(item.history) ? item.history : [];

          // Migrate legacy items that have no history array yet
          if (itemHistory.length === 0) {
            itemHistory.push({
              cycle: 1,
              timestamp: data.created_at || new Date().toISOString(),
              authorRole: "APPLICANT",
              authorName: "Applicant Representative",
              rootCause: currentRootCause,
              proposedCorrection: currentCorrection,
              preventiveAction: currentAction,
              timeline: currentTimeline,
              responsibility: currentResp,
              indicators: currentInd,
              evidenceUrl: currentEvidence,
            });

            // If legacy remarks exist, backfill the inspector's first response
            if (item.inspectorRemarks || item.inspectorStatus) {
              itemHistory.push({
                cycle: 1,
                timestamp: data.updated_at || new Date().toISOString(),
                authorRole: "INSPECTOR",
                authorName: "Divisional Deputy Director",
                statusRuling: item.inspectorStatus || "Acceptable",
                remarks: item.inspectorRemarks || "Initial assessment recorded.",
              });
            }
          }

          return {
            id: item.id || `item-${idx}`,
            severity: item.deficiencyCategory || item.severity || "Major",
            observation: item.deficiency || item.observation || "—",
            rootCause: currentRootCause,
            correction: currentCorrection,
            correctiveAction: currentAction,
            timeline: currentTimeline,
            responsibility: currentResp,
            indicators: currentInd,
            uploadedEvidenceUrl: currentEvidence,
            status: item.status || "Pending",
            inspectorStatus: item.inspectorStatus ?? "Acceptable",
            inspectorRemarks: item.inspectorRemarks ?? "",
            history: itemHistory,
          };
        });
        
        setCapaItems(initializedItems);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setErrorMsg(err.message || "Failed to sync submission ledger stream.");
      } finally {
        setLoading(false);
      }
    }

    fetchCapaSubmission();
  }, [applicationId]);

  const handleItemEvaluation = (idx: number, field: "inspectorStatus" | "inspectorRemarks", value: string) => {
    setCapaItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

const handleFinalAdjudication = async (finalLifecycleStatus: "VERIFIED_PASSED" | "REJECTED_REWORK") => {
  if (!applicationId) return;

  const appStatusMap = {
    VERIFIED_PASSED: "CAPA_APPROVED",
    REJECTED_REWORK: "CAPA_REWORK_REQUIRED",
  };

  const currentAction = finalLifecycleStatus === "VERIFIED_PASSED" ? "APPROVING" : "REJECTING";

  try {
    setSubmittingAction(currentAction);

    // Build updated items payload while explicitly preserving field states (including deficiencyCategory)
    const updatedCapaItems = capaItems.map((item) => {
      // Safely compute cycle increment
      const safeHistory = item.history || [];
      const lastCycle = safeHistory.length > 0 
        ? safeHistory.reduce((max, h) => Math.max(max, h.cycle || 1), 1) 
        : 1;

      const currentRuling = item.inspectorStatus || "Acceptable";
      const currentRemarks = item.inspectorRemarks || "No additional commentary provided.";

      const newInspectorEntry: AuditHistoryEntry = {
        cycle: lastCycle,
        timestamp: new Date().toISOString(),
        authorRole: "INSPECTOR",
        authorName: "Divisional Deputy Director",
        statusRuling: currentRuling,
        remarks: currentRemarks,
      };

      // Safeguard against snake_case vs camelCase key loss
      const category = item.deficiencyCategory || (item as any).deficiency_category || "Minor";

      return {
        ...item,
        deficiencyCategory: category,
        history: [...safeHistory, newInspectorEntry],
      };
    });

    // Debug check: verify payload prior to transmission
    console.log("Transmitting updated capa_items:", updatedCapaItems);

    // 1. Update the ledger entry in database
    const { error: capaError } = await supabase
      .from("capa_submissions")
      .update({
        capa_items: updatedCapaItems,
        status: finalLifecycleStatus,
      })
      .eq("application_id", parseInt(applicationId, 10));

    if (capaError) throw capaError;

    // 2. Synchronize core Application status
    const { error: appError } = await supabase
      .from("applications")
      .update({
        status: appStatusMap[finalLifecycleStatus],
        updated_at: new Date().toISOString(),
      })
      .eq("id", parseInt(applicationId, 10));

    if (appError) throw appError;

    // 3. Dispatch outbound mail notification
    const targetEmail = applicantEmail || "hiscript@gmail.com";

    try {
      const isPassed = finalLifecycleStatus === "VERIFIED_PASSED";
      const emailSubject = isPassed 
        ? `✅ CAPA Approved & Closed — Application ID: ${applicationId}`
        : `⚠️ CAPA Rework Required — Application ID: ${applicationId}`;

      const emailBody = isPassed 
        ? `
            <div style="font-family: sans-serif; padding: 20px; color: #334155; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #047857; margin-top: 0;">CAPA Verification Complete</h2>
              <p>Dear Stakeholder,</p>
              <p>We are pleased to inform you that your Corrective and Preventive Action (CAPA) framework has been fully verified and passed by the Directorate.</p>
              <p><strong>Reference File:</strong> ${submissionData?.ref_number || "—"}</p>
              <p>The ledger is now officially closed, and your application workflow has progressed into the next operational phase.</p>
            </div>
          `
        : `
            <div style="font-family: sans-serif; padding: 20px; color: #334155; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
              <h2 style="color: #be123c; margin-top: 0;">CAPA Rework Required</h2>
              <p>Dear Stakeholder,</p>
              <p>Your CAPA checklist has been reviewed by the Divisional Deputy Director and returned for mandatory corrections.</p>
              <p><strong>Reference File:</strong> ${submissionData?.ref_number || "—"}</p>
              <p>Please log back into your dashboard workspace to review specific line-item inspector remarks, update your structural remedies, and re-transmit your ledger for review.</p>
              <br />
              <a href="${window.location.origin}/LocalInspectionReports/applicant/applications/${applicationId}/capa" 
                style="background-color: #be123c; color: white; padding: 12px 20px; text-decoration: none; font-weight: bold; display: inline-block; border-radius: 6px;">
                Open CAPA Workspace
              </a>
            </div>
          `;

      await fetch("/api/LocalInspectionReports/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          to: targetEmail,
          subject: emailSubject,
          html: emailBody,
        }),
      });
    } catch (emailErr) {
      console.error("Outbound notification failure:", emailErr);
    }

    alert(`⚖️ Adjudication finalized! Systems synchronized to: ${finalLifecycleStatus}`);
    setCapaItems(updatedCapaItems);
  } catch (err: any) {
    console.error("Transmission error:", err);
    alert(`Adjudication Sync Failed: ${err.message}`);
  } finally {
    setSubmittingAction(null);
  }
};

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <p className="text-xs font-medium text-slate-500 animate-pulse">Syncing CAPA submission ledger for verification...</p>
      </div>
    );
  }

  if (errorMsg || !submissionData || !applicationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-rose-900">Desk Synchronization Error</h3>
          <p className="text-xs text-rose-600 mt-1">{errorMsg}</p>
        </div>
      </div>
    );
  }

  const signatures = typeof submissionData.signatures === "string" 
    ? JSON.parse(submissionData.signatures) 
    : submissionData.signatures || {};

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Header Desk Header */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full tracking-wider uppercase">
              Inspection Verification Desk
            </span>
            <h1 className="text-xl font-bold text-slate-900 mt-1">CAPA Adjudication Module</h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Reference File: <span className="font-mono text-slate-800 font-semibold">{submissionData.ref_number}</span> | Application ID: {applicationId}
            </p>
          </div>
          <div className="text-right flex items-center gap-3">
            <button
              type="button"
              onClick={() => window.print()}
              className="hidden md:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition print:hidden"
            >
              🖨️ Print Audit Trail
            </button>
            <div>
              <span className="text-xs text-slate-400 block">Current Ledger Status</span>
              <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-indigo-700">
                {submissionData.status}
              </span>
            </div>
          </div>
        </div>

        {/* Findings Checklist */}
        <div className="space-y-6">
          {capaItems.map((item, idx) => (
            <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12 print:border-slate-300">
              
              {/* Left Column: Finding & Latest Submission */}
              <div className="p-6 lg:col-span-7 bg-white space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100 print:col-span-12 print:border-r-0">
                <div className="flex items-start justify-between">
                  <span className="text-xs font-semibold text-slate-400">Finding Item #{idx + 1}</span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                    item.severity === "Critical" ? "bg-rose-100 text-rose-800" :
                    item.severity === "Major" ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-800"
                  }`}>
                    {item.severity} Deficiency
                  </span>
                </div>

                <div>
                  <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Deficiency Cited</h4>
                  <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-2.5 rounded border border-slate-100 font-medium">
                    {item.observation}
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Root Cause Analysis</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.rootCause}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Immediate Correction Action</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.correction}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preventive Action Plan (CAPA)</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.correctiveAction}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Implementation Tracking</h5>
                    <div className="text-xs text-slate-600 mt-1 space-y-1">
                      <p>⏳ Timeline: <span className="font-medium text-slate-900">{item.timeline}</span></p>
                      <p>👤 Owner: <span className="font-medium text-slate-900">{item.responsibility}</span></p>
                      <p>📊 Metric: <span className="font-medium text-slate-900">{item.indicators}</span></p>
                    </div>
                  </div>
                </div>

                {item.uploadedEvidenceUrl && (
                  <div className="pt-2">
                    <a 
                      href={item.uploadedEvidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded transition print:hidden"
                    >
                      📎 View Attached Evidence Material
                    </a>
                    <p className="hidden print:block text-[10px] text-slate-500">
                      Evidence Attached: <span className="font-mono">{item.uploadedEvidenceUrl}</span>
                    </p>
                  </div>
                )}

                {/* Audit & Review History Thread */}
                {item.history && item.history.length > 0 && (
                  <div className="pt-4 border-t border-slate-100 space-y-3">
                    <h5 className="text-xs font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                      💬 Dialogue & Audit Review History
                    </h5>
                    
                    <div className="space-y-2.5 max-h-80 overflow-y-auto pr-1 print:max-h-none print:overflow-visible">
                      {item.history.map((entry, hIdx) => (
                        <div 
                          key={hIdx} 
                          className={`p-3 rounded-lg border text-xs space-y-1 ${
                            entry.authorRole === "INSPECTOR" 
                              ? "bg-amber-50/60 border-amber-200/60 ml-2" 
                              : "bg-slate-50 border-slate-200/80 mr-2"
                          }`}
                        >
                          <div className="flex justify-between items-center text-[10px]">
                            <span className="font-bold text-slate-700">
                              Cycle #{entry.cycle} — {entry.authorName} ({entry.authorRole})
                            </span>
                            <span className="text-slate-400 font-mono">
                              {new Date(entry.timestamp).toLocaleString()}
                            </span>
                          </div>

                          {entry.authorRole === "INSPECTOR" ? (
                            <div>
                              <span className={`inline-block text-[9px] font-bold px-1.5 py-0.5 rounded mb-1 ${
                                entry.statusRuling === "Acceptable" ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"
                              }`}>
                                Ruling: {entry.statusRuling}
                              </span>
                              <p className="text-slate-700 italic">"{entry.remarks}"</p>
                            </div>
                          ) : (
                            <div className="space-y-1 text-slate-600">
                              <p><strong className="text-slate-700">Correction:</strong> {entry.proposedCorrection}</p>
                              <p><strong className="text-slate-700">Preventive Action:</strong> {entry.preventiveAction}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Inspector Active Verification Controls */}
              <div className="p-6 lg:col-span-5 bg-slate-50/50 flex flex-col justify-between space-y-4 print:hidden">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Divisional Deputy Director Verification
                  </h3>
                  
                  <div className="space-y-2">
                    <label className="block text-xs font-semibold text-slate-500">Adjudication Ruling</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => handleItemEvaluation(idx, "inspectorStatus", "Acceptable")}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition ${
                          item.inspectorStatus === "Acceptable"
                            ? "bg-emerald-600 border-emerald-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        ✅ Acceptable
                      </button>
                      <button
                        type="button"
                        onClick={() => handleItemEvaluation(idx, "inspectorStatus", "Deficient")}
                        className={`p-2.5 rounded-lg border text-xs font-medium text-center transition ${
                          item.inspectorStatus === "Deficient"
                            ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                            : "bg-white border-slate-200 text-slate-700 hover:bg-slate-100"
                        }`}
                      >
                        ❌ Deficient
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">Inspector Verification Remarks</label>
                    <textarea
                      rows={5}
                      value={item.inspectorRemarks}
                      onChange={(e) => handleItemEvaluation(idx, "inspectorRemarks", e.target.value)}
                      placeholder="Provide clear regulatory comments for this specific finding item..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg shadow-inner bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition text-slate-800"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 italic">
                  Reviewing finding item asset snapshot. Submitting appends this remark to the thread.
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Corporate Sign-off Section */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Corporate Sign-off</h4>
            <p className="text-sm font-semibold text-slate-800 mt-1">{signatures.managingDirector?.name || "—"}</p>
            <p className="text-xs text-slate-500">Managing Director / CEO</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">Submitted: {signatures.managingDirector?.date || "—"}</p>
          </div>
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Technical Attestation</h4>
            <p className="text-sm font-semibold text-slate-800 mt-1">{signatures.responsiblePerson?.name || "—"}</p>
            <p className="text-xs text-slate-500">Responsible Person</p>
            <p className="text-[10px] font-mono text-slate-400 mt-1">Submitted: {signatures.responsiblePerson?.date || "—"}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex justify-end items-center gap-3 print:hidden">
          <button
            type="button"
            disabled={submittingAction !== null}
            onClick={() => handleFinalAdjudication("REJECTED_REWORK")}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"
          >
            {submittingAction === "REJECTING" ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-rose-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing Return...
              </>
            ) : (
              <>↩️ Return for Rework</>
            )}
          </button>
          
          <button
            type="button"
            disabled={submittingAction !== null}
            onClick={() => handleFinalAdjudication("VERIFIED_PASSED")}
            className="inline-flex items-center gap-2 px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-md disabled:opacity-50 transition"
          >
            {submittingAction === "APPROVING" ? (
              <>
                <svg className="animate-spin h-3.5 w-3.5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Approving & Closing...
              </>
            ) : (
              <>🚀 Approve & Close CAPA Ledger</>
            )}
          </button>
        </div>

      </div>
    </div>
  );
}