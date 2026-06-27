// @/components/LocalInspectionReports/GMPReportWorkspace.tsx
"use client";

import InspectionChecklistForm from "./InspectionChecklistForm";  

import { useState } from "react";
import { useRouter } from "next/navigation";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { executeInspectionReportTransition } from "@/lib/LocalInspectionReports/inspectionReportsEngine";

interface WorkspaceProps {
  applicationId: string;
  companyId: string;
  companyName: string;
  initialStepKey?: keyof typeof inspectionReportWorkflow.steps; 
}

export default function GMPReportWorkspace({
  applicationId,
  companyId,
  companyName,
  initialStepKey = "DDD_TECHNICAL_ASSIGNMENT"
}: WorkspaceProps) {
  const router = useRouter();
  
  // Core workflow node is driven by database values but handles local testing overrides smoothly
  const [currentStep, setCurrentStep] = useState<keyof typeof inspectionReportWorkflow.steps>(initialStepKey);
  const [remarks, setRemarks] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Local state to store the AI compiled text blocks across workflow hands
  const [reportHtml, setReportHtml] = useState<string | null>(null);

  const activeStepConfig = inspectionReportWorkflow.steps[currentStep];

  // System Desk Officer Directory for NAFDAC assignments
  const staffDirectory = [
    { id: "usr_201", name: "Aliyu Ahmed", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_202", name: "Chidi Okafor", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_203", name: "Fatima Umar", division: "IRSD", role: "IRSD Staff Reviewer" }
  ];

  // Pipeline hook that marshals telemetry payload into narrative compliance prose
  const handleAICorrelationCompile = async (completedFormPayload: any) => {
    try {
      console.log("Transmitting payload to synthesis engine...");
      
      const res = await fetch("/api/LocalInspectionReports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...completedFormPayload,
          report_doc_number: `NAFDAC/VMD/GMP/${applicationId}/2026`,
          inspected_site_name: companyName,
        }),
      });
      
      const outcome = await res.json();
      
      if (outcome.success) {
        setReportHtml(outcome.report_html);
      } else {
        alert("Synthesis aborted: " + outcome.error);
      }
    } catch (err: any) {
      console.error("Network sync failure:", err);
      alert(`Execution Error: ${err.message}`);
    }
  };

  const handleTransition = async (direction: "FORWARD" | "REWORK") => {
    if (!remarks.trim()) {
      alert("Please provide official directives/minutes before moving this file.");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await executeInspectionReportTransition({
        applicationId: Number(applicationId),
        currentStepKey: currentStep,
        direction,
        actingUserId: "usr_active_session", 
        actingUserName: `Officer (${activeStepConfig.division})`,
        targetUserId: direction === "FORWARD" ? (selectedStaff || "next-desk-holder-id") : "return-desk-holder-id",
        remarks: remarks
      });

      // 🟩 FIX: Type narrowing via an explicit truthy check on res.success
      if (res.success && "arrivedAt" in res && res.arrivedAt) {
        const nextStepKey = res.arrivedAt as keyof typeof inspectionReportWorkflow.steps;
        
        alert(`Dossier successfully routed to: ${inspectionReportWorkflow.steps[nextStepKey].title}`);
        setCurrentStep(nextStepKey);
        setRemarks("");
        setSelectedStaff("");
        router.refresh(); 
      } else {
        // 🟩 FIX: Safely extract error since TypeScript now knows success is false
        const errorMsg = ("error" in res && res.error) ? String(res.error) : "Unknown routing error";
        alert(`Routing Matrix Error: ${errorMsg}`);
      }
    } catch (err: any) {
      alert(`Execution Error: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      
      {/* DEVELOPMENT TASK TOGGLE RIG (Remove or comment out before final production push) */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h4 className="text-amber-800 font-bold text-sm uppercase tracking-wide">🔬 QMS Workflow Simulation Rig</h4>
          <p className="text-xs text-amber-700">Manually select a desk step below to preview the interface as seen by different NAFDAC officials.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-amber-900">Active Desk View:</label>
          <select 
            value={currentStep} 
            onChange={(e) => setCurrentStep(e.target.value as any)}
            className="text-xs bg-white border border-amber-300 rounded p-1.5 font-semibold text-slate-800 focus:outline-amber-500"
          >
            {Object.keys(inspectionReportWorkflow.steps).map((key) => (
              <option key={key} value={key}>{key} - {inspectionReportWorkflow.steps[key as keyof typeof inspectionReportWorkflow.steps].title}</option>
            ))}
          </select>
        </div>
      </div>

      {/* WORKSPACE HEADER MATRIX */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white mb-2 shadow-sm uppercase tracking-wider">
                ⚙️ Status: {activeStepConfig.statusLabel}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
              <p className="text-slate-300 text-xs mt-1">
                Dossier Tracking Number: <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded text-amber-300"># {applicationId}</span> 
                {" "}• Company Code: {companyId}
              </p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-sm">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Current Custody Desk</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{activeStepConfig.title}</p>
              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                <p>Division: <span className="font-bold text-white">{activeStepConfig.division}</span></p>
                <p>Authorized Actor: <span className="italic text-white">{activeStepConfig.role}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* OPERATIONS CONTEXT GRID */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-slate-50">
          
          {/* CONTENT COLUMNS */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* DOCUMENT CARD PANEL */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider text-slate-700">
                📄 Primary Inspection Review Documentation
              </h3>
              <div className="bg-slate-50 border border-slate-200 border-dashed rounded-lg p-6 text-center">
                <div className="mx-auto w-12 h-12 rounded bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-sm mb-2 shadow-inner">PDF</div>
                <p className="font-bold text-xs text-slate-800 mb-0.5">OKL-LA-PRI-01-2026_Final.pdf</p>
                <p className="text-slate-500 text-[11px] mb-3">Pre-Registration Inspection Report — Oral Liquid Dosage (OLD) Line</p>
                <button type="button" className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-300 text-xs font-bold rounded-lg bg-white text-slate-700 hover:bg-slate-50 transition-all shadow-sm">
                  👁️ Launch Regulatory Document Viewer
                </button>
              </div>
            </div>

            {/* LIVE NARRATIVE PREVIEW PANEL */}
            {reportHtml && (
              <div className="bg-white rounded-xl p-6 border border-emerald-200 shadow-sm animate-fadeIn">
                <h3 className="text-sm font-bold text-emerald-900 border-b border-emerald-100 pb-3 mb-4 uppercase tracking-wider flex items-center gap-2">
                  <span>📝</span> SOP Ref. No. DER-800-06 Compiled Narrative Draft
                </h3>
                <div 
                  className="prose prose-sm max-w-none text-slate-800 prose-headings:text-slate-900 prose-strong:text-slate-900 prose-ul:list-disc prose-p:leading-relaxed bg-slate-50/50 p-4 border border-slate-100 rounded-lg"
                  dangerouslySetInnerHTML={{ __html: reportHtml }}
                />
              </div>
            )}

            {/* INTEGRATED DATA ENTRY CHECKLIST COMPONENT */}
            <InspectionChecklistForm
              initialData={{
                pqs_score: 100,
                premises_equipment_score: 85,
                personnel_score: 100,
                qualification_validation_score: 90,
                material_management_score: 100,
                laboratory_control_score: 100,
                observations: []
              }}
              onSave={handleAICorrelationCompile}
              isReadOnly={currentStep !== "STAFF_TECHNICAL_REVIEW" && currentStep !== "LOD_INTAKE"} 
            />

            {/* AUTOMATED COMPLIANCE AUDIT TIMELINE TRACKER */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider text-slate-700">
                ⏱️ QMS Tracking Ledger & Time-on-Task
              </h3>
              <p className="text-xs text-slate-500 italic bg-slate-50 p-3 rounded-lg border border-slate-200">
                Turnaround logs are automatically calculated down to the second when file handshakes execute. This keeps operations compliant with QMS audit benchmarks.
              </p>
            </div>
          </div>

          {/* DESK ACTION CONTROL SIDEBAR */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-700">
                ⚡ Desk Operations Control
              </h3>
              
              {/* INTERFACE ELEMENT 1: DIVISIONAL DEPUTY DIRECTOR ASSIGNMENT BOX */}
              {currentStep === "DDD_TECHNICAL_ASSIGNMENT" && (
                <div className="mb-4 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Assign Technical Desk Officer
                  </label>
                  <select 
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-slate-800"
                  >
                    <option value="">-- Choose VMD Officer --</option>
                    {staffDirectory.filter(s => s.division === "VMD").map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* INTERFACE ELEMENT 2: IRSD DESK DISPATCH BOX */}
              {currentStep === "DDD_IRSD_INTAKE" && (
                <div className="mb-4 animate-fadeIn">
                  <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                    Assign Compliance Vetter
                  </label>
                  <select 
                    value={selectedStaff}
                    onChange={(e) => setSelectedStaff(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 font-medium focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-slate-800"
                  >
                    <option value="">-- Choose IRSD Officer --</option>
                    {staffDirectory.filter(s => s.division === "IRSD").map(staff => (
                      <option key={staff.id} value={staff.id}>{staff.name} ({staff.role})</option>
                    ))}
                  </select>
                </div>
              )}

              {/* FEEDBACK ENTRY COMPONENT */}
              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Official Minutes / Directives
                </label>
                <textarea 
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={`Provide dynamic feedback or instructions as ${activeStepConfig.role}...`}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* ACTION PACK VECTOR */}
              <div className="space-y-2">
                {activeStepConfig.nextStepKey && (
                  <button
                    type="button"
                    disabled={isSubmitting || (currentStep === "DDD_TECHNICAL_ASSIGNMENT" && !selectedStaff) || (currentStep === "DDD_IRSD_INTAKE" && !selectedStaff)}
                    onClick={() => handleTransition("FORWARD")}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center"
                  >
                    {isSubmitting ? "Routing..." : currentStep.includes("DDD") ? "✍️ Sign Minutes & Forward Desk" : "🚀 Dispatch Dossier Forward"}
                  </button>
                )}

                {activeStepConfig.prevStepKey && (
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleTransition("REWORK")}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-lg transition-all text-center"
                  >
                    ↩️ Return to Previous Desk for Rework
                  </button>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}