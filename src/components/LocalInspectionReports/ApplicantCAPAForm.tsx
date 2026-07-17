"use client";

import React, { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

export interface CAPALineItem {
  id: string;
  severity: "Critical" | "Major" | "Other";
  observation: string;
  rootCause: string;
  correction: string;
  correctiveAction: string;
  indicators: string;
  timeline: string;
  responsibility: string;
  status: "Open" | "Pending Verification" | "Resolved";
  uploadedEvidenceUrl?: string; 
  inspectorStatus?: "Acceptable" | "Rework Required";
  inspectorRemarks?: string;
}

interface ApplicantCAPAFormProps {
  applicationId: string;
  companyName?: string;
  companyAddress?: string;
  refNumber?: string;
  initialObservations?: { severity: "Critical" | "Major" | "Other"; text: string }[];
  initialItems?: CAPALineItem[];
  isReadOnly?: boolean; 
  onSave?: (payload: any) => Promise<void>;
}

export default function ApplicantCAPAForm({
  applicationId,
  companyName = "The Applicant Facility",
  companyAddress = "Registered Facility Location Address",
  refNumber = "NAFDAC/VMAP/G-31/Vol III",
  initialObservations = [],
  initialItems = [],
  isReadOnly = false,
  onSave
}: ApplicantCAPAFormProps) {
  
  const parseInitialState = (): CAPALineItem[] => {
    if (initialItems && initialItems.length > 0) return initialItems;
    if (initialObservations && initialObservations.length > 0) {
      return initialObservations.map((obs, index) => ({
        id: `obs_${index}`,
        severity: obs.severity,
        observation: obs.text,
        rootCause: "",
        correction: "",
        correctiveAction: "",
        indicators: "",
        timeline: "",
        responsibility: "",
        status: "Open"
      }));
    }
    return [];
  };

  const [capaItems, setCapaItems] = useState<CAPALineItem[]>(parseInitialState);
  const [responsiblePerson, setResponsiblePerson] = useState({ name: "", date: "" });
  const [managingDirector, setManagingDirector] = useState({ name: "", date: "" });
  const [isUploading, setIsUploading] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setCapaItems(parseInitialState());
  }, [initialObservations.length, initialItems.length]);

  const handleFieldChange = (id: string, field: keyof CAPALineItem, value: string) => {
    setCapaItems(prev => prev.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleFileUpload = async (id: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    setIsUploading(id);
    
    try {
      const { data, error } = await supabase.storage
        .from("LocalInspectionReports")
        .upload(`capa_${applicationId}/${id}_${Date.now()}_evidence.pdf`, file, {
          cacheControl: "3600",
          upsert: true
        });

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from("LocalInspectionReports")
        .getPublicUrl(data.path);

      handleFieldChange(id, "uploadedEvidenceUrl", publicUrl);
      alert("Objective evidence document attached successfully.");
    } catch (err: any) {
      alert(`Upload failed: ${err.message || err}`);
    } finally {
      setIsUploading(null);
    }
  };

  const triggerSystemPrint = () => {
    window.print();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!responsiblePerson.name || !managingDirector.name) {
      alert("Validation Error: Signatures from both the Responsible Person and the Managing Director are mandatory.");
      return;
    }
    
    setIsSubmitting(true);
    try {
      if (onSave) {
        await onSave({
          applicationId,
          refNumber,
          capaItems,
          signatures: { responsiblePerson, managingDirector },
          submittedAt: new Date().toISOString()
        });
      } else {
        alert("CAPA data snapshot captured successfully.");
      }
    } catch (err: any) {
      alert(`Submission failed: ${err.message || err}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden font-sans text-slate-800 print:border-none print:shadow-none print:bg-white print:max-w-full">
      
      {/* Top Utility Hub Controls */}
      <div className="bg-slate-100 px-6 py-3 border-b border-slate-200 flex justify-between items-center print:hidden">
        <div className="flex items-center gap-2">
          <span className="flex h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          <p className="text-xs font-semibold text-slate-600">
            {isReadOnly ? "Reviewing Submitted Applicant Ledger" : "Applicant Formulation Hub Sandbox"}
          </p>
        </div>
        <button
          type="button"
          onClick={triggerSystemPrint}
          className="inline-flex items-center gap-1.5 px-3 py-1 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 text-xs font-bold rounded shadow-xs transition-all"
        >
          🖨️ Export / Print Reference Document
        </button>
      </div>

      {/* Official Header Area */}
      <div className="bg-emerald-50/40 p-6 border-b border-slate-200 text-center relative print:bg-transparent print:border-b-2 print:border-slate-800">
        <div className="flex justify-center mb-2">
          <div className="w-16 h-16 rounded-full bg-emerald-700 flex items-center justify-center text-white font-bold text-xs print:border print:border-slate-800 print:text-black print:bg-transparent">
            NAFDAC COAT
          </div>
        </div>
        <h1 className="text-base font-bold tracking-wide uppercase text-slate-900 print:text-black">
          National Agency for Food and Drug Administration and Control
        </h1>
        <p className="text-xs font-bold text-emerald-800 tracking-wider uppercase mt-0.5 print:text-slate-900">
          Veterinary Medicines and Allied Products Directorate (VMAP)
        </p>
        <div className="text-[10px] text-slate-500 mt-2 space-y-0.5 font-medium print:text-slate-700">
          <p>Corporate HQ: Plot 2932 Olusegun Obasanjo Way, Wuse Zone 7, Abuja</p>
          <p>Lagos Office: Plot 1, Industrial Estate, Oshodi Apapa Expressway, Isolo</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6 print:p-0 print:space-y-4">
        
        {/* Correspondence Text block */}
        <div className="text-xs space-y-3 text-slate-800 leading-relaxed print:text-black">
          <div className="flex justify-between items-start font-medium">
            <div className="space-y-0.5">
              <p><span className="font-bold">Ref. No.:</span> {refNumber}</p>
              <p className="font-bold pt-2">The Managing Director,</p>
              <p className="font-bold text-emerald-900 print:text-black">{companyName},</p>
              <p className="italic text-slate-600 print:text-black">{companyAddress}</p>
            </div>
            <p className="font-bold text-slate-600 print:text-black">
              Date: {new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>

          <div className="pt-2">
            <h2 className="font-bold text-sm text-slate-900 uppercase border-b border-slate-200 pb-1 tracking-wide print:text-black">
              NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION
            </h2>
          </div>

          <p>Dear Sir,</p>
          <p>
            Please recall that a team of NAFDAC inspectors carried out a Routine Inspection (RI) of your facility located at{" "}
            <span className="italic font-semibold">{companyAddress}</span>.
          </p>
          <p>
            During the audit, some observations bordering on different aspects of GMP were made. These observations had 
            Earlier been discussed with your team during the course of the inspection and exit meeting. Please find 
            Forwarded the full inspection report for your attention.
          </p>
          <p>
            In view of the above, you are expected to address all observations by developing a Corrective and Preventive 
            Action (CAPA) plan, for each include a description of the corrective actions implemented or planned to be 
            Implemented, and the date of completion or target date for completion. In addition, for observations classified 
            As <span className="font-bold">"major"</span> or <span className="font-bold">"critical"</span>, supporting documentation should be submitted with the response as objective evidence of completion of corrective actions.
          </p>
          <p>
            Please note that, the acceptability of corrective actions will be assessed through evaluation of the response to 
            Each observation through a desk assessment of your CAPA plan which would be verified during future GMP inspections.
          </p>
          <p>
            Please find highlighted below the template for submission of your CAPA plan which must be submitted to the 
            Undersigned within thirty (30) days of receipt of this letter.
          </p>
        </div>

        {/* Dynamic Action Matrix Grid Section */}
        <div className="space-y-3">
          <div className="overflow-x-auto border border-slate-200 rounded-xl shadow-xs print:border-slate-400 print:rounded-none">
            <table className="w-full text-left border-collapse bg-white text-xs print:text-black">
              <thead className="bg-slate-950 text-slate-100 text-[10px] uppercase font-bold tracking-wider print:bg-slate-200 print:text-black print:border-b-2 print:border-slate-800">
                <tr>
                  <th className="p-2.5 border-b border-slate-700 w-24 print:border-slate-400">Severity</th>
                  <th className="p-2.5 border-b border-slate-700 w-60 print:border-slate-400">Audit Findings</th>
                  <th className="p-2.5 border-b border-slate-700 w-48 print:border-slate-400">Root Cause Analysis</th>
                  <th className="p-2.5 border-b border-slate-700 w-48 print:border-slate-400">Correction & Preventative Actions</th>
                  <th className="p-2.5 border-b border-slate-700 w-36 print:border-slate-400">Indicators & Dates</th>
                  <th className="p-2.5 border-b border-slate-700 w-36 print:border-slate-400">Owner & Evidences</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 print:divide-slate-300">
                {capaItems.map((item) => {
                  const isCritical = item.severity === "Critical";
                  const isMajor = item.severity === "Major";
                  
                  return (
                    <tr key={item.id} className="hover:bg-slate-50/80 align-top transition-colors print:hover:bg-transparent page-break-inside-avoid">
                      
                      {/* Severity Badge */}
                      <td className="p-2.5 font-medium print:border-r print:border-slate-300">
                        <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-bold tracking-wide uppercase text-center w-full border ${
                          isCritical ? "bg-rose-100 text-rose-800 border-rose-200 print:text-black print:bg-slate-100" :
                          isMajor ? "bg-amber-100 text-amber-800 border-amber-200 print:text-black print:bg-slate-100" :
                          "bg-slate-100 text-slate-700 border-slate-200 print:text-black"
                        }`}>
                          {item.severity}
                        </span>
                      </td>

                      {/* Read-Only Inspection Observations */}
                      <td className="p-2.5 bg-slate-50/40 print:bg-transparent print:border-r print:border-slate-300">
                        <p className="text-slate-800 font-medium leading-relaxed whitespace-pre-wrap print:text-black">{item.observation}</p>
                        
                        {/* Display evaluation comments directly below the observation if they exist */}
                        {item.inspectorRemarks && (
                          <div className="mt-2 p-2 bg-rose-50 border border-rose-100 rounded text-[11px] text-rose-900 print:border-slate-400">
                            <p className="font-bold text-[9px] uppercase tracking-wide text-rose-700 print:text-black">
                              📋 VMAP Evaluation Desk Remarks ({item.inspectorStatus || "Rework Needed"}):
                            </p>
                            <p className="italic mt-0.5 whitespace-pre-wrap">{item.inspectorRemarks}</p>
                          </div>
                        )}
                      </td>

                      {/* Root Cause Analysis Text Area */}
                      <td className="p-2.5 print:border-r print:border-slate-300">
                        {isReadOnly ? (
                          <p className="text-slate-700 min-h-[40px] italic whitespace-pre-wrap">{item.rootCause || "No response provided."}</p>
                        ) : (
                          <textarea
                            rows={3}
                            value={item.rootCause}
                            onChange={(e) => handleFieldChange(item.id, "rootCause", e.target.value)}
                            placeholder="Why did this occur?..."
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none print:hidden"
                          />
                        )}
                        <p className="hidden print:block text-black whitespace-pre-wrap">{item.rootCause}</p>
                      </td>

                      {/* Correction Block */}
                      <td className="p-2.5 space-y-2 print:border-r print:border-slate-300">
                        {isReadOnly ? (
                          <div className="space-y-1">
                            <p><span className="font-bold text-[10px] text-slate-400">Correction:</span> {item.correction || "—"}</p>
                            <p><span className="font-bold text-[10px] text-slate-400">CAPA:</span> {item.correctiveAction || "—"}</p>
                          </div>
                        ) : (
                          <>
                            <textarea
                              rows={2}
                              value={item.correction}
                              onChange={(e) => handleFieldChange(item.id, "correction", e.target.value)}
                              placeholder="Immediate correction..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none print:hidden"
                            />
                            <textarea
                              rows={2}
                              value={item.correctiveAction}
                              onChange={(e) => handleFieldChange(item.id, "correctiveAction", e.target.value)}
                              placeholder="Long-term systemic correction..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none print:hidden"
                            />
                          </>
                        )}
                        <div className="hidden print:block space-y-1 text-black">
                          <p><strong>Correction:</strong> {item.correction}</p>
                          <p><strong>Preventative Action:</strong> {item.correctiveAction}</p>
                        </div>
                      </td>

                      {/* Indicators & Timelines */}
                      <td className="p-2.5 space-y-2 print:border-r print:border-slate-300">
                        {isReadOnly ? (
                          <div className="space-y-1">
                            <p><span className="font-bold text-[10px] text-slate-400">Indicator:</span> {item.indicators || "—"}</p>
                            <p><span className="font-bold text-[10px] text-slate-400">Target Date:</span> {item.timeline || "—"}</p>
                          </div>
                        ) : (
                          <>
                            <input
                              type="text"
                              value={item.indicators}
                              onChange={(e) => handleFieldChange(item.id, "indicators", e.target.value)}
                              placeholder="Completion indicator..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none print:hidden"
                            />
                            <input
                              type="date"
                              value={item.timeline}
                              onChange={(e) => handleFieldChange(item.id, "timeline", e.target.value)}
                              className="w-full text-xs p-1 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none font-medium print:hidden"
                            />
                          </>
                        )}
                        <div className="hidden print:block space-y-1 text-black">
                          <p><strong>Indicator:</strong> {item.indicators}</p>
                          <p><strong>Target Date:</strong> {item.timeline}</p>
                        </div>
                      </td>

                      {/* Responsibility and File Attachment */}
                      <td className="p-2.5 space-y-1.5">
                        {isReadOnly ? (
                          <p><span className="font-bold text-[10px] text-slate-400">Role:</span> {item.responsibility || "—"}</p>
                        ) : (
                          <input
                            type="text"
                            value={item.responsibility}
                            onChange={(e) => handleFieldChange(item.id, "responsibility", e.target.value)}
                            placeholder="e.g. QA Manager"
                            className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded-md focus:ring-1 focus:ring-emerald-500 text-slate-800 outline-none print:hidden"
                          />
                        )}
                        <p className="hidden print:block text-black"><strong>Owner:</strong> {item.responsibility}</p>
                        
                        {(isCritical || isMajor) && (
                          <div className="pt-1 print:hidden">
                            {item.uploadedEvidenceUrl ? (
                              <span className="inline-block text-[9px] text-emerald-800 font-bold bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded">
                                📎 Evidence Linked
                              </span>
                            ) : !isReadOnly && (
                              <label className="relative cursor-pointer inline-flex items-center justify-center w-full px-1.5 py-1 bg-slate-100 hover:bg-slate-200 border border-slate-300 text-[9px] font-bold rounded text-slate-700 text-center">
                                <span>{isUploading === item.id ? "Syncing..." : "📤 Attach PDF"}</span>
                                <input 
                                  type="file" 
                                  accept=".pdf" 
                                  className="hidden" 
                                  onChange={(e) => handleFileUpload(item.id, e)} 
                                  disabled={isUploading !== null}
                                />
                              </label>
                            )}
                          </div>
                        )}
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Corporate Signatures Authentication Block */}
        <div className="border-t border-slate-200 pt-4 page-break-inside-avoid">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Responsible Person signature input */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs print:bg-transparent print:border-none">
              <p className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 flex justify-between print:text-black print:border-black">
                <span>👤 Responsible Person Sign-off</span>
              </p>
              <div className="space-y-1.5">
                <p><span className="text-slate-500 print:text-black">Name:</span> <span className="font-bold underline">{responsiblePerson.name || "______________________"}</span></p>
                <p><span className="text-slate-500 print:text-black">Date:</span> <span className="font-mono underline">{responsiblePerson.date || "______________________"}</span></p>
                {!isReadOnly && (
                  <div className="pt-1 space-y-1 print:hidden">
                    <input
                      type="text"
                      placeholder="Type name to sign digitally"
                      value={responsiblePerson.name}
                      onChange={(e) => setResponsiblePerson(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="date"
                      value={responsiblePerson.date}
                      onChange={(e) => setResponsiblePerson(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-1 bg-white border border-slate-300 rounded text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

            {/* Managing Director signature input */}
            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2 text-xs print:bg-transparent print:border-none">
              <p className="font-bold text-slate-900 border-b border-slate-200 pb-0.5 flex justify-between print:text-black print:border-black">
                <span>🏢 Managing Director Endorsement</span>
              </p>
              <div className="space-y-1.5">
                <p><span className="text-slate-500 print:text-black">Name:</span> <span className="font-bold underline">{managingDirector.name || "______________________"}</span></p>
                <p><span className="text-slate-500 print:text-black">Date:</span> <span className="font-mono underline">{managingDirector.date || "______________________"}</span></p>
                {!isReadOnly && (
                  <div className="pt-1 space-y-1 print:hidden">
                    <input
                      type="text"
                      placeholder="Type MD name to endorse"
                      value={managingDirector.name}
                      onChange={(e) => setManagingDirector(prev => ({ ...prev, name: e.target.value }))}
                      className="w-full p-1.5 bg-white border border-slate-300 rounded text-slate-800 outline-none focus:ring-1 focus:ring-emerald-500"
                    />
                    <input
                      type="date"
                      value={managingDirector.date}
                      onChange={(e) => setManagingDirector(prev => ({ ...prev, date: e.target.value }))}
                      className="w-full p-1 bg-white border border-slate-300 rounded text-slate-800 outline-none"
                    />
                  </div>
                )}
              </div>
            </div>

          </div>
        </div>

        {/* Submission Action Bar */}
        {!isReadOnly && (
          <div className="border-t border-slate-200 pt-3 flex justify-end print:hidden">
            <button
              type="submit"
              disabled={isSubmitting}
              className={`px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs rounded-lg transition-all shadow-md tracking-wide uppercase inline-flex items-center gap-2 ${
                isSubmitting ? "opacity-75 cursor-not-allowed" : ""
              }`}
            >
              {isSubmitting ? (
                <>
                  <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Transmitting Ledger...</span>
                </>
              ) : (
                <>
                  🚀 Finalize & Transmit CAPA Ledger to VMAP Desk
                </>
              )}
            </button>
          </div>
        )}

      </form>
      
      {/* Footer Stamp Layout */}
      <div className="bg-slate-950 px-6 py-4 border-t border-slate-800 flex justify-between items-center text-[10px] text-slate-400 font-mono print:text-black print:bg-transparent print:border-t print:border-slate-400">
        <p>Authenticated via NAFDAC QMS Digital Engine v2.4</p>
        <p className="italic text-slate-600 print:text-black">For: Director-General (NAFDAC) • Mudashir I. A</p>
      </div>

    </div>
  );
}