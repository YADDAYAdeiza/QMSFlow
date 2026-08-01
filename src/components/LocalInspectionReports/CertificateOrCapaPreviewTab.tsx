// src/components/LocalInspectionReports/CertificateOrCapaPreviewTab.tsx
"use client";

import React from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { extractInspectionData } from "@/lib/utils/inspectionReportUtils";
import GMPCertificateView from "./GMPCertificateView";

// Dynamically import PDFViewer with SSR disabled to prevent server hydration mismatches
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false, loading: () => <div className="p-8 text-center text-sm text-slate-500">Loading PDF engine...</div> }
);

interface CertificateOrCapaPreviewTabProps {
  applicationData: any;
  applicationId: string | number;
}

export default function CertificateOrCapaPreviewTab({
  applicationData,
  applicationId,
}: CertificateOrCapaPreviewTabProps) {
  const {
    effectiveCompanyName,
    effectiveAddress,
    finalRecommendation,
    observations,
    certificateData,
  } = extractInspectionData(applicationData, applicationId);

  console.log('This is effectiveAddress ', effectiveAddress);

  const isCapaPending = finalRecommendation === "PENDING" || finalRecommendation === "CAPA_PENDING";

  // Replace this href string once you locate the exact route in your project
  const capaPortalHref = `/LocalInspectionReports/applicant/applications/${applicationId}/capa`;

console.log('This is certificateData: ', certificateData);

  if (isCapaPending) {
    return (
      <div className="mx-auto max-w-4xl rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden my-4">
        {/* Banner Header */}
        <div className="bg-slate-900 px-6 py-5 text-center text-white">
          <h2 className="text-lg font-bold tracking-wider text-amber-400 uppercase">
            NAFDAC Regulatory Audit Notice (Preview)
          </h2>
          <p className="mt-1 text-xs text-slate-400">
            Veterinary Medicines and Allied Products Directorate
          </p>
        </div>

        {/* Notice Body */}
        <div className="p-8 space-y-6">
          <div>
            <p className="text-sm font-semibold text-slate-800">The Managing Director,</p>
            <p className="text-sm font-bold text-slate-900">{effectiveCompanyName}</p>
            <p className="text-xs text-slate-500">{effectiveAddress}</p>
          </div>

          <p className="text-sm leading-relaxed text-slate-700">
            Please recall that a team of NAFDAC inspectors carried out a Good Manufacturing Practice (GMP) Routine Inspection at your facility, <strong className="text-slate-900">{effectiveCompanyName}</strong>.
          </p>

          {/* Audit Deficiencies Container */}
          <div className="rounded-md border-l-4 border-amber-500 bg-amber-50/50 p-5">
            <h4 className="text-xs font-bold tracking-wide text-amber-800 uppercase mb-3">
              Logged Audit Deficiencies Snapshot
            </h4>
            {observations.length > 0 ? (
              <ul className="space-y-2 text-xs text-slate-700 pl-4 list-disc">
                {observations.map((obs: any, idx: number) => (
                  <li key={idx}>
                    <span className="font-semibold text-amber-700">
                      [{obs.severity || "DEFICIENCY"}]
                    </span>{" "}
                    {obs.text || obs.description || String(obs)}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs italic text-slate-500">
                Please log into the compliance tracking panel to review mapped observations.
              </p>
            )}
          </div>

          <p className="text-sm leading-relaxed text-slate-700">
            You are hereby directed to compile and submit a comprehensive{" "}
            <strong className="text-slate-900">Corrective and Preventive Action (CAPA)</strong> response addressing these items within <strong className="text-slate-900">thirty (30) calendar days</strong>.
          </p>

          {/* Applicant Action Button / Portal Link */}
          <div className="pt-4 text-center">
            <Link
              href={capaPortalHref}
              className="inline-flex items-center justify-center rounded-md bg-amber-600 px-6 py-2.5 text-xs font-bold text-white shadow-sm transition-colors hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2"
            >
              📝 Open CAPA Response Portal
            </Link>
          </div>

          <hr className="border-slate-200 my-6" />

          <p className="text-xs text-slate-400 text-center">
            Automated regulatory notification draft generated via NAFDAC QMS Engine.<br />
            For: <strong>Director-General (NAFDAC)</strong>
          </p>
        </div>
      </div>
    );
  }

  // Approved Pathway: Render React-PDF Certificate Preview
  return (
    <div className="w-full h-[750px] rounded-lg border border-slate-200 bg-slate-100 overflow-hidden shadow-inner my-4">
      <PDFViewer width="100%" height="100%" className="border-none">
        <GMPCertificateView data={certificateData} />
      </PDFViewer>
    </div>
  );
}