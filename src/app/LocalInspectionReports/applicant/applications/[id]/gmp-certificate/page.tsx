"use client";

import React, { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { GMPCertificateData } from "@/components/LocalInspectionReports/GMPCertificateView";

const supabase = await createClient();

export default function DynamicGmpCertificatePage({ params }: { params: Promise<{ id: string }> }) {
  const [certData, setCertData] = useState<GMPCertificateData | null>(null);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // 1. Fetch record data from Supabase
  useEffect(() => {
    async function loadData() {
      try {
        const { id } = await params;
        const appIdNum = parseInt(id, 10);

        const { data: appData, error } = await supabase
          .from("applications")
          .select("*")
          .eq("id", appIdNum)
          .maybeSingle();

        if (error) throw error;
        if (!appData) throw new Error("Application not found");

        const details = typeof appData.details === "string" 
          ? JSON.parse(appData.details) 
          : appData.details || {};

        const checklistSnapshot = details.savedChecklistSnapshot || {};
        const comments = details.comments || [];
        const directorApproval = comments.find((c: any) => c.fromStep === "Director Final Approval & Sign-Off");

        setCertData({
          appNumber: checklistSnapshot.report_doc_number || appData.application_number || `NAFDAC/VMD/GMP/${appData.id}`,
          date: directorApproval?.timestamp 
            ? new Date(directorApproval.timestamp).toLocaleDateString("en-GB")
            : new Date().toLocaleDateString("en-GB"),
          facilityName: checklistSnapshot.inspected_site_name || details.applicantName || "N/A",
          facilityAddress: checklistSnapshot.inspected_site_address || details.facilityAddress || "N/A",
          productLines: details.productLines || [],
          signatoryName: directorApproval?.actorName || "Divisional Deputy Director",
          signatoryTitle: "Divisional Deputy Director, Veterinary Medicine & Allied Products",
        });
      } catch (err: any) {
        setErrorMsg(err.message || "Failed to load certificate data");
        setLoading(false);
      }
    }
    loadData();
  }, [params]);

  // 2. Generate PDF Blob strictly client-side inside an effect
useEffect(() => {
    if (!certData) return;
    
    // Captures stable reference & narrows type from GMPCertificateData | null -> GMPCertificateData
    const currentCertData = certData; 

    let isMounted = true;
    let urlToClean: string | null = null;

    async function generatePdf() {
      try {
        const { pdf } = await import("@react-pdf/renderer");
        const { GMPCertificateView } = await import("@/components/LocalInspectionReports/GMPCertificateView");

        const blob = await pdf(<GMPCertificateView data={currentCertData} />).toBlob();
        const url = URL.createObjectURL(blob);
        urlToClean = url;

        if (isMounted) {
          setPdfUrl(url);
          setLoading(false);
        }
      } catch (err: any) {
        if (isMounted) {
          setErrorMsg(err.message || "Error compiling PDF document");
          setLoading(false);
        }
      }
    }

    generatePdf();

    return () => {
      isMounted = false;
      if (urlToClean) URL.revokeObjectURL(urlToClean);
    };
  }, [certData]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-slate-600 text-sm font-medium">
        Generating Certificate Document...
      </div>
    );
  }

  if (errorMsg || !pdfUrl) {
    return (
      <div className="p-8 text-xs text-rose-600 font-semibold">
        {errorMsg || "Unable to render certificate."}
      </div>
    );
  }

  return (
    <div className="w-full h-screen bg-slate-800">
      <iframe
        src={pdfUrl}
        className="w-full h-full border-none"
        title="GMP Certificate View"
      />
    </div>
  );
}