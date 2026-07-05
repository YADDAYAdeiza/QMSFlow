"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";

interface PageProps {
  params: Promise<{ id: string }>;
}

interface CapaItem {
  id: string;
  observation: string;
  severity: "Critical" | "Major" | "Other";
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
}

export default function InspectorCapaVerifyPage({ params }: PageProps) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [submissionData, setSubmissionData] = useState<any>(null);
  const [capaItems, setCapaItems] = useState<CapaItem[]>([]);

  // 1. Resolve the asynchronous route parameters
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

  // 2. Fetch the applicant's CAPA ledger submission
  useEffect(() => {
    async function fetchCapaSubmission() {
      if (!applicationId) return;

      try {
        setLoading(true);
        setErrorMsg(null);

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
        
        // Parse the native JSONB capa_items array
        const rawItems = Array.isArray(data.capa_items) 
          ? data.capa_items 
          : JSON.parse(data.capa_items || "[]");
        
        // Initialize inspector keys cleanly using Nullish Coalescing (??)
        const initializedItems = rawItems.map((item: any) => ({
        ...item,
        inspectorStatus: item.inspectorStatus ?? "Acceptable",
        inspectorRemarks: item.inspectorRemarks ?? "" 
        }));
        
        setCapaItems(initializedItems);
      } catch (err: any) {
        console.error("Fetch error:", err);
        setErrorMsg(err.message || "Failed to sync submission ledger stream.");
      } finally {
        nodeLint: setLoading(false);
      }
    }

    fetchCapaSubmission();
  }, [applicationId]);

  // Handle updates to individual line-item verification states
  const handleItemEvaluation = (idx: number, field: "inspectorStatus" | "inspectorRemarks", value: string) => {
    setCapaItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Transmit the final adjudication batch to the database
  // Transmit the final adjudication batch to the database
  const handleFinalAdjudication = async (finalLifecycleStatus: "VERIFIED_PASSED" | "REJECTED_REWORK") => {
    if (!applicationId) return;
    
    // Map CAPA status to the master Application Table workflow status names
    const appStatusMap = {
      VERIFIED_PASSED: "CAPA_APPROVED",
      REJECTED_REWORK: "CAPA_REWORK_REQUIRED"
    };

    try {
      setSubmitting(true);

      // 1. Update the ledger entry with the evaluation schema details
      // Strictly matching your schema properties: only 'capa_items' and 'status'
      const { error: capaError } = await supabase
        .from("capa_submissions")
        .update({
          capa_items: capaItems,
          status: finalLifecycleStatus
        })
        .eq("application_id", parseInt(applicationId, 10));

      if (capaError) throw capaError;

      // 2. Synchronize the core Application status to keep the workflow moving
      const { error: appError } = await supabase
        .from("applications")
        .update({
          status: appStatusMap[finalLifecycleStatus],
          updated_at: new Date().toISOString()
        })
        .eq("id", parseInt(applicationId, 10));

      if (appError) throw appError;

      alert(`⚖️ Adjudication finalized! Systems synchronized to: ${finalLifecycleStatus}`);
    } catch (err: any) {
      console.error("Transmission error:", err);
      alert(`Adjudication Sync Failed: ${err.message}`);
    } finally {
      setSubmitting(false);
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
        
        {/* Header Block */}
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
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Current Ledger Status</span>
            <span className="inline-block mt-1 font-mono text-xs font-bold px-2 py-1 bg-indigo-50 border border-indigo-200 rounded text-indigo-700">
              {submissionData.status}
            </span>
          </div>
        </div>

        {/* Observations Evaluation Loop */}
        <div className="space-y-4">
          {capaItems.map((item, idx) => (
            <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden grid grid-cols-1 lg:grid-cols-12">
              
              {/* Left Column: Read-Only Applicant CAPA Form Values */}
              <div className="p-6 lg:col-span-7 bg-white space-y-4 border-b lg:border-b-0 lg:border-r border-slate-100">
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
                  <p className="text-sm text-slate-800 mt-1 bg-slate-50 p-2.5 rounded border border-slate-100 font-medium">{item.observation}</p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Root Cause Analysis</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.rootCause || "—"}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Immediate Correction Action</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.correction || "—"}</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Preventive Action Plan (CAPA)</h5>
                    <p className="text-xs text-slate-700 mt-1 whitespace-pre-wrap">{item.correctiveAction || "—"}</p>
                  </div>
                  <div>
                    <h5 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Implementation Tracking</h5>
                    <div className="text-xs text-slate-600 mt-1 space-y-1">
                      <p>⏳ Timeline: <span className="font-medium text-slate-900">{item.timeline || "—"}</span></p>
                      <p>👤 Owner: <span className="font-medium text-slate-900">{item.responsibility || "—"}</span></p>
                      <p>📊 Metric: <span className="font-medium text-slate-900">{item.indicators || "—"}</span></p>
                    </div>
                  </div>
                </div>

                {item.uploadedEvidenceUrl && (
                  <div className="pt-2">
                    <a 
                      href={item.uploadedEvidenceUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 hover:text-emerald-800 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded transition"
                    >
                      📎 View Attached Evidence Material
                    </a>
                  </div>
                )}
              </div>

              {/* Right Column: Inspector Adjudication Fields */}
              <div className="p-6 lg:col-span-5 bg-slate-50/50 flex flex-col justify-between space-y-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
                    Regulatory Adjudication Verification
                  </h3>
                  
                  {/* Verification Radio Options */}
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

                  {/* Remarks Input */}
                  <div className="mt-4 space-y-1">
                    <label className="block text-xs font-semibold text-slate-500">Inspector Verification Remarks</label>
                    <textarea
                      rows={4}
                      value={item.inspectorRemarks}
                      onChange={(e) => handleItemEvaluation(idx, "inspectorRemarks", e.target.value)}
                      placeholder="Input regulatory comments, review criteria evaluations, or follow-up dynamic parameters..."
                      className="w-full text-xs p-2.5 border border-slate-200 rounded-lg shadow-inner bg-white focus:outline-none focus:ring-1 focus:ring-slate-400 transition text-slate-800"
                    />
                  </div>
                </div>

                <div className="border-t border-slate-100 pt-3 text-[11px] text-slate-400 italic">
                  Evaluating finding reference item identification asset snapshot index.
                </div>
              </div>

            </div>
          ))}
        </div>

        {/* Applicant Attestation Display */}
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

        {/* Action Tray */}
        <div className="flex justify-end items-center gap-3 print:hidden">
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleFinalAdjudication("REJECTED_REWORK")}
            className="px-4 py-2 text-xs font-semibold rounded-lg bg-white border border-rose-200 text-rose-700 hover:bg-rose-50 disabled:opacity-50 transition"
          >
            ↩️ Return for Rework
          </button>
          <button
            type="button"
            disabled={submitting}
            onClick={() => handleFinalAdjudication("VERIFIED_PASSED")}
            className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white shadow-md disabled:opacity-50 transition"
          >
            🚀 Approve & Close CAPA Ledger
          </button>
        </div>

      </div>
    </div>
  );
}