"use client";

import React, { useEffect, useState, use } from "react";
import { createClient } from "@/lib/supabase";
import { ApplicantCAPAForm, CAPAItem, InspectionObservation } from "@/components/LocalInspectionReports/ApplicantCAPAForm";

const supabase = createClient();

interface PageProps {
  params: Promise<{ id: string }>;
}

export interface AuditHistoryEntry {
  cycle: number;
  timestamp: string;
  authorRole: "APPLICANT" | "INSPECTOR";
  authorName: string;
  rootCause?: string;
  proposedCorrection?: string;
  preventiveAction?: string;
  timeline?: string;
  responsibility?: string;
  indicators?: string;
  evidenceUrl?: string;
  statusRuling?: "Acceptable" | "Deficient";
  remarks?: string;
}

export default function DynamicCapaPage({ params }: PageProps) {
  // Direct promise resolution for Next.js 15
  const resolvedParams = use(params);
  const applicationId = resolvedParams.id;

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportSnapshot, setReportSnapshot] = useState<any>(null);
  const [capaSubmissionData, setCapaSubmissionData] = useState<any>(null);

  // Fetch both the application data AND existing CAPA submissions
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

        // Fetch existing CAPA submission if present
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

  // Extract snapshot details safely for render and handlers
  const snapshotDetails = reportSnapshot?.details || {};
  const checklistSnapshot = snapshotDetails.savedChecklistSnapshot || {};

  // Extract companyId directly from master applications table or fallback to snapshot keys
  const companyId = 
    reportSnapshot?.company_id || 
    checklistSnapshot.company_id || 
    checklistSnapshot.company_rc_number || 
    checklistSnapshot.companyId || 
    reportSnapshot?.company_rc_number || 
    reportSnapshot?.companyId;

  const refNumber = checklistSnapshot.report_doc_number || reportSnapshot?.application_number || "PENDING-REF";
  const companyName = checklistSnapshot.inspected_site_name || "Orange Kalbe Limited";
  const companyAddress = checklistSnapshot.vicinity_assessment 
    ? `${checklistSnapshot.vicinity_assessment}, Nigeria` 
    : "Registered Manufacturing Facility Site, Nigeria";

  // Dynamic email extraction with fallback checks across JSON snapshot and master record
  const companyEmail = 
    checklistSnapshot.notificationEmail ||
    checklistSnapshot.company_email || 
    checklistSnapshot.applicant_email || 
    reportSnapshot?.company_email || 
    reportSnapshot?.applicant_email || 
    reportSnapshot?.email;

  // --- SAVE DRAFT HANDLER ---
  const handleCapaSaveDraft = async (data: { items: any[]; summary?: any }) => {
    try {
      if (!applicationId) throw new Error("Missing Application ID.");
      const appIdNum = parseInt(applicationId, 10);
      if (isNaN(appIdNum)) throw new Error("Invalid Application ID format.");

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

      setCapaSubmissionData((prev: any) => ({
        ...prev,
        ...rowData
      }));

      alert("💾 CAPA draft saved successfully!");
    } catch (err: any) {
      console.error("Draft save failed:", err);
      alert(`Draft Save Failure: ${err.message || "Could not write draft state."}`);
    }
  };

  // --- SUBMIT / RESUBMIT HANDLER (With Threaded History Append) ---
  const handleCapaSubmit = async (data: {
    items: any[];
    summary?: any;
    signatures?: {
      managingDirector: { name: string; date: string };
      responsiblePerson: { name: string; date: string };
    };
  }) => {
    try {
      if (!applicationId) throw new Error("Missing Application ID.");
      const appIdNum = parseInt(applicationId, 10);
      if (isNaN(appIdNum)) throw new Error("Invalid Application ID format. Must be a numeric value.");

      const submittedAt = new Date().toISOString();

      // Format items & append the applicant's cycle response to history
      const processedItems = data.items.map((item: any) => {
        let existingHistory: AuditHistoryEntry[] = Array.isArray(item.history) ? item.history : [];

        // Determine current cycle counter
        const lastInspectorEntry = [...existingHistory].reverse().find(h => h.authorRole === "INSPECTOR");
        const currentCycle = lastInspectorEntry ? lastInspectorEntry.cycle + 1 : (existingHistory[0]?.cycle || 1);

        const newApplicantEntry: AuditHistoryEntry = {
          cycle: currentCycle,
          timestamp: submittedAt,
          authorRole: "APPLICANT",
          authorName: data.signatures?.responsiblePerson?.name || data.summary?.signatures?.responsiblePerson?.name || "Quality Assurance Representative",
          rootCause: item.rootCause || "",
          proposedCorrection: item.proposedCorrection || item.correction || "",
          preventiveAction: item.preventiveAction || item.correctiveAction || "",
          timeline: item.timeline || "",
          responsibility: item.responsiblePerson || item.responsibility || "",
          indicators: item.indicatorsForCompletion || item.indicators || "",
          evidenceUrl: item.uploadedEvidenceUrl || item.evidenceUrl || "",
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

      // Synchronize Master Applications Table back to Inspector Verification Desk
      const { error: masterUpdateError } = await supabase
        .from("applications")
        .update({
          status: "CAPA_SUBMITTED_PENDING", 
          current_point: "Divisional Deputy Director CAPA Verification", 
          updated_at: submittedAt
        })
        .eq("id", appIdNum);

      if (masterUpdateError) {
        console.error("Warning: CAPA logged but Master Application Tracker failed to sync:", masterUpdateError);
      }

      // Outbound mail notification
      const recipientEmail = companyEmail || "adeiza.yusuf@nafdac.gov.ng";

      try {
        await fetch("/api/LocalInspectionReports/send-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: recipientEmail,
            cc: "adeiza.yusuf@nafdac.gov.ng",
            subject: `🚨 Action Required: CAPA Submission for Application ID ${applicationId}`,
            html: `
              <div style="font-family: sans-serif; padding: 20px; color: #334155; max-width: 600px; border: 1px solid #e2e8f0; border-radius: 12px;">
                <h2 style="color: #047857; margin-top: 0;">New CAPA Ledger Submitted</h2>
                <p>A Corrective and Preventive Action (CAPA) framework has been locked and uploaded to the VMAP infrastructure for audit validation.</p>
                <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
                <p><strong>Application ID:</strong> ${applicationId}</p>
                <p><strong>Reference Number:</strong> ${refNumber}</p>
                <p><strong>Company Name:</strong> ${companyName}</p>
                <p><strong>Submission Time:</strong> ${new Date(submittedAt).toLocaleString()}</p>
                <br />
                <a href="${window.location.origin}/LocalInspectionReports/admin/applications/${applicationId}/capa-verify" 
                  style="background-color: #047857; color: white; padding: 12px 20px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                  Open Adjudication Module
                </a>
              </div>
            `,
          }),
        });
      } catch (emailErr) {
        console.error("Notification system routing anomaly:", emailErr);
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

  const isReworkMode = reportSnapshot.status === "CAPA_REWORK_REQUIRED" || capaSubmissionData?.status === "REJECTED_REWORK";
  const isPendingVerification = capaSubmissionData?.status === "PENDING_VERIFICATION";
  const isPassed = capaSubmissionData?.status === "VERIFIED_PASSED";
  const shouldLockForm = isPendingVerification || isPassed;

  let finalObservations: InspectionObservation[] | undefined = undefined;
  let finalItems: CAPAItem[] | undefined = undefined;

  if (capaSubmissionData?.capa_items) {
    const rawCapaItems = capaSubmissionData.capa_items;
    const parsedItems = typeof rawCapaItems === "string" ? JSON.parse(rawCapaItems) : rawCapaItems;
    
    finalItems = parsedItems.map((item: any, index: number) => ({
      id: item.id || `obs_${index}_${Date.now()}`,
      deficiency: item.deficiency || item.observation || item.text || "No deficiency details provided.",
      inspectorRemarks: item.inspectorRemarks || item.remarks || "",
      deficiencyCategory: (item.deficiencyCategory || item.category || (item.severity === "critical" ? "Critical" : item.severity === "major" ? "Major" : "Minor")),
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
      deficiencyCategory: (obs.severity === "critical" ? "Critical" : obs.severity === "major" ? "Major" : "Minor"),
      deficiency: obs.text || obs.deficiency || obs.observation || "No descriptive text provided in field inspection.",
      inspectorRemarks: obs.inspectorRemarks || obs.remarks || "",
      timeline: obs.severity === "critical" ? "Immediate" : "30 Days",
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