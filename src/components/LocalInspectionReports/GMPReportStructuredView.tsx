// src/components/LocalInspectionReports/GMPReportStructuredView.tsx
"use client";

import React from "react";

interface GMPReportStructuredViewProps {
  checklistSnapshot: any;
  companyName: string;
  applicationId: string;
  docNumber?: string;
  onUpdateSnapshot?: (updated: any) => void;
  isEditable?: boolean;
}

// Helper to normalize lists into string arrays
const parseList = (val: any): string[] => {
  if (Array.isArray(val)) return val.filter(v => typeof v === 'string' && v.trim().length > 0);
  if (typeof val === 'string' && val.trim()) {
    return val.split(',').map(s => s.trim()).filter(Boolean);
  }
  return [];
};

export default function GMPReportStructuredView({
  checklistSnapshot,
  companyName,
  applicationId,
  docNumber,
  isEditable = true,
}: GMPReportStructuredViewProps) {
  const data = checklistSnapshot || {};
  const effectiveDocNo = docNumber || data.report_doc_number || `OKL-LA-PRI-01-2026`;
  const auditDate = data.inspection_dates || "Inspection Dates Pending";
  const siteName = data.inspected_site_name || companyName || "Registered Establishment";
  const facilityAddress = data.facility_address || data.inspected_site_address || "Registered Facility Address";

  // Parse dynamic inspection team members for signature blocks
  const leadInspectorName = data.lead_inspector?.trim();
  const coInspectorsList = parseList(data.co_inspectors);
  const traineesList = parseList(data.trainees || data.trainee_inspectors);

  // Grab signature URLs map from snapshot or database records if present
  const userSignaturesMap = data.user_signatures || data.signatures || {};

  // Compile signature items with optional signature URLs from database/snapshot
  const signatureCards: Array<{ name: string; role: string; signatureUrl?: string }> = [];
  
  if (leadInspectorName && leadInspectorName !== "Unassigned") {
    signatureCards.push({ 
      name: leadInspectorName, 
      role: "Lead Inspector, VMAP/IRSD",
      signatureUrl: userSignaturesMap[leadInspectorName] || userSignaturesMap['lead_inspector']
    });
  }
  coInspectorsList.forEach((name) => {
    signatureCards.push({ 
      name, 
      role: "Co-Inspector, VMAP",
      signatureUrl: userSignaturesMap[name]
    });
  });
  traineesList.forEach((name) => {
    signatureCards.push({ 
      name, 
      role: "Trainee Inspector / Observer",
      signatureUrl: userSignaturesMap[name]
    });
  });

  const observations = Array.isArray(data.observations) ? data.observations : [];

  return (
    <div 
      className={`bg-white p-8 max-w-4xl mx-auto border border-slate-300 shadow-sm font-sans text-xs text-slate-900 leading-normal ${isEditable ? 'ring-2 ring-emerald-500/20' : ''}`}
      contentEditable={isEditable}
      suppressContentEditableWarning={true}
    >
      {/* Top Header Metadata Banner */}
      <div className="flex justify-between border-b border-black pb-2 mb-4 font-semibold text-[10px] text-slate-600">
        <span>Annexure - 2 | SOP Ref. No. DER-800-03</span>
        <span>Title of Annexure: DER Pharmaceutical GMP Inspection Report Format</span>
      </div>

      {/* NAFDAC Header Block */}
      <div className="text-center space-y-1 mb-6">
        <div className="flex justify-center mb-2">
          <img
            src="/nafdac_logo2-removebg-preview.png"
            alt="NAFDAC Logo"
            className="w-12 h-12 object-contain"
          />
        </div>
        <h2 className="font-bold text-xs uppercase tracking-wide">
          NATIONAL AGENCY FOR FOOD AND DRUG ADMINISTRATION AND CONTROL (NAFDAC)
        </h2>
        <h3 className="font-bold text-[11px] uppercase tracking-wide text-slate-700">
          DRUG EVALUATION AND RESEARCH (DER) / VMAP DIRECTORATE
        </h3>
        <h1 className="font-extrabold text-sm uppercase underline mt-3">
          GOOD MANUFACTURING PRACTICE (GMP) INSPECTION REPORT
        </h1>
        <h2 className="font-bold text-xs text-emerald-800 mt-1 uppercase">
          {siteName}
        </h2>
      </div>

      {/* Distribution & Metadata Box */}
      <div className="grid grid-cols-2 border border-black p-3 mb-6 bg-slate-50/50 text-[11px]">
        <div>
          <p><span className="font-bold">Report Doc. No:</span> {effectiveDocNo}</p>
          <p><span className="font-bold">Audit Date:</span> {auditDate}</p>
          <p><span className="font-bold">Application ID:</span> #{applicationId}</p>
          {data.latitude && data.longitude && (
            <p className="mt-1 font-mono text-[10px] text-slate-600">
              <span className="font-bold">GPS:</span> {data.latitude}, {data.longitude}
            </p>
          )}
        </div>
        <div>
          <p className="font-bold underline">Distribution List:</p>
          <ul className="list-disc list-inside text-slate-700">
            <li>Director (DER) / Director (VMAP)</li>
            <li>Director (State Zonal Office)</li>
            <li>Company's Copy & File</li>
          </ul>
        </div>
      </div>

      {/* General Information Section */}
      <div className="mb-6 space-y-3">
        <h3 className="font-bold uppercase bg-slate-200 border border-black p-1.5 text-slate-900">
          1. General Information & Inspection Scope
        </h3>
        <div className="border border-black p-3 space-y-2">
          <p><span className="font-bold">Inspected Site Address:</span> {facilityAddress}</p>
          <p><span className="font-bold">Type of Inspection:</span> {data.type_of_inspection || "Pre-Registration Inspection (PRI)"}</p>
          <div>
            <p className="font-bold">Inspection Team Members:</p>
            <ul className="list-disc list-inside pl-2 text-slate-700">
              <li>Lead Inspector: <span className="font-semibold text-black">{leadInspectorName || "Unassigned"}</span></li>
              <li>Co-Inspectors: <span className="font-semibold text-black">{coInspectorsList.length > 0 ? coInspectorsList.join(', ') : "None"}</span></li>
              <li>Trainee Inspectors: <span className="font-semibold text-black">{traineesList.length > 0 ? traineesList.join(', ') : "None"}</span></li>
            </ul>
          </div>
          {data.vicinity_assessment && (
            <p className="pt-1"><span className="font-bold">Vicinity Assessment:</span> {data.vicinity_assessment}</p>
          )}
        </div>
      </div>

      {/* Quality Systems Evaluation (Score Column Removed) */}
      <div className="mb-6 space-y-3">
        <h3 className="font-bold uppercase bg-slate-200 border border-black p-1.5 text-slate-900">
          2. Core Quality Systems Evaluation Summary (QSIT)
        </h3>
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-left">
              <th className="border-r border-black p-2 w-1/3">Quality System Element</th>
              <th className="p-2">Evaluator Notes & Observations</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            <tr>
              <td className="border-r border-black p-2 font-semibold">1. Pharmaceutical Quality System (PQS)</td>
              <td className="p-2 text-slate-700">{data.pqs_notes || "Compliant baseline parameters observed."}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 font-semibold">2. Personnel & Training</td>
              <td className="p-2 text-slate-700">{data.personnel_notes || "Staff qualifications verified."}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 font-semibold">3. Premises & Equipment</td>
              <td className="p-2 text-slate-700">{data.premises_equipment_notes || "Facility layouts and HVAC systems checked."}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 font-semibold">4. Qualification & Validation</td>
              <td className="p-2 text-slate-700">{data.qualification_validation_notes || "Protocols and validation status reviewed."}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 font-semibold">5. Material Management</td>
              <td className="p-2 text-slate-700">{data.material_management_notes || "Warehouse and storage controls satisfactory."}</td>
            </tr>
            <tr>
              <td className="border-r border-black p-2 font-semibold">6. Laboratory Control / QC</td>
              <td className="p-2 text-slate-700">{data.laboratory_control_notes || "QC instrumentation and testing records verified."}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Deficiencies Matrix Summary & Observations */}
      <div className="mb-6 space-y-3">
        <h3 className="font-bold uppercase bg-slate-200 border border-black p-1.5 text-slate-900">
          3. Deficiencies Matrix Summary & Observations
        </h3>
        <div className="grid grid-cols-3 gap-2 text-center mb-3">
          <div className="border border-black p-2 bg-rose-50">
            <p className="font-bold text-rose-800">Critical</p>
            <p className="text-base font-extrabold">{data.critical_count ?? 0}</p>
          </div>
          <div className="border border-black p-2 bg-amber-50">
            <p className="font-bold text-amber-800">Major</p>
            <p className="text-base font-extrabold">{data.major_count ?? 0}</p>
          </div>
          <div className="border border-black p-2 bg-blue-50">
            <p className="font-bold text-blue-800">Other / Minor</p>
            <p className="text-base font-extrabold">{data.other_count ?? 0}</p>
          </div>
        </div>

        {/* Tabular Deficiencies Matrix */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="bg-slate-100 border-b border-black text-left">
              <th className="border-r border-black p-2 w-24 text-center">Class</th>
              <th className="border-r border-black p-2">Audit Narrative / Observation Finding</th>
              <th className="p-2 w-1/3">Reference (PIC/S Guide)</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {observations.length === 0 ? (
              <tr>
                <td colSpan={3} className="p-4 text-center text-slate-500 italic">
                  No deficiencies or observations logged.
                </td>
              </tr>
            ) : (
              observations.map((obs: any, idx: number) => {
                const sev = String(obs.severity || "OTHER").toUpperCase();
                const textDesc = obs.text || obs.observation_text || "";
                
                // Robust multi-key fallback for PIC/S references returned by AI
                const picsRef = 
                  obs.pics_reference || 
                  obs.picsReference || 
                  obs.reference || 
                  "PIC/S Part I / II (Standard Compliance)";

                return (
                  <tr key={obs.id || idx} className="align-top">
                    <td className="border-r border-black p-2 text-center font-bold">
                      <span className={`inline-block px-1.5 py-0.5 rounded border text-[10px] uppercase ${
                        sev === "CRITICAL" ? "bg-rose-100 text-rose-800 border-rose-300" :
                        sev === "MAJOR" ? "bg-amber-100 text-amber-800 border-amber-300" :
                        "bg-blue-100 text-blue-800 border-blue-300"
                      }`}>
                        {sev}
                      </span>
                    </td>
                    <td className="border-r border-black p-2 text-slate-900 leading-relaxed">
                      {textDesc}
                    </td>
                    <td className="p-2 font-mono text-[11px] text-slate-700 bg-slate-50/50">
                      {picsRef}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Final Recommendations & Conclusion */}
      <div className="mb-8 space-y-3">
        <h3 className="font-bold uppercase bg-slate-200 border border-black p-1.5 text-slate-900">
          4. Recommendations & Adjudication Stance
        </h3>
        <div className="border border-black p-3 space-y-2">
          <p><span className="font-bold">Final Adjudication Status:</span> <span className="font-extrabold uppercase text-emerald-700">{data.final_recommendation || "PENDING"}</span></p>
          <p className="text-slate-700">
            Based on the areas inspected, personnel met, documents reviewed, and findings noted, the establishment is judged to have demonstrated compliance satisfactory to support manufacturing operations under regulatory supervision.
          </p>
        </div>
      </div>

      {/* Dynamic Signatures Footer Block */}
      <div className="border border-black p-4 mt-6 page-break-inside-avoid">
        <p className="font-bold uppercase mb-4 text-[11px]">Signatures and Date</p>
        <div className="grid grid-cols-2 gap-6 pt-2 items-end">
          {signatureCards.map((sig, idx) => {
            const normalizedCardName = sig.name.trim().toLowerCase();
            return (
              <div key={idx} className="text-center p-2 flex flex-col justify-end" data-card-name={normalizedCardName}>
                {/* Fixed height container (min-h-[140px]) guarantees all cards share identical vertical space */}
                <div className="border-b border-black pb-1 mb-1 min-h-[140px] flex items-center justify-center relative">
                  <div 
                    className="signature-display-box w-full flex items-center justify-center py-2" 
                    style={{ display: 'none' }} 
                    data-signed="false"
                  >
                    {sig.signatureUrl ? (
                      <img 
                        src={sig.signatureUrl} 
                        alt={`${sig.name} Signature`} 
                        className="max-h-36 max-w-[420px] object-contain mx-auto" 
                      />
                    ) : (
                      <span className="font-serif text-base font-bold text-emerald-800 italic">
                        Signed by {sig.name}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-400 italic unsigned-placeholder absolute">
                    [{sig.name} Signature Pending]
                  </span>
                </div>
                <p className="font-bold mt-1">{sig.name}</p>
                <p className="text-[10px] text-slate-600">{sig.role}</p>
                <p className="text-[10px] text-slate-500">Date: {auditDate}</p>
              </div>
            );
          })}

          {/* Divisional Deputy Director Endorsement Card */}
          <div className="text-center p-2 flex flex-col justify-end" data-card-name="pharm. (mrs.) uba florence">
            <div className="border-b border-black pb-1 mb-1 min-h-[140px] flex items-center justify-center relative">
              <div 
                className="signature-display-box w-full flex items-center justify-center py-2" 
                style={{ display: 'none' }}
                data-signed="false"
              >
                <span className="font-serif text-base font-bold text-emerald-800 italic">
                  Signed by Pharm. (Mrs.) Uba Florence
                </span>
              </div>
              <span className="text-[10px] text-slate-400 italic unsigned-placeholder absolute">
                [DDD Signature Pending]
              </span>
            </div>
            <p className="font-bold mt-1">Pharm. (Mrs.) Uba Florence</p>
            <p className="text-[10px] text-slate-600">Divisional Deputy Director (VMD)</p>
            <p className="text-[10px] text-slate-500">Date: {auditDate}</p>
          </div>
        </div>
      </div>
    </div>
  );
}