import { db } from "@/db"; 
import { applications, companies, capaSubmissions } from "@/db/schema"; 
import { eq, or, inArray, ne, and } from "drizzle-orm";
import React from "react";
import Link from "next/link";
import AuditTrailButton from "@/components/LocalInspectionReports/AuditTrailButton"; 

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

interface ApplicationItem {
  id: number;
  applicationNumber: string;
  type: string;
  status: string;
  currentPoint: string | null;
  companyName: string;
  details: string | any; 
  capaStatus?: string | null;
  updatedAt?: Date | string | null;
}

export default async function DivisionalDeputyDirectorInboxDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const resolvedSearchParams = (await searchParams) || {};
  const { tab } = resolvedSearchParams;
  
  const validTabs = [
    "unassigned", 
    "assigned", 
    "irsd_intake", 
    "irsd_review", 
    "approved", 
    "capa_approved"
  ];
  const activeTab = validTabs.includes(tab || "") ? tab : "unassigned";
  
  let records: ApplicationItem[] = [];
  try {
    records = await db
      .select({
        id: applications.id,
        applicationNumber: applications.applicationNumber,
        type: applications.type,
        status: applications.status,
        currentPoint: applications.currentPoint,
        companyName: companies.name,
        details: applications.details, 
        capaStatus: capaSubmissions.status,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .innerJoin(companies, eq(applications.companyId, companies.id))
      .leftJoin(capaSubmissions, eq(applications.id, capaSubmissions.applicationId))
      .where(
        and(
          ne(applications.type, "Facility Verification"),
          or(
            inArray(applications.status, [
              "INSPECTION_PENDING", 
              "INSPECTION_SCHEDULED", 
              "PENDING_IRSD_ROUTING",
              "PENDING_IRSD_CONCURRENCE",
              "APPROVED", 
              "CAPA_APPROVED",
              "FINALIZED"
            ]),
            inArray(applications.currentPoint, [
              "Staff Technical Field Review",
              "Divisional Deputy Director Technical Assignment",
              "Divisional Deputy Director Technical Endorsement",
              "Divisional Deputy Director IRSD Routing",
              "Divisional Deputy Director IRSD Concurrence",
              "Applicant Notification Hub - Final Approval Certified"
            ])
          )
        )
      );
  } catch (error) {
    console.error("Direct Database Fetch Failure:", error);
  }

  const filteredRecords = records.filter(
    app => app.type?.toLowerCase() !== "facility verification"
  );

  const hasDivisionalDeputyDirectorHistory = (app: ApplicationItem): boolean => {
    try {
      if (!app.details) return false;
      const parsedDetails = typeof app.details === "string" ? JSON.parse(app.details) : app.details;
      const comments: CommentTrail[] = parsedDetails?.comments || [];
      
      return comments.some((comment) => 
        (comment.fromStep && comment.fromStep.includes("Divisional Deputy Director")) ||
        (comment.toStep && comment.toStep.includes("Divisional Deputy Director"))
      );
    } catch (e) {
      console.error(`Failed parsing details history for application ID ${app.id}:`, e);
      return false;
    }
  };

  const unassigned = filteredRecords.filter(
    app => app.currentPoint === "Divisional Deputy Director Technical Assignment" && app.status === "INSPECTION_PENDING"
  );
  
  const assigned = filteredRecords.filter(
    app => 
      (app.currentPoint && app.currentPoint.includes("Divisional Deputy Director") && app.status !== "INSPECTION_PENDING") ||
      (app.status === "INSPECTION_SCHEDULED" && hasDivisionalDeputyDirectorHistory(app))
  );

  const irsdIntake = filteredRecords.filter(
    app => app.currentPoint === "Divisional Deputy Director IRSD Routing" || app.status === "PENDING_IRSD_ROUTING"
  );

  const irsdReview = filteredRecords.filter(
    app => app.currentPoint === "Divisional Deputy Director IRSD Concurrence" || app.status === "PENDING_IRSD_CONCURRENCE"
  );

  const approved = filteredRecords.filter(
    app => (app.status === "APPROVED" || app.status === "FINALIZED") && hasDivisionalDeputyDirectorHistory(app)
  );
  
  const capaApproved = filteredRecords.filter(
    app => app.status === "CAPA_APPROVED" && hasDivisionalDeputyDirectorHistory(app)
  );
  
  let currentList: ApplicationItem[] = [];
  if (activeTab === "unassigned") currentList = unassigned;
  else if (activeTab === "assigned") currentList = assigned;
  else if (activeTab === "irsd_intake") currentList = irsdIntake;
  else if (activeTab === "irsd_review") currentList = irsdReview;
  else if (activeTab === "approved") currentList = approved;
  else if (activeTab === "capa_approved") currentList = capaApproved;

  const isIrsdTab = activeTab === "irsd_intake" || activeTab === "irsd_review";

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      <header className="flex flex-col md:flex-row justify-between items-start md:items-center border-b pb-5 border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Divisional Deputy Director Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">Manage, endorse, route, and track veterinary product pipeline applications.</p>
        </div>
      </header>

      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200 gap-2 overflow-x-auto">
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
            No dynamic workflow applications matching this criteria were found.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 tracking-wider">
                  <th className="p-4">Application ID</th>
                  <th className="p-4">Company Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Current Desk Location</th>
                  {isIrsdTab ? (
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
                    <td className="p-4">{app.companyName}</td>
                    <td className="p-4">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200">
                        {app.type}
                      </span>
                    </td>
                    <td className="p-4 text-slate-600 max-w-xs truncate">{app.currentPoint || "N/A"}</td>
                    
                    {/* Replaced System Status column with Action Target for IRSD tabs */}
                    {isIrsdTab ? (
                      <td className="p-4">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-50 text-amber-800 border border-amber-200">
                          {activeTab === "irsd_intake" ? "Assign IRSD Staff" : "IRSD Final Concurrence"}
                        </span>
                      </td>
                    ) : (
                      <td className="p-4">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                          app.status === "CAPA_APPROVED"
                            ? "bg-purple-50 text-purple-700 border-purple-200"
                            : app.status === "APPROVED" || app.status === "FINALIZED"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : app.status === "INSPECTION_PENDING"
                            ? "bg-amber-50 text-amber-700 border-amber-200"
                            : "bg-blue-50 text-blue-700 border-blue-200"
                        }`}>
                          {app.status}
                        </span>
                      </td>
                    )}

                    <td className="p-4 text-right whitespace-nowrap space-x-2">
                      {activeTab === "unassigned" && (
                        <Link
                          href={`/LocalInspectionReports/ddd/applications/${app.id}`}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                        >
                          <span>📝</span> Assign Task
                        </Link>
                      )}

                      {/* Changed to Review for both IRSD Intake and Review tabs */}
                      {/* For IRSD Intake / Review Links */}
                        {isIrsdTab && (
                          <Link
                            href={`/LocalInspectionReports/${app.id}?step=${
                              activeTab === "irsd_intake" ? "DDD_IRSD_INTAKE" : "DDD_IRSD_REVIEW"
                            }`}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
                          >
                            <span>👁️</span> Review Application
                          </Link>
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