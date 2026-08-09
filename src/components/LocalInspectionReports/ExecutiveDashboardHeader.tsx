"use client";

import React, { useState } from "react";

export default function ExecutiveDashboardHeader() {
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);

  const handleExportPolicyBrief = async () => {
    setIsGeneratingPdf(true);

    try {
      const res = await fetch("/api/analytics/export-policy-brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const outcome = await res.json();

      if (!res.ok || !outcome.success) {
        throw new Error(outcome.error || "Failed to compile policy brief.");
      }

      // Open printable HTML payload in a new window for immediate viewing/saving
      const printWindow = window.open("", "_blank");
      if (printWindow) {
        printWindow.document.write(outcome.htmlContent);
        printWindow.document.close();
        
        // Trigger print dialog once images/styles load
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
      } else {
        alert("Pop-up blocked! Please allow pop-ups for this site to export the brief.");
      }
    } catch (err: any) {
      console.error("EXECUTIVE_BRIEF_EXPORT_ERROR:", err);
      alert(`Export Error: ${err.message}`);
    } finally {
      setIsGeneratingPdf(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row md:items-center md:justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm mb-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Executive Regulatory Intelligence
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          National Veterinary GMP Compliance & Risk Analytics Dashboard
        </p>
      </div>

      <div className="mt-4 md:mt-0 flex items-center gap-3">
        {/* 1-Click Policy Brief Export Button */}
        <button
          onClick={handleExportPolicyBrief}
          disabled={isGeneratingPdf}
          className="inline-flex items-center gap-2 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-medium px-4 py-2.5 rounded-lg text-sm transition-colors shadow-sm"
        >
          {isGeneratingPdf ? (
            <>
              <svg
                className="animate-spin h-4 w-4 text-white"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                ></circle>
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                ></path>
              </svg>
              <span>Compiling Brief...</span>
            </>
          ) : (
            <>
              <svg
                className="w-4 h-4 text-slate-300"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
              <span>Export Executive Brief (PDF)</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}