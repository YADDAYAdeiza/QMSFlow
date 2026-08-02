"use client";

import dynamic from "next/dynamic";
import CAPALetterView from "@/components//LocalInspectionReports/CAPALetterView"; // Adjust path to your component

// PDFViewer must be dynamically imported on the client side in Next.js (no SSR)
const PDFViewer = dynamic(
  () => import("@react-pdf/renderer").then((mod) => mod.PDFViewer),
  { ssr: false }
);

// Sample mock data matching your structure
const mockData = {
  applicationId: "APP/2026/001",
  referenceNumber: "NAFDAC/VMAP/CAPA/2026/001",
  effectiveCompanyName: "Sample Veterinary Pharmaceuticals Ltd",
  effectiveAddress: "Plot 12 Industrial Avenue, Ikeja, Lagos State",
  inspectionTitle: "ANIMAL VACCINE PRODUCTION FACILITY",
  observations: [
    {
      id: "1",
      severity: "CRITICAL",
      deficiency: "Lack of HVAC air qualification documentation for Grade A cleanroom area.",
      rootCause: "Incomplete vendor validation package submission.",
      proposedCorrection: "Perform full HEPA filter integrity test & airborne particle counts.",
      preventiveAction: "Update SOP for annual cleanroom re-qualification.",
      timeline: "Immediate",
      status: "Pending",
    },
    {
      id: "2",
      severity: "MAJOR",
      deficiency: "Water for Injection (WFI) loop sampling schedule not adhered to.",
      rootCause: "Staff shortage during holiday shift.",
      proposedCorrection: "Retrospective sampling and trend analysis.",
      preventiveAction: "Automate daily sampling logs in QMS software.",
      timeline: "30 Days",
      status: "In Progress",
    },
  ],
};

export default function PDFPreviewPage() {
  return (
    <div className="w-full h-screen bg-slate-900 flex flex-col items-center justify-center p-4">
      <h1 className="text-white text-lg font-bold mb-2">CAPA PDF Live Dev Preview</h1>
      <PDFViewer className="w-full h-[90vh] rounded-lg shadow-2xl">
        <CAPALetterView data={mockData} />
      </PDFViewer>
    </div>
  );
}