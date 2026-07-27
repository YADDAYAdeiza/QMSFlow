// src/components/LocalInspectionReports/ReportIframeViewer.tsx
"use client";

import dynamic from "next/dynamic";
import GMPReportPDFView from "./GMPReportPDFView";

// Dynamically load PDFViewer on client side to prevent SSR canvas window errors
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { 
    ssr: false, 
    loading: () => (
      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-400 text-xs font-mono">
        Loading PDF Engine...
      </div>
    ) 
  }
);

interface ReportIframeViewerProps {
  reportHtml: string;
  docNumber?: string;
  logoUrl?: string;
}

export default function ReportIframeViewer({ reportHtml, docNumber, logoUrl }: ReportIframeViewerProps) {
  return (
    <div className="w-full h-[750px] border border-slate-200 rounded-lg overflow-hidden bg-slate-900 shadow-inner">
      <PDFViewer style={{ width: "100%", height: "100%", border: "none" }}>
        <GMPReportPDFView 
          reportHtml={reportHtml} 
          docNumber={docNumber} 
          logoUrl={logoUrl}
        />
      </PDFViewer>
    </div>
  );
}