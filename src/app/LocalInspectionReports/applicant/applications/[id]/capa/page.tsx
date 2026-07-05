"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ApplicantCAPAForm, { CAPALineItem } from "@/components/LocalInspectionReports/ApplicantCAPAForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DynamicCapaPage({ params }: PageProps) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportSnapshot, setReportSnapshot] = useState<any>(null);
  
  // State tracking for existing submission statuses and loaded items
  const [capaSubmissionData, setCapaSubmissionData] = useState<any>(null);

  // 1. Resolve the asynchronous route parameters
  useEffect(() => {
    async function resolveParams() {
      try {
        const unwrappedParams = await params;
        setApplicationId(unwrappedParams.id);
      } catch (err: any) {
        console.error("Failed to unwrap route parameters:", err);
        setErrorMsg("Routing error: Unable to resolve application parameters.");
        setLoading(false);
      }
    }
    resolveParams();
  }, [params]);

  // 2. Fetch both the application data AND existing CAPA submissions if present
  useEffect(() => {
    async function fetchInspectionData() {
      if (!applicationId) return;

      try {
        setLoading(true);
        setErrorMsg(null);

        const appIdNum = parseInt(applicationId, 10);

        // Fetch Master Application Lifecycle data
        const { data: appData, error: appError } = await supabase
          .from("applications")
          .select("*")
          .eq("id", appIdNum)
          .maybeSingle();

        if (appError) throw appError;
        if (!appData) {
          throw new Error(`No local inspection record found matching Application ID: ${applicationId}`);
        }
        setReportSnapshot(appData);

        // Fetch existing CAPA submission if it exists
        const { data: capaData, error: capaError } = await supabase
          .from("capa_submissions")
          .select("*")
          .eq("application_id", appIdNum)
          .maybeSingle();

        if (capaError) throw capaError;
        setCapaSubmissionData(capaData);

      } catch (err: any) {
        console.error("Error retrieving inspection snapshot data:", err);
        setErrorMsg(err.message || "Failed to resolve inspection data stream from backend.");
      } finally {
        setLoading(false);
      }
    }

    fetchInspectionData();
  }, [applicationId]);

  const handleCapaSubmit = async (payload: {
    applicationId: string;
    refNumber: string;
    capaItems: any[];
    signatures: {
      managingDirector: { name: string; date: string };
      responsiblePerson: { name: string; date: string };
    };
    submittedAt: string;
  }) => {
    try {
      const appIdNum = parseInt(payload.applicationId, 10);
      if (isNaN(appIdNum)) {
        throw new Error("Invalid Application ID format. Must be a numeric value.");
      }

      // Check if an entry already exists for this application lifecycle
      const { data: existingSubmission, error: fetchError } = await supabase
        .from("capa_submissions")
        .select("id")
        .eq("application_id", appIdNum)
        .maybeSingle();

      if (fetchError) throw fetchError;

      let resultError;

      const rowData = {
        application_id: appIdNum,
        ref_number: payload.refNumber,
        capa_items: payload.capaItems,
        signatures: payload.signatures,
        submitted_at: payload.submittedAt,
        status: "PENDING_VERIFICATION" 
      };

      if (existingSubmission) {
        const { error } = await supabase
          .from("capa_submissions")
          .update(rowData)
          .eq("application_id", appIdNum);
        resultError = error;
      } else {
        const { error } = await supabase
          .from("capa_submissions")
          .insert(rowData);
        resultError = error;
      }

      if (resultError) throw resultError;

      // ==========================================
      // SYNCHRONIZE MASTER APPLICATIONS TABLE
      // ==========================================
      const { error: masterUpdateError } = await supabase
        .from("applications")
        .update({
          status: "CAPA_SUBMITTED_PENDING", 
          current_point: "Divisional Deputy Director CAPA Verification", 
          updated_at: new Date().toISOString()
        })
        .eq("id", appIdNum);

      if (masterUpdateError) {
        console.error("Warning: CAPA logged but Master Application Tracker failed to sync:", masterUpdateError);
      }

      alert("🚀 CAPA Ledger successfully locked and transmitted to VMAP infrastructure!");
      window.location.reload();
    } catch (error: any) {
      console.error("Database transmission failure detail:", error);
      alert(`Database Transmission Failure: ${error.message || "Review log matrix."}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="text-center space-y-2">
          <span className="inline-block h-6 w-6 rounded-full border-2 border-emerald-600 border-t-transparent animate-spin" />
          <p className="text-xs font-medium text-slate-500">Syncing dynamic audit records...</p>
        </div>
      </div>
    );
  }

  if (errorMsg || !reportSnapshot || !applicationId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 p-4">
        <div className="max-w-md w-full bg-white border border-rose-200 rounded-xl p-6 shadow-sm">
          <h3 className="text-sm font-semibold text-rose-900">Data Stream Connection Interrupted</h3>
          <p className="text-xs text-rose-600 mt-1">{errorMsg || "Invalid configuration state."}</p>
        </div>
      </div>
    );
  }

  // Drilling into the payload's saved snapshot details
  const snapshotDetails = reportSnapshot.details || {};
  const checklistSnapshot = snapshotDetails.savedChecklistSnapshot || {};
  
  const refNumber = checklistSnapshot.report_doc_number || reportSnapshot.application_number || "PENDING-REF";
  const companyName = checklistSnapshot.inspected_site_name || "Orange Kalbe Limited";
  
  const companyAddress = checklistSnapshot.vicinity_assessment 
    ? `${checklistSnapshot.vicinity_assessment}, Nigeria` 
    : "Registered Manufacturing Facility Site, Nigeria";

  // Determine workflow states using synchronized master lookup states
  const isReworkMode = reportSnapshot.status === "CAPA_REWORK_REQUIRED" || capaSubmissionData?.status === "REJECTED_REWORK";
  const isPendingVerification = capaSubmissionData?.status === "PENDING_VERIFICATION";
  const isPassed = capaSubmissionData?.status === "VERIFIED_PASSED";
  
  // Form should unlock if it's sitting in verification or already passed entirely
  const shouldLockForm = isPendingVerification || isPassed;

  // Setup variable containers to cleanly handle target properties conditional splitting
  let finalObservations: { severity: "Critical" | "Major" | "Other"; text: string }[] | undefined = undefined;
  let finalItems: CAPALineItem[] | undefined = undefined;

  if (capaSubmissionData?.capa_items) {
    // SCENARIO A: A saved record exists. Map fully populated items directly into finalItems
    const rawCapaItems = capaSubmissionData.capa_items;
    const parsedItems = typeof rawCapaItems === "string" ? JSON.parse(rawCapaItems) : rawCapaItems;
    
    finalItems = parsedItems.map((item: any, index: number) => ({
      id: item.id || `obs_${index}`,
      severity: item.severity || "Other",
      observation: item.observation || item.text || "No descriptive text provided.",
      rootCause: item.rootCause || "",
      correction: item.correction || "",
      correctiveAction: item.correctiveAction || item.correction || "",
      indicators: item.indicators || item.preventiveAction || "", 
      timeline: item.timeline || "",
      responsibility: item.responsibility || "",
      status: item.status || "Open",
      uploadedEvidenceUrl: item.uploadedEvidenceUrl || item.evidenceUrl || "",
      // Fix 1: Explicitly pass down the evaluation keys parsed from the database
      inspectorStatus: item.inspectorStatus || "Acceptable",
      inspectorRemarks: item.inspectorRemarks || ""
    }));
  } else {
    // SCENARIO B: Brand new submission workspace. Build clean snapshot arrays for finalObservations
    const rawObservations = checklistSnapshot.observations || [];
    finalObservations = rawObservations.map((obs: any) => ({
      severity: (obs.severity === "critical" ? "Critical" : obs.severity === "major" ? "Major" : "Other") as "Critical" | "Major" | "Other",
      text: obs.text || "No descriptive text provided in field inspection."
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto mb-6 print:hidden">
        <h1 className="text-xl font-bold text-slate-900">CAPA Submission Desk</h1>
        
        {/* Banner notification alert system */}
        {isReworkMode && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-semibold shadow-sm animate-pulse">
            ⚠️ Attention Required: This CAPA checklist has been returned by the Divisional Deputy Director for rework. 
            Please review the targeted comments appended to each item below, update your remedies, and resubmit.
          </div>
        )}

        {isPendingVerification && (
          <div className="mt-4 p-4 bg-amber-50 border border-amber-200 text-amber-900 rounded-2xl text-xs font-semibold shadow-sm">
            ⏳ Verification Pending: This dossier is currently locked and awaiting review inside the Divisional Deputy Director verification queue.
          </div>
        )}

        {isPassed && (
          <div className="mt-4 p-4 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-2xl text-xs font-semibold shadow-sm">
            ✅ Verification Complete: This CAPA framework has been fully verified and passed by the Directorate. Form entries are closed.
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          Processing Application Entry: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">ID {applicationId}</span> — Current Tracking State: <span className="font-mono text-emerald-700 font-bold">{reportSnapshot.status}</span>
        </p>
      </div>

      {/* Wrap the form in a native fieldset element to handle UI lockouts cleanly */}
      <fieldset disabled={shouldLockForm} className="disabled:opacity-85 disabled:pointer-events-none">
        <ApplicantCAPAForm
          applicationId={applicationId}
          refNumber={refNumber}
          companyName={companyName}
          companyAddress={companyAddress}
          initialObservations={finalObservations}
          initialItems={finalItems}
          isReadOnly={shouldLockForm}
          onSave={handleCapaSubmit}
        />
      </fieldset>
    </div>
  );
}