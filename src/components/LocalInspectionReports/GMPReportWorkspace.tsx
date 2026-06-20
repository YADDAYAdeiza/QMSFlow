"use client";

import React, { useState } from "react";
import { Loader2, Save, FileText, Send, CheckCircle, Database } from "lucide-react";

interface WorkspaceProps {
  applicationId: string;
  companyId: string;
  companyName: string;
}

export default function GMPReportWorkspace({ applicationId, companyId, companyName }: WorkspaceProps) {
  const [activeStep, setActiveStep] = useState<"checklist" | "editor">("checklist");
  const [generationLoading, setGenerationLoading] = useState(false);
  const [dbSaving, setDbSaving] = useState(false);
  
  // Telemetry Inputs
  const [docNumber, setDocNumber] = useState(`OKL-LA-PRI-${new Date().getFullYear()}-001`);
  const [inspectionType, setInspectionType] = useState("PRI");
  const [pqsPositives, setPqsPositives] = useState("");
  const [pqsDeficiencies, setPqsDeficiencies] = useState("");
  const [premisesPositives, setPremisesPositives] = useState("");
  const [premisesDeficiencies, setPremisesDeficiencies] = useState("");
  
  // Active Rich Text Payload Container
  const [editorContent, setEditorContent] = useState("");

  const getStructuredChecklist = () => ({
    pqs_positives: pqsPositives.split("\n").filter(Boolean),
    pqs_deficiencies: pqsDeficiencies.split("\n").filter(Boolean),
    premises_positives: premisesPositives.split("\n").filter(Boolean),
    premises_deficiencies: premisesDeficiencies.split("\n").filter(Boolean),
  });

  const handleGenerateDraft = async () => {
    setGenerationLoading(true);
    try {
      const response = await fetch("/api/gmp-report/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          report_doc_number: docNumber,
          type_of_inspection: inspectionType,
          company_name: companyName,
          checklist_raw: getStructuredChecklist(),
        }),
      });

      const data = await response.json();
      if (data.success) {
        setEditorContent(data.report_html);
        setActiveStep("editor");
      } else {
        alert("Generation Failure: " + data.error);
      }
    } catch (err) {
      alert("Failed to connect to generation engine.");
    } finally {
      setGenerationLoading(false);
    }
  };

  const handlePersistToDatabase = async (dispatchForReview: boolean) => {
    setDbSaving(true);
    try {
      const response = await fetch("/api/gmp-report/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          companyId,
          reportDocNumber: docNumber,
          typeOfInspection: inspectionType,
          checklistRaw: getStructuredChecklist(),
          reportHtml: editorContent,
          dispatchForReview
        }),
      });

      const data = await response.json();
      if (data.success) {
        alert(dispatchForReview 
          ? "Report successfully routed to the review queue!" 
          : "Draft successfully saved in Local Inspection Reports vault."
        );
      } else {
        alert("Database Sync Failed: " + data.error);
      }
    } catch (err) {
      alert("Network exception writing to database schema.");
    } finally {
      setDbSaving(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto p-6 bg-slate-50 min-h-screen text-slate-900">
      
      <header className="mb-8 border-b border-slate-200 pb-4 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-blue-600 font-black text-[10px] uppercase tracking-widest mb-1">
            <Database className="w-3 h-3" /> Isolated Table Mode: local_inspection_reports
          </div>
          <h1 className="text-2xl font-black uppercase tracking-tight text-slate-900 italic">
            Local GMP Report Compiler
          </h1>
          <p className="text-xs text-slate-500 font-bold uppercase mt-0.5">
            Target Site: <span className="text-slate-900 font-black">{companyName}</span>
          </p>
        </div>
        <div className="flex items-center gap-2 bg-white p-1.5 rounded-2xl border shadow-sm">
          <button
            onClick={() => setActiveStep("checklist")}
            className={`px-4 py-2 text-[11px] font-black uppercase rounded-xl transition-all ${
              activeStep === "checklist" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            1. Fields Inventory
          </button>
          <button
            disabled={!editorContent}
            onClick={() => setActiveStep("editor")}
            className={`px-4 py-2 text-[11px] font-black uppercase rounded-xl transition-all ${
              activeStep === "editor" ? "bg-slate-900 text-white shadow-sm" : "text-slate-600 hover:bg-slate-50 disabled:opacity-40"
            }`}
          >
            2. Narrative Engine Editor
          </button>
        </div>
      </header>

      {activeStep === "checklist" && (
        <div className="space-y-6 bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-xl">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Report Document Number (SOP Reference)
              </label>
              <input
                type="text"
                value={docNumber}
                onChange={(e) => setDocNumber(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-mono font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                Type of Inspection
              </label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm font-bold text-slate-700 focus:outline-none focus:border-blue-500"
              >
                <option value="PPI">Pre-Production Inspection (PPI)</option>
                <option value="PRI">Pre-Registration Inspection (PRI)</option>
                <option value="RI">Routine Inspection (RI)</option>
                <option value="FUI">Follow-Up (CAPA Verification)</option>
              </select>
            </div>
          </div>

          <hr className="border-slate-100" />

          {/* SYSTEM FIELDS PANEL */}
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-3 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> System I: Pharmaceutical Quality System (PQS)
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <textarea
                  rows={3}
                  placeholder="Compliance Marks Sighted (One entry per row)..."
                  value={pqsPositives}
                  onChange={(e) => setPqsPositives(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                />
                <textarea
                  rows={3}
                  placeholder="Deficiencies / Non-Conformances Found..."
                  value={pqsDeficiencies}
                  onChange={(e) => setPqsDeficiencies(e.target.value)}
                  className="w-full bg-slate-50/50 border border-red-100 rounded-xl p-3 text-xs text-red-700 placeholder-red-300 focus:outline-none focus:border-red-400"
                />
              </div>
            </div>

            <div>
              <h3 className="text-xs font-black uppercase text-blue-600 tracking-widest mb-3 flex items-center gap-2">
                <CheckCircle className="w-3.5 h-3.5" /> System II: Premises and Equipment
              </h3>
              <div className="grid grid-cols-1 gap-3">
                <textarea
                  rows={3}
                  placeholder="Compliance Marks Sighted (One entry per row)..."
                  value={premisesPositives}
                  onChange={(e) => setPremisesPositives(e.target.value)}
                  className="w-full bg-slate-50/50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                />
                <textarea
                  rows={3}
                  placeholder="Deficiencies / Non-Conformances Found..."
                  value={premisesDeficiencies}
                  onChange={(e) => setPremisesDeficiencies(e.target.value)}
                  className="w-full bg-slate-50/50 border border-red-100 rounded-xl p-3 text-xs text-red-700 placeholder-red-300 focus:outline-none focus:border-red-400"
                />
              </div>
            </div>
          </div>

          <button
            onClick={handleGenerateDraft}
            disabled={generationLoading}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-black uppercase tracking-wider text-xs py-4 rounded-2xl flex items-center justify-center gap-2 transition-all disabled:opacity-50 shadow-md"
          >
            {generationLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" /> Transpiling narrative sequences via Gemini AI...
              </>
            ) : (
              <>
                <FileText className="w-4 h-4" /> Parse Audit Matrix to Live Editor
              </>
            )}
          </button>
        </div>
      )}

      {activeStep === "editor" && (
        <div className="space-y-4">
          <div className="bg-slate-900 border border-slate-800 px-6 py-3.5 rounded-2xl text-[10px] text-slate-300 font-black uppercase tracking-widest flex items-center gap-2 shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Contenteditable engine mounted. Make inline edits below.
          </div>

          <div className="bg-white rounded-[2.5rem] shadow-xl border border-slate-200 overflow-hidden">
            <div
              contentEditable
              suppressContentEditableWarning
              onBlur={(e) => setEditorContent(e.currentTarget.innerHTML)}
              dangerouslySetInnerHTML={{ __html: editorContent }}
              className="p-16 min-h-[550px] text-sm leading-relaxed text-slate-800 focus:outline-none prose max-w-none font-medium"
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => handlePersistToDatabase(false)}
              disabled={dbSaving}
              className="bg-white border border-slate-200 text-slate-700 px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-2 hover:bg-slate-50 disabled:opacity-50 transition-all"
            >
              <Save className="w-4 h-4 text-slate-400" /> Save Local Draft
            </button>
            <button
              onClick={() => handlePersistToDatabase(true)}
              disabled={dbSaving}
              className="bg-blue-600 text-white px-6 py-3.5 rounded-xl text-[11px] font-black uppercase tracking-wide flex items-center gap-2 hover:bg-blue-700 disabled:opacity-50 transition-all shadow-md"
            >
              <Send className="w-4 h-4" /> Dispatch to Review Pipeline
            </button>
          </div>
        </div>
      )}
    </div>
  );
}