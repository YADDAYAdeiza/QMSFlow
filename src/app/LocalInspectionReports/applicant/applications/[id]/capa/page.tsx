"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import { ApplicantCAPAForm, CAPAItem, InspectionObservation } from "@/components/LocalInspectionReports/ApplicantCAPAForm";

const supabase = createClient();

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DynamicCapaPage({ params }: PageProps) {
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportSnapshot, setReportSnapshot] = useState<any>(null);
  const [capaSubmissionData, setCapaSubmissionData] = useState<any>(null);

  useEffect(() => {
    async function fetchInspectionData() {
      if (!applicationId) return;

      try {
        setLoading(true);
        setErrorMsg(null);

        const appIdNum = parseInt(applicationId, 10);

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

  const snapshotDetails = reportSnapshot?.details || {};
  const checklistSnapshot = snapshotDetails.savedChecklistSnapshot || reportSnapshot || {};

  const companyId = 
    reportSnapshot?.company_id || 
    checklistSnapshot.company_id || 
    checklistSnapshot.company_rc_number || 
    checklistSnapshot.companyId || 
    reportSnapshot?.company_rc_number || 
    reportSnapshot?.companyId;

  const refNumber = checklistSnapshot.report_doc_number || reportSnapshot?.application_number || "PENDING-REF";
  const companyName = checklistSnapshot.inspected_site_name || reportSnapshot?.company_name || "Company Name";
  const companyAddress = checklistSnapshot.vicinity_assessment 
    ? `${checklistSnapshot.vicinity_assessment}, Nigeria` 
    : "Registered Manufacturing Facility Site, Nigeria";

  const companyEmail = 
    checklistSnapshot.notificationEmail ||
    checklistSnapshot.company_email || 
    reportSnapshot?.company_email || 
    reportSnapshot?.email;

  const handleCapaSaveDraft = async (data: { items: any[]; summary?: any }) => {
    try {
      if (!applicationId) throw new Error("Missing Application ID.");
      const appIdNum = parseInt(applicationId, 10);

      const savedAt = new Date().toISOString();
      const rowData = {
        application_id: appIdNum,
        ref_number: refNumber,
        capa_items: data.items,
        signatures: data.summary?.signatures || {},
        submitted_at: savedAt,
        status: "DRAFT"
      };

      const { error } = await supabase
        .from("capa_submissions")
        .upsert(rowData, { onConflict: "application_id" });

      if (error) throw error;
      setCapaSubmissionData((prev: any) => ({ ...prev, ...rowData }));
      alert("💾 CAPA draft saved successfully!");
    } catch (err: any) {
      console.error("Draft save failed:", err);
      alert(`Draft Save Failure: ${err.message || "Could not write draft state."}`);
    }
  };

  const handleCapaSubmit = async (data: { items: any[]; summary?: any; signatures?: any }) => {
    try {
      if (!applicationId) throw new Error("Missing Application ID.");
      const appIdNum = parseInt(applicationId, 10);
      const submittedAt = new Date().toISOString();

      const processedItems = data.items.map((item: any) => {
        let existingHistory: any[] = Array.isArray(item.history) ? item.history : [];
        const lastInspectorEntry = [...existingHistory].reverse().find(h => h.authorRole === "INSPECTOR");
        const currentCycle = lastInspectorEntry ? lastInspectorEntry.cycle + 1 : (existingHistory[0]?.cycle || 1);

        const newApplicantEntry = {
          cycle: currentCycle,
          timestamp: submittedAt,
          authorRole: "APPLICANT",
          authorName: data.signatures?.responsiblePerson?.name || "Quality Assurance Representative",
          rootCause: item.rootCause || "",
          proposedCorrection: item.proposedCorrection || "",
          preventiveAction: item.preventiveAction || "",
          timeline: item.timeline || "",
          responsibility: item.responsiblePerson || "",
          indicators: item.indicatorsForCompletion || "",
          evidenceUrl: item.uploadedEvidenceUrl || "",
        };

        return {
          ...item,
          status: "Pending Verification",
          history: [...existingHistory, newApplicantEntry]
        };
      });

      const rowData = {
        application_id: appIdNum,
        ref_number: refNumber,
        capa_items: processedItems,
        signatures: data.signatures || data.summary?.signatures || {},
        submitted_at: submittedAt,
        status: "PENDING_VERIFICATION" 
      };

      const { error: upsertError } = await supabase
        .from("capa_submissions")
        .upsert(rowData, { onConflict: "application_id" });

      if (upsertError) throw upsertError;

      await supabase
        .from("applications")
        .update({
          status: "CAPA_SUBMITTED_PENDING", 
          current_point: "Divisional Deputy Director CAPA Verification", 
          updated_at: submittedAt
        })
        .eq("id", appIdNum);

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

  const isReworkMode = reportSnapshot.status === "CAPA_REWORK_REQUIRED" || capaSubmissionData?.status === "REJECTED_REWORK";
  const isPendingVerification = capaSubmissionData?.status === "PENDING_VERIFICATION";
  const isPassed = capaSubmissionData?.status === "VERIFIED_PASSED";
  const shouldLockForm = isPendingVerification || isPassed;

  let finalObservations: InspectionObservation[] | undefined = undefined;
  let finalItems: CAPAItem[] | undefined = undefined;

  // Safe mapping function to properly parse severity fields from JSON snapshot
  const mapSeverityToCategory = (sev: string) => {
    const s = (sev || "").trim().toUpperCase();
    if (s === "CRITICAL") return "Critical";
    if (s === "MAJOR") return "Major";
    if (s === "OTHER" || s === "MINOR") return "Minor";
    return sev ? sev.charAt(0).toUpperCase() + sev.slice(1).toLowerCase() : "Major";
  };

  if (capaSubmissionData?.capa_items) {
    const rawCapaItems = capaSubmissionData.capa_items;
    const parsedItems = typeof rawCapaItems === "string" ? JSON.parse(rawCapaItems) : rawCapaItems;
    
    finalItems = parsedItems.map((item: any, index: number) => ({
      id: item.id || `obs_${index}_${Date.now()}`,
      deficiency: item.deficiency || item.observation || item.text || "No deficiency details provided.",
      inspectorRemarks: item.inspectorRemarks || item.remarks || "",
      deficiencyCategory: mapSeverityToCategory(item.deficiencyCategory || item.severity || item.category),
      rootCause: item.rootCause || "",
      proposedCorrection: item.proposedCorrection || item.correction || "",
      preventiveAction: item.preventiveAction || item.correctiveAction || "",
      indicatorsForCompletion: item.indicatorsForCompletion || item.indicators || "CAPA Report & Supporting SOPs", 
      timeline: item.timeline || "30 Days",
      responsiblePerson: item.responsiblePerson || item.responsibility || "QA Manager",
      status: item.status || "Pending",
      uploadedEvidenceUrl: item.uploadedEvidenceUrl || item.evidenceUrl || "",
      evidenceFiles: item.evidenceFiles || [],
      history: Array.isArray(item.history) ? item.history : []
    }));
  } else {
    const rawObservations = checklistSnapshot.observations || [];
    finalObservations = rawObservations.map((obs: any, index: number) => ({
      id: obs.id || `obs_${index}_${Date.now()}`,
      deficiencyCategory: mapSeverityToCategory(obs.severity || obs.deficiencyCategory),
      deficiency: obs.text || obs.deficiency || obs.observation || "No descriptive text provided.",
      inspectorRemarks: obs.inspectorRemarks || obs.remarks || "",
      timeline: (obs.severity || "").toUpperCase() === "CRITICAL" ? "Immediate" : "30 Days",
      responsiblePerson: "Quality Assurance Manager"
    }));
  }

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto mb-6 print:hidden">
        <h1 className="text-xl font-bold text-slate-900">CAPA Submission Desk</h1>
        
        {isReworkMode && (
          <div className="mt-4 p-4 bg-rose-50 border border-rose-200 text-rose-900 rounded-2xl text-xs font-semibold shadow-sm animate-pulse">
            ⚠️ Attention Required: This CAPA checklist has been returned by the Divisional Deputy Director for rework.
          </div>
        )}

        <p className="text-xs text-slate-500 mt-3">
          Processing Application Entry: <span className="font-mono bg-slate-200 px-1.5 py-0.5 rounded text-slate-800">ID {applicationId}</span>
        </p>
      </div>

      <fieldset disabled={shouldLockForm} className="disabled:opacity-85 disabled:pointer-events-none">
        <ApplicantCAPAForm
          applicationId={applicationId}
          companyId={companyId}
          referenceNumber={refNumber}
          companyName={companyName}
          facilityAddress={companyAddress}
          initialObservations={finalObservations}
          initialItems={finalItems}
          onSaveDraft={handleCapaSaveDraft}
          onSubmit={handleCapaSubmit}
        />
      </fieldset>
    </div>
  );
}