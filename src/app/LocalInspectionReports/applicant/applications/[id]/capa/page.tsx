"use client";

import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import ApplicantCAPAForm from "@/components/LocalInspectionReports/ApplicantCAPAForm";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function DynamicCapaPage({ params }: PageProps) {
  const [applicationId, setApplicationId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [reportSnapshot, setReportSnapshot] = useState<any>(null);

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

  // 2. Fetch the live inspection payload once the ID is resolved
  useEffect(() => {
    async function fetchInspectionData() {
      if (!applicationId) return;

      try {
        setLoading(true);
        setErrorMsg(null);

        const { data, error } = await supabase
          .from("applications")
          .select("*")
          .eq("id", parseInt(applicationId, 10))
          .maybeSingle();

        if (error) throw error;
        if (!data) {
          throw new Error(`No local inspection record found matching Application ID: ${applicationId}`);
        }

        setReportSnapshot(data);
      } catch (err: any) {
        console.error("Error retrieving inspection snapshot:", err);
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

      // Clean, native structural mapping directly matching your streamlined Postgres table
      const rowData = {
        application_id: appIdNum,
        ref_number: payload.refNumber,
        capa_items: payload.capaItems, // Natively maps to your cleaned table schema
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

      alert("🚀 CAPA Ledger successfully locked and transmitted to VMAP infrastructure!");
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

  const rawObservations = checklistSnapshot.observations || [];
  const initialObservations = rawObservations.map((obs: any) => ({
    severity: (obs.severity === "critical" ? "Critical" : obs.severity === "major" ? "Major" : "Other") as "Critical" | "Major" | "Other",
    text: obs.text || "No descriptive text provided in field inspection."
  }));

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 print:bg-white print:p-0">
      <div className="max-w-6xl mx-auto mb-6 print:hidden">
        <h1 className="text-xl font-bold text-slate-900">CAPA Submission Desk</h1>
        <p className="text-xs text-slate-500 mt-1">
          Processing Application Entry: <span className="font-mono bg-slate-200 px-1 py-0.5 rounded text-slate-800">ID {applicationId}</span> — Current Tracking State: <span className="font-mono text-emerald-700 font-bold">{reportSnapshot.status}</span>
        </p>
      </div>

      <ApplicantCAPAForm
        applicationId={applicationId}
        refNumber={refNumber}
        companyName={companyName}
        companyAddress={companyAddress}
        initialObservations={initialObservations}
        onSave={handleCapaSubmit}
      />
    </div>
  );
}