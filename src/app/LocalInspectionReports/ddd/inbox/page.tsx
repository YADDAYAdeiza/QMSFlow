import { db } from "@/db"; 
import { applications, companies } from "@/db/schema"; 
import { eq, or, inArray } from "drizzle-orm";
import React from "react";
import Link from "next/link";
import AuditTrailButton from "@/components/LocalInspectionReports/AuditTrailButton"; 
import RecallApplicationButton from "@/components/LocalInspectionReports/RecallApplicationButton";
import CategorizeButton from "@/components/LocalInspectionReports/CategorizeButton";
import CategorizeEndorsementTrigger from "@/components/LocalInspectionReports/CategorizeEndorsementTrigger"; 
import { facilityCategorizationWorkflow } from "@/config/workflows/facilityCategorizationWorkflow";
import { inspectionScheduleBatchWorkflow } from "@/config/workflows/inspectionScheduleBatchWorkflow";

interface CommentTrail {
  text?: string;
  action?: string;
  fromStep?: string;
  toStep?: string;
  actorId?: string;
  actorName?: string;
  actorRole?: string;
  timestamp?: string;
  assignedToId?: string;
}

interface ApplicationDetails {
  comments?: CommentTrail[];
  facilityName?: string;
  facilityAddress?: string;
  [key: string]: unknown;
}

interface ApplicationItem {
  id: number;
  applicationNumber: string;
  type: string;
  status: string;
  currentPoint: string | null;
  companyName: string; // Local Applicant Company Name
  facilityId: string | null;
  isCategorized: boolean | null;
  nextInspectionDate?: Date | string | null;
  details: ApplicationDetails | null; 
  capaStatus?: string | null;
  updatedAt?: Date | string | null;
  isDeskReview?: boolean | null;
  displayFacilityName?: string; // Target Foreign Facility Name extracted from JSON
}

export default async function DivisionalDeputyDirectorDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }> | { tab?: string };
}) {
  const resolvedSearchParams = (await Promise.resolve(searchParams)) || {};
  const { tab } = resolvedSearchParams;
  
  const validTabs = [
    "categorization",
    "endorse_categorization",
    "unassigned", 
    "assigned", 
    "irsd_intake", 
    "irsd_in_flight", 
    "irsd_review", 
    "approved", 
    "capa_approved",
    "finished_verifications"
  ];
  const activeTab = validTabs.includes(tab || "") ? tab : "categorization";
  
  let records: ApplicationItem[] = [];
  let queryError = false;

  const batchPendingStep = inspectionScheduleBatchWorkflow?.steps?.INSPECTION_PENDING || {
    statusLabel: "INSPECTION_PENDING",
    currentPoint: "Inspection Pending",
    title: "Inspection Pending",
    key: "INSPECTION_PENDING"
  };

  const catSteps = facilityCategorizationWorkflow?.steps || {};
  const techAssignmentStep = catSteps.DDD_TECHNICAL_ASSIGNMENT || { key: "", title: "", statusLabel: "" };
  const catEndorsementStep = catSteps.DDD_CATEGORIZATION_ENDORSEMENT || { key: "", title: "", statusLabel: "" };
  const catCompletedStep = catSteps.CATEGORIZATION_COMPLETED || { currentPoint: "" };

  try {
    const rawRecords = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        type: applications.type,
        status: applications.status,
        currentPoint: applications.currentPoint,
        companyName: companies.name,
        facilityId: applications.facilityId,
        details: applications.details, 
        updatedAt: applications.updatedAt,
        isDeskReview: applications.isDeskReview,
      })
      .from(applications)
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .where(
        or(
          inArray(applications.status, [
            batchPendingStep.statusLabel, 
            "INSPECTION_SCHEDULED", 
            techAssignmentStep.statusLabel, 
            catEndorsementStep.statusLabel, 
            "PENDING_IRSD_ROUTING",
            "UNDER_IRSD_VETTING",
            "PENDING_IRSD_CONCURRENCE",
            "APPROVED", 
            "CAPA_APPROVED",
            "FINALIZED",
            "APPROVED_AND_ARCHIVED"
          ]),
          inArray(applications.currentPoint, [
            batchPendingStep.currentPoint,
            batchPendingStep.title,
            batchPendingStep.key,
            "Staff Technical Field Review",
            techAssignmentStep.key,   
            techAssignmentStep.title, 
            "Divisional Deputy Director Technical Assignment",                     
            catEndorsementStep.key,   
            catEndorsementStep.title, 
            "DDD_TECHNICAL_REVIEW",
            "Divisional Deputy Director Technical Endorsement",
            "DDD_IRSD_INTAKE",
            "Divisional Deputy Director IRSD Routing",
            "IRSD_STAFF_VETTING",
            "IRSD Staff Compliance Vetting",
            "DDD_IRSD_REVIEW",
            "Divisional Deputy Director IRSD Concurrence",
            "Applicant Notification Hub - Final Approval Certified",
            "Report Approved and Archived"
          ])
        )
      );

    records = (rawRecords ?? []).map((rec: any) => {
      let parsedDetails: ApplicationDetails = {};
      if (typeof rec.details === "string") {
        try {
          parsedDetails = JSON.parse(rec.details);
        } catch {
          parsedDetails = {};
        }
      } else if (rec.details && typeof rec.details === "object") {
        parsedDetails = rec.details as ApplicationDetails;
      }

      return {
        ...rec,
        details: parsedDetails,
        displayFacilityName: parsedDetails.facilityName || "N/A",
        isCategorized: false,
        nextInspectionDate: null,
        capaStatus: null,
      };
    });
  } catch (error) {
    console.error("Direct Database Fetch Failure:", error);
    queryError = true;
  }

  const hasDivisionalDeputyDirectorHistory = (app: ApplicationItem): boolean => {
    const comments = app?.details?.comments;
    if (!comments || !Array.isArray(comments)) return false;
    return comments.some(
      (comment) => 
        (comment?.fromStep && typeof comment.fromStep === "string" && comment.fromStep.includes("Divisional Deputy Director")) ||
        (comment?.toStep && typeof comment.toStep === "string" && comment.toStep.includes("Divisional Deputy Director"))
    );
  };

  const safeRecords = records ?? [];

  const categorizationList = safeRecords.filter(
    app => 
      app &&
      (
        app.currentPoint === techAssignmentStep.key ||
        app.currentPoint === techAssignmentStep.title ||
        app.currentPoint === "Divisional Deputy Director Technical Assignment" ||
        app.status === techAssignmentStep.statusLabel
      ) && app.isCategorized === false
  );

  const endorseCategorizationList = safeRecords.filter(
    app => 
      app &&
      (
        app.currentPoint === catEndorsementStep.key || 
        app.currentPoint === catEndorsementStep.title ||
        app.status === catEndorsementStep.statusLabel
      )
  );

  const unassigned = safeRecords.filter(
    app => 
      app &&
      (
        ((
          app.currentPoint === techAssignmentStep.key || 
          app.currentPoint === techAssignmentStep.title ||
          app.currentPoint === "Divisional Deputy Director Technical Assignment"
        ) && app.isCategorized === true) ||
        app.currentPoint === catCompletedStep.currentPoint ||
        app.currentPoint === batchPendingStep.currentPoint ||
        app.currentPoint === batchPendingStep.key ||
        app.currentPoint === batchPendingStep.title
      ) &&
      app.status === batchPendingStep.statusLabel
  );
  
  const assigned = safeRecords.filter(
    app => 
      app &&
      (
        (app.currentPoint && 
         app.currentPoint.includes("Divisional Deputy Director") && 
         app.status !== batchPendingStep.statusLabel && 
         app.status !== catEndorsementStep.statusLabel) ||
        (app.status === "INSPECTION_SCHEDULED" && hasDivisionalDeputyDirectorHistory(app))
      )
  );

  const irsdIntake = safeRecords.filter(
    app => app && (app.currentPoint === "DDD_IRSD_INTAKE" || app.currentPoint === "Divisional Deputy Director IRSD Routing" || app.status === "PENDING_IRSD_ROUTING")
  );

  const irsdInFlight = safeRecords.filter(
    app => app && (app.currentPoint === "IRSD_STAFF_VETTING" || app.currentPoint === "IRSD Staff Compliance Vetting" || app.status === "UNDER_IRSD_VETTING")
  );

  const irsdReview = safeRecords.filter(
    app => app && (app.currentPoint === "DDD_IRSD_REVIEW" || app.currentPoint === "Divisional Deputy Director IRSD Concurrence" || app.status === "PENDING_IRSD_CONCURRENCE")
  );

  const approved = safeRecords.filter(
    app => app && (app.status === "APPROVED" || app.status === "FINALIZED") && hasDivisionalDeputyDirectorHistory(app)
  );
  
  const capaApproved = safeRecords.filter(
    app => app && app.status === "CAPA_APPROVED" && hasDivisionalDeputyDirectorHistory(app)
  );

  const finishedVerifications = safeRecords.filter(
    app => 
      app &&
      app.type === "Facility Verification" &&
      app.currentPoint === "Report Approved and Archived" &&
      app.status === "APPROVED_AND_ARCHIVED" &&
      app.isDeskReview === false
  );
  
  let currentList: ApplicationItem[] = [];
  if (activeTab === "categorization") currentList = categorizationList;
  else if (activeTab === "endorse_categorization") currentList = endorseCategorizationList;
  else if (activeTab === "unassigned") currentList = unassigned;
  else if (activeTab === "assigned") currentList = assigned;
  else if (activeTab === "irsd_intake") currentList = irsdIntake;
  else if (activeTab === "irsd_in_flight") currentList = irsdInFlight;
  else if (activeTab === "irsd_review") currentList = irsdReview;
  else if (activeTab === "approved") currentList = approved;
  else if (activeTab === "capa_approved") currentList = capaApproved;
  else if (activeTab === "finished_verifications") currentList = finishedVerifications;

  const isIrsdTab = activeTab === "irsd_intake" || activeTab === "irsd_review" || activeTab === "irsd_in_flight";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Divisional Deputy Director Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, categorize, endorse, route, recall, and track veterinary product pipeline applications.</p>
        </div>
      </header>

      {queryError && (
        <div className="p-4 bg-rose-50 border border-rose-200 rounded-lg text-rose-800 text-sm">
          Unable to fetch dashboard applications. Please refresh or contact system administration.
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
        <Link 
          href="?tab=categorization" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "categorization" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>🏷️ Facility Categorization</span>
          {categorizationList.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-blue-100 text-blue-800 font-bold">
              {categorizationList.length}
            </span>
          )}
        </Link>

        <Link 
          href="?tab=endorse_categorization" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "endorse_categorization" 
              ? "border-purple-600 text-purple-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>🛡️ Categorization Endorsements</span>
          {endorseCategorizationList.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-purple-100 text-purple-800 font-bold">
              {endorseCategorizationList.length}
            </span>
          )}
        </Link>

        <Link 
          href="?tab=unassigned" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "unassigned" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Unassigned Tasks ({unassigned.length})
        </Link>
        <Link 
          href="?tab=assigned" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "assigned" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          My Desk / Active ({assigned.length})
        </Link>
        <Link 
          href="?tab=irsd_intake" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "irsd_intake" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          IRSD Intake Routing ({irsdIntake.length})
        </Link>
        <Link 
          href="?tab=irsd_in_flight" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "irsd_in_flight" 
              ? "border-amber-600 text-amber-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          IRSD Active / Recall ({irsdInFlight.length})
        </Link>
        <Link 
          href="?tab=irsd_review" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "irsd_review" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          IRSD Concurrence Review ({irsdReview.length})
        </Link>
        <Link 
          href="?tab=finished_verifications" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors flex items-center gap-2 ${
            activeTab === "finished_verifications" 
              ? "border-emerald-600 text-emerald-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          <span>📋 Inspection Scheduling Queue</span>
          {finishedVerifications.length > 0 && (
            <span className="px-2 py-0.5 text-xs rounded-full bg-emerald-100 text-emerald-800 font-bold">
              {finishedVerifications.length}
            </span>
          )}
        </Link>
        <Link 
          href="?tab=approved" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "approved" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          Approved Logs ({approved.length})
        </Link>
        <Link 
          href="?tab=capa_approved" 
          className={`px-4 py-2.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${
            activeTab === "capa_approved" 
              ? "border-blue-600 text-blue-600 font-semibold" 
              : "border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300"
          }`}
        >
          CAPA Actioned ({capaApproved.length})
        </Link>
      </div>

      {/* Grid Table Display */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
        {currentList.length === 0 ? (
          <div className="p-12 text-center text-slate-400 text-sm">
            No applications matching this criteria were found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 tracking-wider">
                  <th className="p-4">Application ID</th>
                  <th className="p-4">{activeTab === "finished_verifications" ? "Target Facility & Local Agent" : "Company Name"}</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Current Location</th>
                  {activeTab === "categorization" ? (
                    <th className="p-4">Categorization Status</th>
                  ) : activeTab === "endorse_categorization" ? (
                    <th className="p-4">Endorsement Status</th>
                  ) : activeTab === "unassigned" ? (
                    <th className="p-4">Tentative Inspection Date</th>
                  ) : activeTab === "finished_verifications" ? (
                    <th className="p-4">Scheduling Status</th>
                  ) : isIrsdTab ? (
                    <th className="p-4">Action Target</th>
                  ) : (
                    <th className="p-4">System Status</th>
                  )}
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
                {currentList.map((app) => (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-900">{app.applicationNumber}</td>
                    
                    {/* Facility vs Local Agent Column Rendering */}
                    <td className="p-4">
                      {activeTab === "finished_verifications" ? (
                        <div>
                          <div className="font-bold text-slate-900">{app.displayFacilityName}</div>
                          <div className="text-xs text-slate-500">Agent: <span className="font-medium text-slate-700">{app.companyName}</span></div>
                        </div>
                      ) : (
                        <span>{app.companyName}</span>
                      )}
                    </td>

                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {app.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{app.currentPoint || "N/A"}</td>
                    
                    {activeTab === "categorization" ? (
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
                          Pending PIC/S Categorization
                        </span>
                      </td>
                    ) : activeTab === "endorse_categorization" ? (
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                          Awaiting Categorization Endorsement
                        </span>
                      </td>
                    ) : activeTab === "unassigned" ? (
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          📅 {app.nextInspectionDate ? new Date(app.nextInspectionDate).toLocaleDateString() : "Immediate / ASAP"}
                        </span>
                      </td>
                    ) : activeTab === "finished_verifications" ? (
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          Ready for Scheduling (Full Payment)
                        </span>
                      </td>
                    ) : isIrsdTab ? (
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          activeTab === "irsd_in_flight"
                            ? "bg-amber-100 text-amber-900 border-amber-300"
                            : "bg-amber-50 text-amber-800 border-amber-200"
                        }`}>
                          {activeTab === "irsd_intake" 
                            ? "Assign IRSD Staff" 
                            : activeTab === "irsd_in_flight"
                            ? "IRSD Staff Vetting In-Progress"
                            : "IRSD Final Concurrence"}
                        </span>
                      </td>
                    ) : (
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          app.status === "CAPA_APPROVED"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : app.status === "APPROVED" || app.status === "FINALIZED" || app.status === "APPROVED_AND_ARCHIVED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : app.status === batchPendingStep?.statusLabel
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    )}

                    <td className="p-4 text-right whitespace-nowrap space-x-2">
                      {activeTab === "categorization" && (
                        <CategorizeButton
                          applicationId={app.id}
                          companyName={app.companyName}
                          applicationNumber={app.applicationNumber}
                        />
                      )}

                      {activeTab === "endorse_categorization" && (
                        <CategorizeEndorsementTrigger
                          applicationId={app.id}
                          facilityId={app.facilityId}
                          companyName={app.companyName}
                          applicationNumber={app.applicationNumber}
                        />
                      )}

                      {activeTab === "unassigned" && (
                        <Link
                          href={`/LocalInspectionReports/ddd/applications/${app.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                        >
                          <span>📝</span> Assign Task
                        </Link>
                      )}

                      {activeTab === "finished_verifications" && (
                        <Link
                          href={`/LocalInspectionReports/ddd/schedule-inspection/${app.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                        >
                          <span>📅</span> Schedule Inspection
                        </Link>
                      )}

                      {(activeTab === "irsd_intake" || activeTab === "irsd_review") && (
                        <Link
                          href={`/LocalInspectionReports/${app.id}?step=${
                            activeTab === "irsd_intake" ? "DDD_IRSD_INTAKE" : "DDD_IRSD_REVIEW"
                          }`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                        >
                          <span>👁️</span> Review Application
                        </Link>
                      )}

                      {activeTab === "irsd_in_flight" && (
                        <RecallApplicationButton applicationId={app.id} />
                      )}
                      
                      <AuditTrailButton id={app.id} applicationNumber={app.applicationNumber} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}