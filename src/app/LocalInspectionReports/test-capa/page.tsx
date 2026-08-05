"use client";

import React, { useState } from "react";
import ApplicantCAPAForm from "@/components/LocalInspectionReports/ApplicantCAPAForm";

// ✅ FIXED: Array defined outside the component ensures reference stability 
// and prevents the infinite re-render loop in Next.js/React.
const MOCK_INSPECTION_OBSERVATIONS = [
  { 
    severity: "Major" as const, 
    text: "Water system loop sanitation logs missing validation signatures for Q2." 
  },
  { 
    severity: "Critical" as const, 
    text: "Cross-contamination risk identified due to absolute pressure differential failure between the changing cubicle and the oral liquid preparation corridor." 
  },
  { 
    severity: "Other" as const, 
    text: "SOP training log file for newly onboarded raw material warehouse personnel was not fully updated." 
  }
];

export default function TestCAPAPage() {
  const [readOnlyMode, setReadOnlyMode] = useState(false);

  const handleMockSaveAndTransmit = async (payload: any) => {
    console.log("Transmitting CAPA Data payload to JSONB Engine:", payload);
    alert(
      "Success! The tracking matrix payload has been compiled.\n\nCheck your browser console to inspect the clean structured JSON data model ready for the database."
    );
  };

  return (
    <div className="min-h-screen bg-slate-100 py-10">
      
      {/* Simulation Controller Header */}
      <div className="max-w-6xl mx-auto mb-6 bg-slate-900 text-white rounded-xl p-4 shadow-sm flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-sm font-bold uppercase tracking-wider text-emerald-400">
            🛠️ Portal Role-Play Simulation Panel
          </h2>
          <p className="text-xs text-slate-300 mt-0.5">
            Toggle the toggle below to change your view perspective and test code constraints.
          </p>
        </div>
        
        <div className="flex items-center gap-3 bg-slate-800 px-4 py-2 rounded-lg border border-slate-700">
          <span className="text-xs font-semibold">Current View Context:</span>
          <button
            type="button"
            onClick={() => setReadOnlyMode(!readOnlyMode)}
            className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
              readOnlyMode 
                ? "bg-amber-600 text-white shadow-sm" 
                : "bg-blue-600 text-white shadow-sm"
            }`}
          >
            {readOnlyMode ? "👀 Viewing as NAFDAC Desk Officer (Read-Only)" : "📝 Viewing as Applicant (Editable Layout)"}
          </button>
        </div>
      </div>

      {/* The Core Live Component Instance under test */}
      <ApplicantCAPAForm
        applicationId="4091"
        companyName="Global Organics Limited"
        companyAddress="Plot 868, Km. 34, Lagos-Abeokuta Expressway, Ajegunle Bus Stop, Lagos"
        refNumber="NAFDAC/VMAP/G-31/Vol III"
        initialObservations={MOCK_INSPECTION_OBSERVATIONS}
        isReadOnly={readOnlyMode}
        onSave={handleMockSaveAndTransmit}
      />

    </div>
  );
}