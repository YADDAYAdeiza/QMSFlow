"use client";
// @/components/LocalInspectionReports/GMPReportWorkspace.tsx

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { inspectionReportWorkflow } from "@/config/workflows/inspectionReportWorkflow";
import { executeInspectionReportTransition } from "@/lib/LocalInspectionReports/inspectionReportsEngine";
import InspectionChecklistForm from "./InspectionChecklistForm";
import ReportRichTextEditor from "./ReportRichTextEditor";
import { uploadDossierPdf, buildCompanyFilePath } from "@/lib/utils/supabaseUpload";
import CertificateOrCapaPreviewTab from "@/components/LocalInspectionReports/CertificateOrCapaPreviewTab";

const BASE_CHECKLIST_TEMPLATE = {
  report_doc_number: "OKL-LA-PRI-01-2026",
  inspection_dates: "",
  type_of_inspection: "PRI",
  inspected_site_name: "Orange Kalbe Limited",
  site_contact_details: { phone: "", email: "", website: "" },
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
  critical_count: 0,
  major_count: 0,
  other_count: 0,
  observations: [] as Array<{ id: string; severity: "critical" | "major" | "other"; text: string }>,
  final_recommendation: "PENDING"
};

interface CommentTrailItem {
  text: string;
  action: "FORWARD" | "REWORK" | "RECALL" | "TARGETED_REWORK";
  fromStep: string;
  toStep: string;
  actorName: string;
  timestamp: string;
  processingDurationSeconds?: number;
  actorId?: string;
  actorRole?: string;
  assignedToId?: string;
}

interface WorkspaceProps {
  applicationId: string;
  companyId: string;
  companyName: string;
  activeUserId: string;
  activeUserRole: string; // Dynamic role e.g., 'TEAM_LEADER', 'CO_INSPECTOR', 'Divisional Deputy Director', 'DIRECTOR'
  activeUserName?: string;
  globalStructuralRole?: string; // Organizational base role passed from parent page
  notificationEmail?: string;     // Passed from parent JSX call
  applicantEmail?: string;        // Fallback/Alias
  scheduledDate?: string;         // Scheduled inspection date passed from parent page
  leadInspectorName?: string;     // Lead Inspector name passed from parent page
  initialStepKey?: keyof typeof inspectionReportWorkflow.steps;
  initialReportHtml?: string | null;
  initialChecklistSnapshot?: any;
  initialComments?: CommentTrailItem[];
  facilityAddressState?: string;
  productLinesState?: string[];
}

// Utility helper to normalize desk titles dynamically
const formatDeskTitle = (title?: string) => {
  if (!title) return "Unlabeled Desk";
  return title.replace(/DDD/g, "Divisional Deputy Director");
};

export default function GMPReportWorkspace({
  applicationId,
  companyId,
  companyName,
  activeUserId,
  activeUserRole: initialActiveUserRole,
  activeUserName = "Roseline",
  globalStructuralRole = "",
  notificationEmail = "",
  applicantEmail = "",
  scheduledDate = "",
  leadInspectorName = "",
  initialStepKey = "DDD_TECHNICAL_ASSIGNMENT",
  initialReportHtml = null,
  initialChecklistSnapshot = null,
  initialComments = [],
  facilityAddressState = "",
  productLinesState = []
}: WorkspaceProps) {
  const router = useRouter();
  const expectedUserRaw = activeUserName;

  // Core workflow states
  const [currentStep, setCurrentStep] = useState<keyof typeof inspectionReportWorkflow.steps>(initialStepKey);
  const [activeUserRole, setActiveUserRole] = useState<string>(initialActiveUserRole);
  const [remarks, setRemarks] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSavingDraft, setIsSavingDraft] = useState(false);

  // Active tab state: 'PDF' | 'RTF' | 'CERTIFICATE'
  const [activeDocTab, setActiveDocTab] = useState<'PDF' | 'RTF' | 'CERTIFICATE'>('RTF');

  // PDF render & Supabase storage tracking
  const [pdfStorageUrl, setPdfStorageUrl] = useState<string | null>(initialChecklistSnapshot?.pdfStorageUrl || null);
  const [isRenderingPdf, setIsRenderingPdf] = useState(false);

  // ⏱️ QMS Performance Tracking
  const [stepEntryTime, setStepEntryTime] = useState<number>(Date.now());

  // Staff directory state
  const [staffDirectory, setStaffDirectory] = useState<any[]>([]);
  const [selectedStaff, setSelectedStaff] = useState<string>("");
  const [isLoadingStaff, setIsLoadingStaff] = useState<boolean>(false);

  const [commentsList, setCommentsList] = useState<CommentTrailItem[]>(initialComments);
  const [reportHtml, setReportHtml] = useState<string | null>(initialReportHtml);
  const [checklistSnapshot, setChecklistSnapshot] = useState<any>(() => {
    return initialChecklistSnapshot || BASE_CHECKLIST_TEMPLATE;
  });

  const activeStepConfig = inspectionReportWorkflow.steps[currentStep];

  // Manual simulation step switch handler
  const handleStepSwitch = (nextStepKey: string) => {
    const validKey = nextStepKey as keyof typeof inspectionReportWorkflow.steps;
    if (!inspectionReportWorkflow.steps[validKey]) return;

    setCurrentStep(validKey);
    setStepEntryTime(Date.now());

    const targetStepConfig = inspectionReportWorkflow.steps[validKey];
    if (targetStepConfig?.role) {
      setActiveUserRole(targetStepConfig.role);
    }
  };

  useEffect(() => {
    async function fetchStaffMembers() {
      if (!applicationId) return;
      setIsLoadingStaff(true);
      try {
        const res = await fetch(`/api/LocalInspectionReports/VettingInspectors?application_id=${applicationId}`);
        if (!res.ok) throw new Error("Failed to load staff directory");

        const data = await res.json();
        const rawList = data.inspectors || (Array.isArray(data) ? data : []);

        // Division map normalization
        const normalizeDivision = (div?: string) => {
          if (!div) return "VMD";
          if (div === "Biologics") return "VMD";
          if (div === "Pharmacovigilance") return "PAD";
          if (div === "Post-Registration") return "AFPD";
          return div;
        };

        const mappedStaff = rawList.map((user: any) => ({
          id: user.id,
          name: user.name,
          email: user.email,
          division: normalizeDivision(user.division),
          role: user.role,
          isAvailable: user.is_available,
          statusLabel: user.status_label,
          availabilityStatus: user.availability_status
        }));

        setStaffDirectory(mappedStaff);
      } catch (err) {
        console.error("Error fetching live staff directory:", err);
      } finally {
        setIsLoadingStaff(false);
      }
    }

    fetchStaffMembers();
  }, [applicationId]);

  useEffect(() => {
    setStepEntryTime(Date.now());
    console.log("QMS Conformance Step Timer Reset.");
  }, [currentStep]);

  // DIAGNOSTIC SECURITY COMPLIANCE LOG
  useEffect(() => {
    console.log("🔐 SECURITY CHECK - Active User Session Profile:", {
      userId: activeUserId,
      userRole: activeUserRole,
      globalStructuralRole,
      userName: expectedUserRaw
    });
  }, [activeUserId, activeUserRole, globalStructuralRole, expectedUserRaw]);

  // Primary Email Resolution with Fallback Cascade
  const resolvedNotificationEmail =
    notificationEmail ||
    applicantEmail ||
    checklistSnapshot?.notificationEmail ||
    checklistSnapshot?.site_contact_details?.email ||
    checklistSnapshot?.applicantEmail ||
    "";

  // Address and Product Lines resolution
  const resolvedAddress =
    facilityAddressState ||
    checklistSnapshot?.inspected_site_address ||
    checklistSnapshot?.facilityAddress ||
    "";

  const resolvedProductLines =
    productLinesState && productLinesState.length > 0
      ? productLinesState
      : checklistSnapshot?.productLines || [];

  // Structured application payload for CertificateOrCapaPreviewTab
  const applicationData = {
    company_name: companyName,
    company_id: companyId,
    facility_address: resolvedAddress,
    product_lines: resolvedProductLines,
    applicant_email: resolvedNotificationEmail,
    checklistSnapshot: checklistSnapshot
  };

  // 🛡️ SECURITY CONTROL & ROLE AUTHORIZATION GATEWAY
  const isAuthorizedToForward = !!activeUserId && !!activeUserRole;

  // Dynamic Role Check: Allows TEAM_LEADER, Divisional Deputy Director, or matching step role
  const isAuthorizedRole =
    activeUserRole === "TEAM_LEADER" ||
    activeUserRole === "DDD" ||
    activeUserRole === "Divisional Deputy Director" ||
    activeUserRole === activeStepConfig?.role;

  const canDispatchForward = isAuthorizedToForward && isAuthorizedRole;

  const availableDivisions = ["VMD", "PAD", "AFPD", "IRSD"];

  const handleSaveDraft = async (draftPayload: any) => {
    if (!draftPayload) return;
    setIsSavingDraft(true);
    try {
      setChecklistSnapshot(draftPayload);

      const currentReportHtml =
        reportHtml ||
        draftPayload?.compiledReportHtml ||
        "";

      const res = await fetch(`/api/LocalInspectionReports/generate/Reports/Drafts`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicationId,
          compiledReportHtml: currentReportHtml,
          checklistSnapshot: draftPayload,
          savedBy: expectedUserRaw,
          savedById: activeUserId,
          savedByRole: activeUserRole,
          inspectionWorkflowMeta: {
            lastAction: "DRAFT_SAVE",
            currentStepKey: "STAFF_TECHNICAL_REVIEW"
          }
        }),
      });

      const outcome = await res.json();
      if (res.ok && outcome.success) {
        alert(`Draft snapshot saved successfully by ${expectedUserRaw}!`);
        router.refresh();
      } else {
        throw new Error(outcome.error || "Draft storage structural rejection.");
      }
    } catch (err: any) {
      alert(`Draft Save Error: ${err.message}`);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleAICorrelationCompile = async (completedFormPayload: any) => {
    if (!completedFormPayload) return;
    try {
      setChecklistSnapshot(completedFormPayload);

      const res = await fetch("/api/LocalInspectionReports/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...completedFormPayload,
          application_id: applicationId,
          report_doc_number: `NAFDAC/VMD/GMP/${applicationId}/2026`,
          inspected_site_name: companyName,
          company_name: companyName,
          facility_address: resolvedAddress,
          inspected_site_address: resolvedAddress,
          product_lines: resolvedProductLines,
          productLines: resolvedProductLines,
          applicant_email: resolvedNotificationEmail
        }),
      });

      const outcome = await res.json();
      if (outcome.success) {
        setReportHtml(outcome.report_html);
        alert("AI Technical Report Narrative compiled successfully!");
        router.refresh();
      } else {
        alert("Synthesis aborted: " + outcome.error);
      }
    } catch (err: any) {
      alert(`Execution Error: ${err.message}`);
    }
  };

  const handleCommitPdfToStorage = async () => {
    if (!reportHtml) {
      alert("No compiled report content available to commit to PDF.");
      return;
    }

    setIsRenderingPdf(true);
    try {
      const docNo = checklistSnapshot?.report_doc_number || `NAFDAC-GMP-${applicationId}`;

      const pdfRes = await fetch("/api/LocalInspectionReports/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reportHtml: reportHtml,
          applicationId: applicationId,
          docNumber: docNo
        })
      });

      if (!pdfRes.ok) {
        const errorData = await pdfRes.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to render official PDF binary from current report HTML.");
      }

      const pdfBlob = await pdfRes.blob();
      const fileName = `Local_Inspection_Report_${docNo}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, {
        type: "application/pdf"
      });

      const targetCompanyId = checklistSnapshot?.company_id || checklistSnapshot?.company_rc_number || applicationId;

      const storagePath = buildCompanyFilePath(
        targetCompanyId,
        '01_Local_Inspection_Reports',
        fileName
      );

      const uploadedUrl = await uploadDossierPdf(pdfFile, storagePath);

      if (!uploadedUrl) {
        throw new Error("Failed to retrieve public storage URL after upload.");
      }

      setPdfStorageUrl(uploadedUrl);

      const updatedSnapshot = {
        ...checklistSnapshot,
        pdfStorageUrl: uploadedUrl
      };
      setChecklistSnapshot(updatedSnapshot);
      await handleSaveDraft(updatedSnapshot);

      alert("PDF successfully compiled and committed to Supabase 'Documents' bucket!");
    } catch (err: any) {
      alert(`PDF Storage Error: ${err.message}`);
    } finally {
      setIsRenderingPdf(false);
    }
  };

  const handleTransition = async (
    direction: "FORWARD" | "REWORK" | "TARGETED_REWORK",
    targetStepOverride?: keyof typeof inspectionReportWorkflow.steps
  ) => {
    if (direction === "FORWARD" && !canDispatchForward) {
      alert("Unauthorized Operation: Forward transitions require appropriate leadership or assigned role authority.");
      return;
    }

    if (!remarks.trim()) {
      alert("Please provide official directives/minutes before moving this file.");
      return;
    }

    const now = Date.now();
    const durationSeconds = Math.round((now - stepEntryTime) / 1000);

    setIsSubmitting(true);
    try {
      // 1. Maintain official notification & certificate dispatch on Director Final Sign-Off
      if (currentStep === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
        const transitionRes = await fetch("/api/LocalInspectionReports", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            applicationId,
            currentStepKey: currentStep,
            direction,
            companyName,
            facilityAddress: resolvedAddress,
            productLines: resolvedProductLines,
            notificationEmail: resolvedNotificationEmail,
            remarks,
            processingDurationSeconds: durationSeconds,
            checklistSnapshot,
            executedByUserId: activeUserId,
            executedByUserRole: activeUserRole
          })
        });

        const transitionData = await transitionRes.json();
        if (!transitionRes.ok || !transitionData.success) {
          throw new Error(transitionData.error || "Integrated endpoint transition rejected.");
        }
      }

      const activeDivision = activeStepConfig && availableDivisions.includes(activeStepConfig.division)
        ? activeStepConfig.division
        : "VMD"; // Fallback division

      // 2. Define explicit target step for direct targeted rework jumps
      const targetStepKey = direction === "TARGETED_REWORK"
        ? (targetStepOverride || "STAFF_TECHNICAL_REVIEW")
        : undefined;

      // Resolve assignedTeam directly from checklistSnapshot
      const assignedTeam =
        checklistSnapshot?.inspectionWorkflowMeta?.assignedTeam ||
        checklistSnapshot?.assignedTeam;

      const teamLeaderId = assignedTeam?.teamLeaderId;

      const resolvedTargetUserId = direction === "FORWARD"
        ? (selectedStaff || "next-desk-holder-id")
        : (teamLeaderId || "return-desk-holder-id");

      // 3. Execute DB Transition Engine call
      const res = await executeInspectionReportTransition({
        applicationId: Number(applicationId),
        currentStepKey: currentStep,
        direction,
        targetStepKey,
        actingUserId: activeUserId,
        actingUserRole: activeUserRole,
        actingUserName: `${expectedUserRaw} (${activeDivision})`,
        targetUserId: resolvedTargetUserId,
        remarks
      });

      if (res.success && "arrivedAt" in res && res.arrivedAt) {
        const nextStepKey = res.arrivedAt as keyof typeof inspectionReportWorkflow.steps;

        let targetStepTitle = inspectionReportWorkflow.steps[nextStepKey]?.title || "Archived Desk";
        if (currentStep === "DIRECTOR_FINAL_SIGN_OFF" && direction === "FORWARD") {
          targetStepTitle = checklistSnapshot?.final_recommendation === "CAPA_PENDING"
            ? "Applicant Notification Hub - CAPA Request Issued"
            : "Applicant Notification Hub - Final Approval Certified";
        }

        const sourceStepTitle = activeStepConfig?.title || "Unknown Desk";

        const newMinute: CommentTrailItem = {
          text: remarks,
          action: direction as any,
          fromStep: formatDeskTitle(sourceStepTitle),
          toStep: formatDeskTitle(targetStepTitle),
          actorName: `${expectedUserRaw} (${activeDivision})`,
          timestamp: new Date().toISOString(),
          processingDurationSeconds: durationSeconds,
          actorId: activeUserId,
          actorRole: activeUserRole
        };

        setCommentsList(prev => [newMinute, ...prev]);
        alert(`Dossier successfully routed in ${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s to: ${formatDeskTitle(targetStepTitle)}`);

        setRemarks("");
        setSelectedStaff("");

        // Synchronize state with new desk
        handleStepSwitch(nextStepKey);
        router.refresh();
      } else {
        const errorMsg = ("error" in res && res.error) ? String(res.error) : "Unknown routing sequence breakdown";
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

      {/* Simulation Rig Container */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shadow-sm">
        <div>
          <h4 className="text-amber-800 font-bold text-sm uppercase tracking-wide">🔬 QMS Workflow Simulation Rig</h4>
          <p className="text-xs text-amber-700">Manually select a desk step below to preview the interface as seen by different NAFDAC officials.</p>
        </div>
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-amber-900">Active Desk View:</label>
          <select
            value={currentStep}
            onChange={(e) => {
              const nextKey = e.target.value;
              if (typeof handleStepSwitch === "function") {
                handleStepSwitch(nextKey);
              } else {
                setCurrentStep(nextKey as any);
              }
            }}
            className="text-xs bg-white border border-amber-300 rounded p-1.5 font-semibold text-slate-800 focus:outline-amber-500 cursor-pointer"
          >
            {Object.keys(inspectionReportWorkflow.steps).map((key) => (
              <option key={key} value={key}>
                {key.replace(/DDD/g, "Divisional Deputy Director")} - {formatDeskTitle(inspectionReportWorkflow.steps[key as keyof typeof inspectionReportWorkflow.steps]?.title)}
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
                {formatDeskTitle(activeStepConfig?.title)}
              </p>
              <div className="text-[11px] text-slate-300 mt-1 space-y-0.5">
                <p>Division: <span className="font-bold text-white">{activeStepConfig?.division || "VMD"}</span></p>
                <p>Authorized Actor: <span className="italic text-white">{formatDeskTitle(activeStepConfig?.role) || "Reviewer"}</span></p>
                <p>Role Parameter: <span className="font-bold text-sky-400 font-mono text-[10px]">{activeUserRole}</span></p>
              </div>
            </div>
          </div>
        </div>

        {/* Content Layout Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6 bg-slate-50">
          
          {/* Main Work Area (2 Columns on Large Screens) */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Main Primary Documentation & Editor Panel (Tabbed Workspace) */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden mb-6">
              
              {/* Tab Navigation & Toolbar Header */}
              <div className="bg-slate-100 border-b border-slate-200 px-4 pt-3 flex flex-wrap items-center justify-between gap-2">
                
                {/* Tab Buttons */}
                <div className="flex items-center gap-1 overflow-x-auto">
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('RTF')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-t border-x whitespace-nowrap ${
                      activeDocTab === 'RTF'
                        ? 'bg-white text-emerald-900 border-slate-200 shadow-sm'
                        : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    <span>📝</span> Narrative Draft (DER-800-06)
                    {reportHtml && (
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    )}
                  </button>

                  <button
                    type="button"
                    onClick={() => setActiveDocTab('PDF')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-t border-x whitespace-nowrap ${
                      activeDocTab === 'PDF'
                        ? 'bg-white text-slate-800 border-slate-200 shadow-sm'
                        : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    <span>📄</span> Primary Inspection PDF
                  </button>

                  {/* Integrated Preview Tab */}
                  <button
                    type="button"
                    onClick={() => setActiveDocTab('CERTIFICATE')}
                    className={`inline-flex items-center gap-2 px-4 py-2.5 text-xs font-bold rounded-t-lg transition-all border-t border-x whitespace-nowrap ${
                      activeDocTab === 'CERTIFICATE'
                        ? 'bg-white text-amber-900 border-slate-200 shadow-sm'
                        : 'bg-slate-200/60 text-slate-600 border-transparent hover:bg-slate-200'
                    }`}
                  >
                    <span>📜</span> Certificate / CAPA Preview
                  </button>
                </div>

                {/* Header Actions / File Title */}
                <div className="pb-2.5 flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                  {activeDocTab === 'PDF' ? (
                    <>
                      <span className="truncate max-w-[200px] sm:max-w-[300px]">
                        {pdfStorageUrl ? `${applicationId}_Final.pdf` : "Draft_Compilation.pdf"}
                      </span>
                      {pdfStorageUrl && (
                        <a
                          href={pdfStorageUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2 py-1 text-[10px] font-bold rounded bg-white text-slate-700 hover:bg-slate-50 transition-all border border-slate-300 shadow-sm"
                        >
                          ↗️ Pop Out Fullscreen
                        </a>
                      )}
                    </>
                  ) : activeDocTab === 'CERTIFICATE' ? (
                    <span className="font-sans text-xs text-amber-700 font-semibold">
                      📜 Certificate & CAPA Issuance Review
                    </span>
                  ) : (
                    <span className="font-sans text-xs text-slate-600 font-semibold">
                      {currentStep === "STAFF_TECHNICAL_REVIEW"
                        ? "✏️ Active Editing Mode"
                        : "🔒 Read-Only Desk View"}
                    </span>
                  )}
                </div>
              </div>

              {/* Tab Content Body (Full-Width Workspace) */}
              <div className="p-5 min-h-[600px] bg-white">
                
                {/* TAB 1: RTF Narrative Editor */}
                {activeDocTab === 'RTF' && (
                  <div>
                    {reportHtml ? (
                      <div className="animate-fadeIn">
                        <ReportRichTextEditor
                          contentHtml={reportHtml}
                          onChange={(updatedHtml) => setReportHtml(updatedHtml)}
                          readOnly={currentStep !== "STAFF_TECHNICAL_REVIEW"}
                        />
                      </div>
                    ) : (
                      <div className="bg-slate-50 rounded-xl p-12 border border-dashed border-slate-300 flex flex-col items-center justify-center text-center my-6">
                        <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center text-xl mb-3">
                          📝
                        </div>
                        <p className="text-sm font-bold text-slate-700 mb-1">
                          No DER-800-06 Narrative Compiled Yet
                        </p>
                        <p className="text-xs text-slate-500 max-w-sm">
                          Complete and save the inspection matrix checklist below to generate the initial automated narrative draft.
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 2: PDF Regulatory Document Viewer */}
                {activeDocTab === 'PDF' && (
                  <div className="min-h-[650px] w-full bg-slate-100 rounded-lg overflow-hidden border border-slate-200 animate-fadeIn relative flex flex-col">
                    {pdfStorageUrl ? (
                      <iframe
                        src={`${pdfStorageUrl}#toolbar=0`}
                        className="w-full h-[650px] border-none"
                        title="Primary Inspection Report PDF"
                      />
                    ) : (
                      <div className="p-8 my-auto flex flex-col items-center justify-center bg-white text-center">
                        <div className="w-16 h-16 rounded-full bg-amber-50 border border-amber-200 flex items-center justify-center text-2xl mb-4 shadow-sm">
                          📄
                        </div>
                        <h3 className="text-base font-bold text-slate-800 mb-1">
                          No Committed PDF Document Found
                        </h3>
                        <p className="text-xs text-slate-500 max-w-md mb-6 leading-relaxed">
                          The primary report PDF for dossier <span className="font-mono font-semibold text-slate-700">#{applicationId}</span> has not been generated and saved to the <span className="font-mono text-amber-800 bg-amber-50 px-1 py-0.5 rounded border border-amber-200">Documents</span> storage bucket yet.
                        </p>

                        <button
                          type="button"
                          onClick={handleCommitPdfToStorage}
                          disabled={isRenderingPdf}
                          className="inline-flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg shadow-sm transition-all"
                        >
                          <span>💾</span> {isRenderingPdf ? "Rendering PDF..." : "Render & Commit PDF to Storage"}
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* TAB 3: Certificate / CAPA Preview */}
                {activeDocTab === 'CERTIFICATE' && (
                  <div className="animate-fadeIn min-h-[600px]">
                    <CertificateOrCapaPreviewTab
                      applicationData={applicationData}
                      applicationId={applicationId}
                    />
                  </div>
                )}

              </div>
            </div>

            {/* Checklist Matrix Form Component */}
            <InspectionChecklistForm
              initialData={checklistSnapshot}
              scheduledDate={scheduledDate}
              notificationEmail={resolvedNotificationEmail}
              leadInspectorName
              onSave={handleAICorrelationCompile}
              onSaveDraft={handleSaveDraft}
              onChange={(updatedData: any) => setChecklistSnapshot(updatedData)}
              isReadOnly={currentStep !== "STAFF_TECHNICAL_REVIEW" && currentStep !== "LOD_INTAKE"}
            />

            {/* Minute Sheet / Audit Trail Log */}
            <div className="bg-white rounded-xl p-6 border border-slate-200 shadow-sm">
              <h3 className="text-sm font-bold border-b border-slate-100 pb-3 mb-4 uppercase tracking-wider text-slate-700">
                📋 Official QMS Minute Sheet Log
              </h3>

              {commentsList.length === 0 ? (
                <p className="text-xs text-slate-400 italic py-2">No tracking entries found on this ledger yet.</p>
              ) : (
                <div className="relative border-l border-slate-200 pl-4 space-y-4 ml-2 mt-2">
                  {commentsList.map((item, index) => {
                    const isRework = item.action === "REWORK" || item.action === "TARGETED_REWORK";
                    const durationText = item.processingDurationSeconds
                      ? `${Math.floor(item.processingDurationSeconds / 60)}m ${item.processingDurationSeconds % 60}s`
                      : "N/A";
                    return (
                      <div key={index} className="relative text-xs">
                        <span className={`absolute -left-[21px] top-1 flex h-[13px] w-[13px] rounded-full border-2 bg-white ${isRework ? "border-rose-500" : "border-emerald-500"}`} />

                        <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 shadow-sm">
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
                              {item.processingDurationSeconds !== undefined && (
                                <span className="text-[10px] text-slate-500 font-mono">
                                  ⏱️ QMS Duration: <span className="font-semibold text-slate-700">{durationText}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          <p className="text-slate-700 font-medium whitespace-pre-wrap leading-relaxed">{item.text}</p>

                          <div className="mt-2 pt-1 border-t border-dashed border-slate-200 text-[10px] text-slate-500 flex flex-wrap gap-x-3 text-ellipsis overflow-hidden">
                            <p>From: <span className="font-semibold text-slate-600">{item.fromStep?.replace(/DDD/g, "Divisional Deputy Director")}</span></p>
                            <p>➔ Destination: <span className="font-semibold text-slate-600">{item.toStep?.replace(/DDD/g, "Divisional Deputy Director")}</span></p>
                            {item.actorRole && <p>Role: <span className="font-semibold text-sky-700">{item.actorRole}</span></p>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar Operations Panel (1 Column) */}
          <div className="space-y-6">

            {/* Collaborative Draft Save Panel */}
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
                className="w-full inline-flex justify-center items-center px-3 py-2 bg-amber-50 border border-amber-300 hover:bg-amber-100 disabled:bg-slate-50 disabled:text-slate-400 disabled:border-slate-200 text-amber-800 text-xs font-bold rounded-lg transition-all shadow-sm"
              >
                {isSavingDraft ? "Saving Draft Matrix..." : "💾 Save Collaborative Draft"}
              </button>
            </div>

            {/* Workflow Control Box */}
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
                  <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-600">
                      Assign Vetting Inspector
                    </label>
                    <select
                      value={selectedStaff}
                      onChange={(e) => setSelectedStaff(e.target.value)}
                      className="w-full rounded-md border border-slate-300 bg-white p-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                      disabled={isLoadingStaff}
                    >
                      <option value="">
                        {isLoadingStaff ? "Checking inspector availability..." : "-- Select IRSD Vetting Inspector --"}
                      </option>
                      {staffDirectory
                        .filter((staff) => staff.division === "IRSD")
                        .map((staff) => {
                          const isConflict = staff.availabilityStatus === "WORKED_ON_INSPECTION";
                          const isBusy = staff.availabilityStatus === "ON_ANOTHER_INSPECTION";

                          return (
                            <option
                              key={staff.id}
                              value={staff.id}
                              disabled={isConflict} // Prevent self-vetting completely
                              className={isConflict ? "text-red-500 bg-red-50" : isBusy ? "text-amber-600" : "text-slate-900"}
                            >
                              {staff.name} — {staff.division} {staff.isAvailable ? " [Available]" : ` [⚠️ ${staff.statusLabel}]`}
                            </option>
                          );
                        })}
                    </select>
                  </div>
                </div>
              )}

              {currentStep === "DIRECTOR_FINAL_SIGN_OFF" && (
                <div className="mb-4 p-3 bg-amber-50 rounded-lg border border-amber-200 text-[11px] text-amber-900 leading-relaxed animate-fadeIn">
                  <strong>📋 Adjudication Check:</strong> The checklist snapshot current recommendation reads:{" "}
                  <span className="font-bold underline text-amber-800">
                    {checklistSnapshot?.final_recommendation || "PENDING"}
                  </span>.
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
                      ? "Enter validation clearance minutes for final certified sign-off..."
                      : `Provide dynamic feedback or instructions as ${formatDeskTitle(activeStepConfig?.role)}...`
                  }
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2.5 focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 focus:outline-none text-slate-800 placeholder:text-slate-400 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="space-y-2">
                {currentStep === "DIRECTOR_FINAL_SIGN_OFF" ? (
                  <>
                    <button
                      type="button"
                      disabled={isSubmitting || !isAuthorizedToForward}
                      onClick={() => {
                        const recommendation = checklistSnapshot?.final_recommendation || "PENDING";
                        const msg = recommendation === "CAPA_PENDING"
                          ? "Confirm sign-off on inspection report and dispatch CAPA Directive to applicant profile?"
                          : "Confirm absolute final certification and release of official GMP Certificate?";
                        if (window.confirm(msg)) handleTransition("FORWARD");
                      }}
                      className={`w-full inline-flex justify-center items-center px-4 py-2.5 text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center border disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed ${
                        checklistSnapshot?.final_recommendation === "CAPA_PENDING"
                          ? "bg-amber-600 hover:bg-amber-700 border-amber-700 shadow-amber-600/10"
                          : "bg-emerald-600 hover:bg-emerald-700 border-emerald-700 shadow-emerald-600/10"
                      }`}
                    >
                      {isSubmitting
                        ? "Processing Action..."
                        : !isAuthorizedToForward
                        ? "🔒 Forwarding Restricted"
                        : checklistSnapshot?.final_recommendation === "CAPA_PENDING"
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
                        disabled={
                          isSubmitting ||
                          !canDispatchForward ||
                          (currentStep === "DDD_TECHNICAL_ASSIGNMENT" && !selectedStaff) ||
                          (currentStep === "DDD_IRSD_INTAKE" && !selectedStaff)
                        }
                        onClick={() => handleTransition("FORWARD")}
                        className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 disabled:border-slate-300 disabled:text-slate-400 disabled:cursor-not-allowed text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center"
                      >
                        {isSubmitting
                          ? "Routing..."
                          : !isAuthorizedToForward
                          ? "🔒 Incomplete Session Context"
                          : !canDispatchForward
                          ? "🔒 Requires Desk Authority"
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

              {/* Targeted Rework Direct Dispatch (Available on Senior Desks) */}
              {["DDD_TECHNICAL_REVIEW", "DDD_IRSD_INTAKE", "IRSD_STAFF_VETTING", "DDD_IRSD_REVIEW", "DIRECTOR_FINAL_SIGN_OFF"].includes(currentStep) && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <label className="block text-[11px] font-bold text-rose-800 mb-1.5 uppercase tracking-wide">
                    🚨 Direct Rework Assignment
                  </label>
                  <p className="text-[10px] text-slate-500 mb-2 leading-tight">
                    Bypass intermediate steps and return this report directly to the field inspection team for corrections.
                  </p>

                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => {
                      if (!remarks.trim()) {
                        alert("Please provide official minutes/reasons for returning the report.");
                        return;
                      }
                      if (window.confirm("Return dossier directly to the technical field inspection team (Team Leader & Co-Inspectors)?")) {
                        handleTransition("TARGETED_REWORK", "STAFF_TECHNICAL_REVIEW");
                      }
                    }}
                    className="w-full inline-flex justify-center items-center px-4 py-2.5 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-lg shadow-sm transition-all text-center"
                  >
                    ↩️ Direct Return to Technical Field Reviewers
                  </button>
                </div>
              )}

            </div>
          </div>

        </div>
      </div>
    </div>
  );
}