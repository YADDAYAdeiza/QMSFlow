"use client";
// @/components/LocalInspectionReports/GMPReportWorkspace.tsx

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { executeInspectionReportTransition } from "@/lib/LocalInspectionReports/inspectionReportsEngine";
import InspectionChecklistForm from "./InspectionChecklistForm";  

interface CommentTrailItem {
  text: string;
  action: "FORWARD" | "REWORK" | "RECALL";
  fromStep: string;
  toStep: string;
  actorName: string;
  timestamp: string;
  actorId?: string;
  assignedToId?: string;
}

interface WorkspaceProps {
  applicationId: string;
  companyId: string;
  companyName: string;
  activeUserName?: string; // 👈 Captured from current session context (e.g., "Roseline")
  initialStepKey?: keyof typeof inspectionReportWorkflow.steps; 
  initialReportHtml?: string | null;
  initialChecklistSnapshot?: any;
  initialComments?: CommentTrailItem[]; 
}

export default function GMPReportWorkspace({
  applicationId,
  companyId,
  companyName,
  activeUserName = "Roseline", // Fallback default for session alignment
  initialStepKey = "DDD_TECHNICAL_ASSIGNMENT",
  initialReportHtml = null,
  initialChecklistSnapshot = null,
  initialComments = []
}: WorkspaceProps) {
  const router = useRouter();
  
  // Core workflow states
  const [currentStep, setCurrentStep] = useState<keyof typeof inspectionReportWorkflow.steps>(initialStepKey);
  const [remarks, setRemarks] = useState("");
  const [selectedStaff, setSelectedStaff] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Real-time audit history log tracking
  const [commentsList, setCommentsList] = useState<CommentTrailItem[]>(initialComments);
  const [reportHtml, setReportHtml] = useState<string | null>(initialReportHtml);
  const [checklistSnapshot, setChecklistSnapshot] = useState<any>(initialChecklistSnapshot);

  const activeStepConfig = inspectionReportWorkflow.steps[currentStep];

  // 🌟 SECURITY BOUNDARY: Evaluate if the active session user is authorized to forward dossiers
  const isAuthorizedToForward = activeUserName.trim().toLowerCase() === "roseline";

  const staffDirectory = [
    { id: "usr_201", name: "Aliyu Ahmed", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_202", name: "Chidi Okafor", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_203", name: "Fatima Umar", division: "IRSD", role: "IRSD Staff Reviewer" }
  ];

  const defaultChecklistData = {
    pqs_score: 100,
    premises_equipment_score: 85,
    personnel_score: 100,
    qualification_validation_score: 90,
    material_management_score: 100,
    laboratory_control_score: 100,
    final_recommendation: "PENDING",
    observations: []
  };

  const currentLiveChecklistData = checklistSnapshot || defaultChecklistData;

  const handleAICorrelationCompile = async (completedFormPayload: any) => {
    try {
      console.log("Transmitting payload to synthesis engine...");
      setChecklistSnapshot(completedFormPayload);

      const res = await fetch("/api/LocalInspectionReports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...completedFormPayload,
          application_id: applicationId, 
          report_doc_number: `NAFDAC/VMD/GMP/${applicationId}/2026`,
          inspected_site_name: companyName,
        }),
      });
      
      const outcome = await res.json();
      if (outcome.success) {
        setReportHtml(outcome.report_html);
        alert("AI Technical Report Narrative compiled successfully under SOP Ref. No. DER-800-06! Form snapshot auto-saved.");
        router.refresh(); 
      } else {
        alert("Synthesis aborted: " + outcome.error);
      }
    } catch (err: any) {
      console.error("Network sync failure:", err);
      alert(`Execution Error: ${err.message}`);
    }
  };

  const handleTransition = async (direction: "FORWARD" | "REWORK") => {
    // Fail-safe validation for forward path permissions
    if (direction === "FORWARD" && !isAuthorizedToForward) {
      alert("Unauthorized Operation: Forwarding clearance restricted to Roseline.");
      return;
    }

    if (!remarks.trim()) {
      alert("Please provide official directives/minutes before moving this file.");
      return;
    }

    setIsSubmitting(true);
    try {
      if (currentStep === "DIRECTOR_FINAL_SIGN_OFF") {
        console.log("Routing via structural endpoint handler matrix...");
        const transitionRes = await fetch("/api/LocalInspectionReports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            currentStepKey: currentStep,
            direction,
            companyName,
            checklistSnapshot: currentLiveChecklistData
          })
        });

        const transitionData = await transitionRes.json();
        if (!transitionRes.ok || !transitionData.success) {
          throw new Error(transitionData.error || "Integrated endpoint transition rejected.");
        }
      }

      const res = await executeInspectionReportTransition({
        applicationId: Number(applicationId),
        currentStepKey: currentStep,
        direction,
        actingUserId: "usr_active_session", 
        actingUserName: `${activeUserName} (${activeStepConfig.division})`,
        targetUserId: direction === "FORWARD" ? (selectedStaff || "next-desk-holder-id") : "return-desk-holder-id",
        remarks: remarks
      });

      if (res.success && "arrivedAt" in res && res.arrivedAt) {
        const nextStepKey = res.arrivedAt as keyof typeof inspectionReportWorkflow.steps;
        
        let targetStepTitle = inspectionReportWorkflow.steps[nextStepKey]?.title || "Archived Desk";
        if (currentStep === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
          targetStepTitle = currentLiveChecklistData?.final_recommendation === "PENDING"
            ? "Applicant Notification Hub - CAPA Request Issued"
            : "Applicant Notification Hub - Final Approval Certified";
        }

        const newMinute: CommentTrailItem = {
          text: remarks,
          action: direction,
          fromStep: activeStepConfig.title,
          toStep: targetStepTitle,
          actorName: `${activeUserName} (${activeStepConfig.division})`,
          timestamp: new Date().toISOString()
        };

        setCommentsList(prev => [newMinute, ...prev]);
        alert(`Dossier successfully routed to: ${targetStepTitle}`);
        
        setRemarks("");
        setSelectedStaff("");
        setCurrentStep(nextStepKey);
        router.refresh(); 
      } else {
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
      
      {/* Simulation Rig */}
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
              <option key={key} value={key}>
                {key.replace("DDD", "Divisional Deputy Director")} - {inspectionReportWorkflow.steps[key as keyof typeof inspectionReportWorkflow.steps].title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Header Panel */}
      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-6">
        <div className="p-6 border-b border-slate-100 bg-gradient-to-r from-slate-900 to-slate-800 text-white">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500 text-white mb-2 shadow-sm uppercase tracking-wider">
                ⚙️ Status: {activeStepConfig?.statusLabel || "Processing"}
              </span>
              <h1 className="text-2xl font-bold tracking-tight">{companyName}</h1>
              <p className="text-slate-300 text-xs mt-1">
                Dossier Tracking Number: <span className="font-mono bg-slate-700 px-1.5 py-0.5 rounded text-amber-300"># {applicationId}</span> 
                {" "}• Company Code: {companyId}
              </p>
            </div>
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-sm">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Current Custody Desk</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5">{activeStepConfig?.title}</p>
              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                <p>Division: <span className="font-bold text-white">{activeStepConfig?.division}</span></p>
                <p>Authorized Actor: <span className="italic text-white">{activeStepConfig?.role}</span></p>
                <p>Current User Session: <span className="font-bold text-amber-400 font-mono">{activeUserName}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-slate-50">
          
          {/* Main Form Fields Column */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Primary Report PDF Handle */}
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

            {/* Generated Compliance Text Narrative Preview */}
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

            {/* Structured Form Entry Blocks */}
            <InspectionChecklistForm
              initialData={currentLiveChecklistData}
              onSave={handleAICorrelationCompile}
              isReadOnly={currentStep !== "STAFF_TECHNICAL_REVIEW" && currentStep !== "LOD_INTAKE"} 
            />

            {/* Historical Minute Ledger Block */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider text-slate-700">
                📋 Official QMS Minute Sheet Log
              </h3>
              
              {commentsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No tracking entries found on this ledger yet.</p>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 space-y-4 ml-2 mt-2">
                  {commentsList.map((item, index) => {
                    const isRework = item.action === "REWORK";
                    return (
                      <div key={index} className="relative text-xs">
                        <span className={`absolute -left-[21px] top-1 flex h-[13px] w-[13px] rounded-full border-2 bg-white ${isRework ? "border-rose-500" : "border-emerald-500"}`} />
                        
                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-2xs">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/60 pb-1.5 mb-2">
                            <div>
                              <span className="font-bold text-slate-800">{item.actorName}</span>
                              <span className={`ml-2 inline-flex items-center rounded-md px-1.5 py-0.5 text-[10px] font-bold ring-1 ring-inset ${isRework ? "bg-rose-50 text-rose-700 ring-rose-600/20" : "bg-emerald-50 text-emerald-700 ring-emerald-600/20"}`}>
                                {item.action}
                              </span>
                            </div>
                            <span className="text-[10px] font-mono text-slate-400">
                              {new Date(item.timestamp).toLocaleString("en-GB")}
                            </span>
                          </div>
                          
                          <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{item.text}</p>
                          
                          <div className="mt-2 pt-1 border-t border-dashed border-slate-200 text-[10px] text-slate-500 flex flex-wrap gap-x-3">
                            <p>From: <span className="font-semibold text-slate-600">{item.fromStep}</span></p>
                            <p>➔ Destination: <span className="font-semibold text-slate-600">{item.toStep}</span></p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Action Dashboard Sidebar */}
          <div className="space-y-6">
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-emerald-500" />
              <h3 className="text-sm font-bold mb-4 uppercase tracking-wider text-slate-700">
                ⚡ Desk Operations Control
              </h3>
              
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

              {currentStep === "DIRECTOR_FINAL_SIGN_OFF" && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed animate-fadeIn">
                  <strong>📋 Adjudication Check:</strong> The checklist snapshot current recommendation reads:{" "}
                  <span className="font-bold underline text-amber-800">
                    {currentLiveChecklistData?.final_recommendation || "PENDING"}
                  </span>. 
                  Signing off will mutate the application status profile and dispatch notification files.
                </div>
              )}

              <div className="mb-4">
                <label className="block text-[11px] font-bold text-slate-700 mb-1.5 uppercase tracking-wide">
                  Official Minutes / Directives
                </label>
                <textarea 
                  rows={4}
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  placeholder={
                    currentStep === "DIRECTOR_FINAL_SIGN_OFF"
                      ? (currentLiveChecklistData?.final_recommendation === "PENDING"
                          ? "Provide official directive text to issue with the CAPA requirement..."
                          : "Enter validation clearance minutes for final certified sign-off...")
                      : `Provide dynamic feedback or instructions as ${activeStepConfig?.role || "Reviewer"}...`
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>

              <div className="space-y-2">
                {currentStep === "DIRECTOR_FINAL_SIGN_OFF" ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting || !isAuthorizedToForward}
                      onClick={() => {
                        const recommendation = currentLiveChecklistData?.final_recommendation || "PENDING";
                        const msg = recommendation === "PENDING"
                          ? "Confirm sign-off on inspection report and dispatch CAPA Directive to applicant profile?"
                          : "Confirm absolute final certification and release of official GMP Certificate?";
                        if (window.confirm(msg)) handleTransition("FORWARD");
                      }}
                      className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center border disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed ${
                        currentLiveChecklistData?.final_recommendation === "PENDING"
                          ? "bg-amber-600 hover:bg-amber-700 border-amber-700 shadow-amber-600/10"
                          : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-600/10"
                      }`}
                    >
                      {isSubmitting 
                        ? "Processing Action..." 
                        : !isAuthorizedToForward
                        ? "🔒 Forwarding Restricted to Roseline"
                        : currentLiveChecklistData?.final_recommendation === "PENDING"
                        ? "✍️ Approve & Issue CAPA Directive"
                        : "✍️ Concur & Grant Final Approval"}
                    </button>

                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => {
                        if (window.confirm("Are you sure you want to revert this report to the technical pool desk for revision?")) {
                          handleTransition("REWORK");
                        }
                      }}
                      className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 text-xs font-bold rounded-lg transition-all text-center"
                    >
                      ↩️ Rework / Send Back to Technical Desk
                    </button>
                  </>
                ) : (
                  <>
                    {activeStepConfig?.nextStepKey && (
                      <button
                        type="button"
                        disabled={isSubmitting || !isAuthorizedToForward || (currentStep === "DDD_TECHNICAL_ASSIGNMENT" && !selectedStaff) || (currentStep === "DDD_IRSD_INTAKE" && !selectedStaff)}
                        onClick={() => handleTransition("FORWARD")}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center"
                      >
                        {isSubmitting 
                          ? "Routing..." 
                          : !isAuthorizedToForward 
                          ? "🔒 Forwarding Restricted to Roseline" 
                          : currentStep.includes("DDD") 
                          ? "✍️ Sign Minutes & Forward Desk" 
                          : "🚀 Dispatch Dossier Forward"}
                      </button>
                    )}

                    {activeStepConfig?.prevStepKey && (
                      <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={() => handleTransition("REWORK")}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-rose-50 border border-rose-200 text-rose-700 hover:bg-rose-100 disabled:bg-slate-100 disabled:text-slate-400 text-xs font-bold rounded-lg transition-all text-center"
                      >
                        ↩️ Return to Previous Desk for Rework
                      </button>
                    )}
                  </>
                )}
              </div>

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}