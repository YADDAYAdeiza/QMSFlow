// @/app/dashboard/local-reports/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, qmsTimelines, inspectionSchedules, inspectionTeamAssignments, users as dbUsers } from "@/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GMPReportWorkspace from "@/components/LocalInspectionReports/GMPReportWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

const BASE_CHECKLIST_TEMPLATE = {
  report_doc_number: "OKL-LA-PRI-01-2026",
  inspection_dates: "",
  type_of_inspection: "PRI",
  inspected_site_name: "Orange Kalbe Limited",
  notificationEmail: "",
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

export default async function LocalReportPage({ params }: PageProps) {
  // 🔐 Authenticated session validation
 const supabase = await createClient();
  
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.error("Supabase Auth server fetch failed:", err);
  }

  // If user failed to fetch due to network error or expired session, safely redirect
  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const targetId = resolvedParams.id;
  const numericId = Number(targetId);
  if (isNaN(numericId)) {
    notFound();
  }

  // 1. Fetch baseline tracking parameters, company details, AND scheduled_date from inspectionSchedules
  const appData = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      companyId: applications.companyId,
      companyName: companies.name,
      companyAddress: companies.address,
      details: applications.details,
      currentPoint: applications.currentPoint,
      status: applications.status,
      scheduledDate: inspectionSchedules.scheduledDate,
      scheduleId: inspectionSchedules.id, // Needed for team query below
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(inspectionSchedules, eq(inspectionSchedules.applicationId, applications.id))
    .where(eq(applications.id, numericId))
    .limit(1);

  const application = appData[0];

  if (!application) {
    notFound();
  }

  // Format scheduled_date if present (e.g., "2026-07-27")
  const scheduledDate = application.scheduledDate 
    ? new Date(application.scheduledDate).toISOString().split("T")[0] 
    : "";

  // 🛡️ 2. Dynamic Assignment Role Retrieval & Team Lead Fetching
  const teamAssignments = await db
    .select({
      role: inspectionTeamAssignments.role,
      inspectorId: inspectionTeamAssignments.inspectorId,
    })
    .from(inspectionTeamAssignments)
    .innerJoin(
      inspectionSchedules, 
      eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id)
    )
    .where(eq(inspectionSchedules.applicationId, numericId));

  // Determine current user's role on this active schedule
  const currentUserAssignment = teamAssignments.find(t => t.inspectorId === user.id);
  const dynamicAssignmentRole = currentUserAssignment?.role || "CO_INSPECTOR";

  // Identify the Lead Inspector from team assignments
  const leadAssignment = teamAssignments.find(
    t => t.role === "LEAD_INSPECTOR" || t.role === "TEAM_LEADER"
  );

  let leadInspectorName = "";
  if (leadAssignment?.inspectorId) {
    const leadUserData = await supabase
      .from("users")
      .select("name, email")
      .eq("id", leadAssignment.inspectorId)
      .single();

    leadInspectorName = leadUserData.data?.name || leadUserData.data?.email || "";
  }

  // 3. Fetch public global user configuration from public.users table for current active user
  const userData = await supabase
    .from("users")
    .select("name, role")
    .eq("id", user.id)
    .single();

  const authenticatedUserSessionName = userData.data?.name || user.email || "Authenticated User";
  const structuralBaseRole = userData.data?.role || "Staff";

  // 4. Fetch QMS metrics ledger
  const rawTimeLogs = await db
    .select({
      id: qmsTimelines.id,
      point: qmsTimelines.point,
      division: qmsTimelines.division,
      staffId: qmsTimelines.staffId,
      startTime: qmsTimelines.startTime,
      endTime: qmsTimelines.endTime,
    })
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, numericId))
    .orderBy(desc(qmsTimelines.startTime));

  const formattedTimeLogs = rawTimeLogs.map((log) => {
    const start = log.startTime ? new Date(log.startTime) : new Date();
    const end = log.endTime ? new Date(log.endTime) : null;
    
    const durationInSeconds = end 
      ? Math.round((end.getTime() - start.getTime()) / 1000) 
      : Math.round((new Date().getTime() - start.getTime()) / 1000);

    const mappedDivision = log.division; 
    const finalDivision = ["VMD", "PAD", "AFPD", "IRSD"].includes(mappedDivision || "") 
      ? mappedDivision 
      : "VMD";

    return {
      id: log.id.toString(),
      point: log.point ? log.point.replace(/DDD/g, "Divisional Deputy Director") : "Unknown Desk Node",
      division: finalDivision,
      staffName: log.staffId || "System Pending", 
      enteredAt: start.toISOString(),
      exitedAt: end ? end.toISOString() : null,
      durationInSeconds,
    };
  });

  // 5. Safely extract values from the jsonb details block
  const appDetails = (application.details as any) || {};
  const initialComments = appDetails.comments || [];
  const initialReportHtml = appDetails.compiledReportHtml || null;
  const notificationEmail = appDetails.notificationEmail || "";
  const inspectionTypeMeta = appDetails.inspectionTypeMeta || "";
  
  // 🎯 STEP KEY RESOLUTION FIX:
  // Prioritize application.currentPoint directly over jsonb metadata
  const currentPointStr = application.currentPoint || "";
  let initialStepKey = "STAFF_TECHNICAL_REVIEW";

  if (
    currentPointStr === "Staff Technical Field Review" || 
    currentPointStr === "STAFF_TECHNICAL_REVIEW"
  ) {
    initialStepKey = "STAFF_TECHNICAL_REVIEW";
  } else if (
    currentPointStr === "Divisional Deputy Director Technical Assignment" || 
    currentPointStr === "DDD_TECHNICAL_ASSIGNMENT"
  ) {
    initialStepKey = "DDD_TECHNICAL_ASSIGNMENT";
  } else {
    // Fallback to jsonb currentStepKey or currentPoint string if not matched above
    initialStepKey = appDetails.inspectionWorkflowMeta?.currentStepKey || currentPointStr || "STAFF_TECHNICAL_REVIEW";
  }

  const activeSnapshot = appDetails.checklistSnapshot || appDetails.savedChecklistSnapshot;

  // 📍 Extract facility address (checking details JSON keys with fallbacks to database level)
  const facilityAddressState: string = 
    appDetails.facilityAddress || 
    appDetails.siteAddress || 
    appDetails.inspected_site_address || 
    application.companyAddress || 
    "Registered Facility Address";

  // 🏷️ Extract productLines and format as string array
  const rawProductLines = appDetails.productLines || [];
  const productLinesState: string[] = rawProductLines.map((line: any) => {
    const lineName = line.lineName || line.lineType || "Production Line";
    const productNames = Array.isArray(line.products)
      ? line.products.map((p: any) => p.name).filter(Boolean).join(", ")
      : "";
    return productNames ? `${lineName} (${productNames})` : lineName;
  });

  // 📦 Bundling notificationEmail, scheduled_date, & lead_inspector into initial snapshot
  const initialChecklistSnapshot = activeSnapshot 
    ? {
        ...BASE_CHECKLIST_TEMPLATE,
        inspection_dates: activeSnapshot.inspection_dates || scheduledDate,
        lead_inspector: activeSnapshot.lead_inspector || leadInspectorName, // 👈 Pre-fills Lead Inspector
        ...activeSnapshot,
        notificationEmail: activeSnapshot.notificationEmail || notificationEmail,
        inspectionTypeMeta,
        site_contact_details: {
          ...BASE_CHECKLIST_TEMPLATE.site_contact_details,
          email: notificationEmail,
          ...(activeSnapshot.site_contact_details || {})
        },
        historical_baseline: {
          ...BASE_CHECKLIST_TEMPLATE.historical_baseline,
          ...(activeSnapshot.historical_baseline || {})
        }
      }
    : {
        ...BASE_CHECKLIST_TEMPLATE,
        inspection_dates: scheduledDate,
        lead_inspector: leadInspectorName, // 👈 Pre-fills Lead Inspector
        notificationEmail,
        inspectionTypeMeta,
        site_contact_details: {
          ...BASE_CHECKLIST_TEMPLATE.site_contact_details,
          email: notificationEmail
        },
        inspected_site_name: application.companyName || "Unknown Manufacturing Site",
        type_of_inspection: application.type || "PRI", 
        report_doc_number: application.applicationNumber || `NAFDAC/VMD/GMP/${application.id}/2026`,
        final_recommendation: "PENDING"
      };

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <GMPReportWorkspace 
        applicationId={application.id.toString()} 
        companyId={application.companyId ? application.companyId.toString() : ""} 
        companyName={application.companyName || "Unknown Manufacturing Site"}
        activeUserId={user.id} 
        activeUserName={authenticatedUserSessionName} 
        activeUserRole={dynamicAssignmentRole} 
        globalStructuralRole={structuralBaseRole} 
        notificationEmail={notificationEmail}
        scheduledDate={scheduledDate}
        leadInspectorName={leadInspectorName}
        initialStepKey={initialStepKey}
        initialReportHtml={initialReportHtml}
        initialChecklistSnapshot={initialChecklistSnapshot}
        initialComments={initialComments}
        facilityAddressState={facilityAddressState}
        productLinesState={productLinesState}
      />
    </div>
  );
}