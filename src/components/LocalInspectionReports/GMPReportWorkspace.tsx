"use client";
// @/components/LocalInspectionReports/GMPReportWorkspace.tsx

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { executeInspectionReportTransition } from "@/lib/LocalInspectionReports/inspectionReportsEngine";
import InspectionChecklistForm from "./InspectionChecklistForm";  

const BASE_CHECKLIST_TEMPLATE = {
  // Step 1: Meta & History
  report_doc_number: "OKL-LA-PRI-01-2026",
  inspection_dates: "",
  type_of_inspection: "PRI",
  inspected_site_name: "Orange Kalbe Limited",
  site_contact_details: { 
    phone: "", 
    email: "", 
    website: "" 
  },
  activities_carried_out: [] as string[],
  vicinity_assessment: "",
  lead_inspector: "",
  co_inspectors: "",
  historical_baseline: {
    prev_date_type: "",
    prev_team: "",
    past_capa_status: "",
    major_changes: ""
  },
  // Step 2: The 6 Quality Systems (Defaulted to 100% grades and clean notes strings)
  pqs_score: 100, 
  pqs_notes: "",
  personnel_score: 100, 
  personnel_notes: "",
  premises_equipment_score: 100, 
  premises_equipment_notes: "",
  qualification_validation_score: 100, 
  qualification_validation_notes: "",
  material_management_score: 100, 
  material_management_notes: "",
  laboratory_control_score: 100, 
  laboratory_control_notes: "",
  // Step 3: Synthesis
  critical_count: 0,
  major_count: 0,
  other_count: 0,
  observations: [] as Array<{ id: string; severity: "critical" | "major" | "other"; text: string }>,
  final_recommendation: "PENDING"
};

interface CommentTrailItem {
  text: string;
  action: "FORWARD" | "REWORK" | "RECALL";
  fromStep: string;
  toStep: string;
  actorName: string;
  timestamp: string;
  processingDurationSeconds?: number; // ⏱️ Added for QMS staff tracking metrics
  actorId?: string;
  assignedToId?: string;
}

interface WorkspaceProps {
  applicationId: string;
  companyId: string;
  companyName: string;
  activeUserName?: string; 
  initialStepKey?: keyof typeof inspectionReportWorkflow.steps; 
  initialReportHtml?: string | null;
  initialChecklistSnapshot?: any;
  initialComments?: CommentTrailItem[]; 
}

export default function GMPReportWorkspace({
  applicationId,
  companyId,
  companyName,
  activeUserName = "Roseline", 
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
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // ⏱️ QMS Performance Tracking: Record when the user started working on the active desk step
  const [stepEntryTime, setStepEntryTime] = useState<number>(Date.now());

  useEffect(() => {
    // Reset timer whenever the custody desk updates
    setStepEntryTime(Date.now());
    console.log('Timer reset')
  }, [currentStep]);

  // DIAGNOSTIC LOG
  console.log("🔐 SECURITY CHECK - Active User Prop:", {
    receivedValue: activeUserName,
    type: typeof activeUserName,
    isMatch: activeUserName.trim().toLowerCase() === "roseline"
  });
  
  // Real-time audit history log tracking
  const [commentsList, setCommentsList] = useState<CommentTrailItem[]>(initialComments);
  const [reportHtml, setReportHtml] = useState<string | null>(initialReportHtml);
  
  // Hoisted state initialized with BASE_CHECKLIST_TEMPLATE as fallback
  const [checklistSnapshot, setChecklistSnapshot] = useState<any>(() => {
    return initialChecklistSnapshot || BASE_CHECKLIST_TEMPLATE;
  });

  const activeStepConfig = inspectionReportWorkflow.steps[currentStep];

  // SECURITY BOUNDARY: Evaluate if the active session user is authorized to forward dossiers
  const isAuthorizedToForward = activeUserName.trim().toLowerCase() === "roseline";

  // Unified Division mapping rule
  const availableDivisions = ["VMD", "PAD", "AFPD", "IRSD"];

  const staffDirectory = [
    { id: "usr_201", name: "Aliyu Ahmed", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_202", name: "Chidi Okafor", division: "VMD", role: "Technical Staff Reviewer" },
    { id: "usr_203", name: "Fatima Umar", division: "IRSD", role: "IRSD Staff Reviewer" }
  ];

  // 📝 COLLABORATIVE FEATURE: Save Draft function without running compilation engine
  const handleSaveDraft = async (draftPayload: any) => {
    console.log('This is draftPayload:', draftPayload);
    setIsSavingDraft(true);
    try {
      console.log("Persisting collaborative checklist draft snapshot directly to database matrix...");
      setChecklistSnapshot(draftPayload);

      const res = await fetch(`/api/LocalInspectionReports/generate/Reports/Drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          checklistSnapshot: draftPayload,
          savedBy: activeUserName
        }),
      });

      const outcome = await res.json();
      if (res.ok && outcome.success) {
        alert(`Draft snapshot saved successfully by ${activeUserName}! Other team reviewers will now see these observations.`);
        router.refresh();
      } else {
        throw new Error(outcome.error || "Draft storage rejection.");
      }
    } catch (err: any) {
      console.error("Draft sync failure:", err);
      alert(`Draft Save Error: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

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
    if (direction === "FORWARD" && !isAuthorizedToForward) {
      alert("Unauthorized Operation: Forwarding clearance restricted to Roseline.");
      return;
    }

    if (!remarks.trim()) {
      alert("Please provide official directives/minutes before moving this file.");
      return;
    }

    // Compute active staff processing duration for QMS conformance metrics
    const now = Date.now();
    const durationSeconds = Math.round((now - stepEntryTime) / 1000);

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
            checklistSnapshot: checklistSnapshot
          })
        });

        const transitionData = await transitionRes.json();
        if (!transitionRes.ok || !transitionData.success) {
          throw new Error(transitionData.error || "Integrated endpoint transition rejected.");
        }
      }

      // Safe fallback ensuring we align division markers
      const activeDivision = availableDivisions.includes(activeStepConfig.division) 
        ? activeStepConfig.division 
        : "VMD";

      const res = await executeInspectionReportTransition({
        applicationId: Number(applicationId),
        currentStepKey: currentStep,
        direction,
        actingUserId: "usr_active_session", 
        actingUserName: `${activeUserName} (${activeDivision})`,
        targetUserId: direction === "FORWARD" ? (selectedStaff || "next-desk-holder-id") : "return-desk-holder-id",
        remarks: remarks
      });

      if (res.success && "arrivedAt" in res && res.arrivedAt) {
        const nextStepKey = res.arrivedAt as keyof typeof inspectionReportWorkflow.steps;
        
        let targetStepTitle = inspectionReportWorkflow.steps[nextStepKey]?.title || "Archived Desk";
        if (currentStep === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
          targetStepTitle = checklistSnapshot?.final_recommendation === "PENDING"
            ? "Applicant Notification Hub - CAPA Request Issued"
            : "Applicant Notification Hub - Final Approval Certified";
        }

        const newMinute: CommentTrailItem = {
          text: remarks,
          action: direction,
          fromStep: activeStepConfig.title.replace(/DDD/g, "Divisional Deputy Director"),
          toStep: targetStepTitle.replace(/DDD/g, "Divisional Deputy Director"),
          actorName: `${activeUserName} (${activeDivision})`,
          timestamp: new Date().toISOString(),
          processingDurationSeconds: durationSeconds // ⏱️ Bound directly inside the minute ledger metadata
        };

        setCommentsList(prev => [newMinute, ...prev]);
        alert(`Dossier successfully routed in ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s to: ${targetStepTitle.replace(/DDD/g, "Divisional Deputy Director")}`);
        
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
                {key.replace(/DDD/g, "Divisional Deputy Director")} - {inspectionReportWorkflow.steps[key as keyof typeof inspectionReportWorkflow.steps].title.replace(/DDD/g, "Divisional Deputy Director")}
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
            
            <div className="bg-slate-800 p-4 rounded-xl border border-slate-700 max-w-sm w-full">
              <p className="text-[11px] text-slate-400 font-bold uppercase tracking-wider">Current Custody Desk</p>
              <p className="text-sm font-bold text-emerald-400 mt-0.5 font-sans">
                {activeStepConfig?.title?.replace(/DDD/g, "Divisional Deputy Director")}
              </p>
              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                <p>Division: <span className="font-bold text-white">{activeStepConfig?.division}</span></p>
                <p>Authorized Actor: <span className="italic text-white">{activeStepConfig?.role?.replace(/DDD/g, "Divisional Deputy Director")}</span></p>
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
              initialData={checklistSnapshot}
              onSave={handleAICorrelationCompile}
              onSaveDraft={handleSaveDraft} 
              onChange={(updatedData: any) => setChecklistSnapshot(updatedData)}
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
                    const durationText = item.processingDurationSeconds 
                      ? `${Math.floor(item.processingDurationSeconds / 60)}m ${item.processingDurationSeconds % 60}s`
                      : "N/A";
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
                            <div className="flex flex-col items-end gap-0.5">
                              <span className="text-[10px] font-mono text-slate-400">
                                {new Date(item.timestamp).toLocaleString("en-GB")}
                              </span>
                              {item.processingDurationSeconds && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ⏱️ QMS Duration: <span className="font-semibold text-slate-700">{durationText}</span>
                                </span>
                              )}
                            </div>
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
            
            {/* Collaborative Draft Quick-Saver Board */}
            <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
              <h3 className="text-xs font-bold mb-2 uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                💾 Team Draft Status
              </h3>
              <p className="text-[11px] text-slate-500 mb-3 leading-normal">
                Working in a technical trio? Save continuous drafts to share field findings without forwarding ownership custody.
              </p>
              <button
                type="button"
                disabled={isSavingDraft || (currentStep !== "STAFF_TECHNICAL_REVIEW" && currentStep !== "LOD_INTAKE")}
                onClick={() => handleSaveDraft(checklistSnapshot)}
                className="w-full inline-flex justify-center items-center px-3 py-2 bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-amber-800 text-xs font-bold rounded-lg transition-all shadow-2xs"
              >
                {isSavingDraft ? "Saving Draft Matrix..." : "💾 Save Collaborative Draft"}
              </button>
            </div>

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
                    {checklistSnapshot?.final_recommendation || "PENDING"}
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
                      ? (checklistSnapshot?.final_recommendation === "PENDING"
                        ? "Provide official directive text to issue with the CAPA requirement..."
                        : "Enter validation clearance minutes for final certified sign-off...")
                      : `Provide dynamic feedback or instructions as ${activeStepConfig?.role?.replace(/DDD/g, "Divisional Deputy Director") || "Reviewer"}...`
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
                        const recommendation = checklistSnapshot?.final_recommendation || "PENDING";
                        const msg = recommendation === "PENDING"
                          ? "Confirm sign-off on inspection report and dispatch CAPA Directive to applicant profile?"
                          : "Confirm absolute final certification and release of official GMP Certificate?";
                        if (window.confirm(msg)) handleTransition("FORWARD");
                      }}
                      className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center border disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed ${
                        checklistSnapshot?.final_recommendation === "PENDING"
                          ? "bg-amber-600 hover:bg-amber-700 border-amber-700 shadow-amber-600/10"
                          : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-600/10"
                      }`}
                    >
                      {isSubmitting 
                        ? "Processing Action..." 
                        : !isAuthorizedToForward
                        ? "🔒 Forwarding Restricted to Roseline"
                        : checklistSnapshot?.final_recommendation === "PENDING"
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