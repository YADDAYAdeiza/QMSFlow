// @/app/dashboard/local-reports/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, qmsTimelines, inspectionSchedules, inspectionTeamAssignments, users as dbUsers } from "@/db/schema";
import { eq, desc, and, or, inArray } from "drizzle-orm";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/utils/supabase/server";
import GMPReportWorkspace from "@/components/LocalInspectionReports/GMPReportWorkspace";

// 🎯 Express Step Key Union Type matching GMPReportWorkspace requirements
export type StepKey =
  | "STAFF_TECHNICAL_REVIEW"
  | "DDD_TECHNICAL_ASSIGNMENT"
  | "LOD"
  | "DIRECTOR_INTAKE"
  | "DDD_TECHNICAL_REVIEW"
  | "DDD_IRSD_INTAKE"
  | "IRSD_STAFF_VETTING"
  | "DDD_IRSD_REVIEW"
  | "DIRECTOR_FINAL_SIGN_OFF"
  | "FINALIZED";

const VALID_STEP_KEYS: StepKey[] = [
  "STAFF_TECHNICAL_REVIEW",
  "DDD_TECHNICAL_ASSIGNMENT",
  "LOD",
  "DIRECTOR_INTAKE",
  "DDD_TECHNICAL_REVIEW",
  "DDD_IRSD_INTAKE",
  "IRSD_STAFF_VETTING",
  "DDD_IRSD_REVIEW",
  "DIRECTOR_FINAL_SIGN_OFF",
  "FINALIZED",
];

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ step?: string }>;
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
  trainee_inspectors: "",
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

export default async function LocalReportPage({ params, searchParams }: PageProps) {
  // 🔐 Authenticated session validation
  const supabase = await createClient();
  
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data?.user || null;
  } catch (err) {
    console.error("Supabase Auth server fetch failed:", err);
  }

  if (!user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const resolvedSearchParams = (await searchParams) || {};
  const requestedStep = resolvedSearchParams.step;

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
      scheduleId: inspectionSchedules.id,
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

  // Format scheduled_date if present
  const scheduledDate = application.scheduledDate 
    ? new Date(application.scheduledDate).toISOString().split("T")[0] 
    : "";

  // 🛡️ 2. Dynamic Assignment Role Retrieval & Team Lead/Members Fetching
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

  // Batch fetch profiles and signatures for all team members in a single query
  const teamUserIds = teamAssignments
    .map(t => t.inspectorId)
    .filter((id): id is string => Boolean(id));

  let userProfilesMap: Record<string, string> = {};
  let signaturesMap: Record<string, string> = {};

  if (teamUserIds.length > 0) {
    const { data: teamUsersData } = await supabase
      .from("users")
      .select("id, name, email, signature_url")
      .in("id", teamUserIds);

    if (teamUsersData) {
      teamUsersData.forEach((u) => {
        const resolvedName = u.name || u.email || "Unknown Inspector";
        userProfilesMap[u.id] = resolvedName;
        if (u.signature_url) {
          signaturesMap[resolvedName] = u.signature_url;
        }
      });
    }
  }

  // Categorize inspectors based on role
  let leadInspectorName = "";
  let leadSignatureUrl = "";
  const coInspectorNames: string[] = [];
  const traineeInspectorNames: string[] = [];

  teamAssignments.forEach((assignment) => {
    const name = userProfilesMap[assignment.inspectorId] || "";
    if (!name) return;

    const roleUpper = (assignment.role || "").toUpperCase();

    if (roleUpper === "LEAD_INSPECTOR" || roleUpper === "TEAM_LEADER") {
      leadInspectorName = name;
      leadSignatureUrl = signaturesMap[name] || "";
      console.log('leadSignatureUrl in page.tsx: ', leadSignatureUrl);
    } else if (roleUpper.includes("TRAINEE")) {
      traineeInspectorNames.push(name);
    } else {
      coInspectorNames.push(name);
    }
  });

  const coInspectorsFormatted = coInspectorNames.join(", ");
  const traineeInspectorsFormatted = traineeInspectorNames.join(", ");

  // 3. Fetch public global user configuration for current active user
  const userData = await supabase
    .from("users")
    .select("name, role, signature_url")
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

  // 5. Extract JSONB details
  const appDetails = (application.details as any) || {};
  const initialComments = appDetails.comments || [];
  const initialReportHtml = appDetails.compiledReportHtml || null;
  const notificationEmail = appDetails.notificationEmail || "";
  const inspectionTypeMeta = appDetails.inspectionTypeMeta || "";
  
  const currentPointStr = application.currentPoint || "";
  let initialStepKey: StepKey = "STAFF_TECHNICAL_REVIEW";

  // Validate and type guard requested step from URL query param
  if (requestedStep && VALID_STEP_KEYS.includes(requestedStep as StepKey)) {
    initialStepKey = requestedStep as StepKey;
  } else if (
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
    const fallbackStep = appDetails.inspectionWorkflowMeta?.currentStepKey || currentPointStr;
    if (VALID_STEP_KEYS.includes(fallbackStep as StepKey)) {
      initialStepKey = fallbackStep as StepKey;
    }
  }

  const activeSnapshot = appDetails.checklistSnapshot || appDetails.savedChecklistSnapshot;

  const facilityAddressState: string = 
    appDetails.facilityAddress || 
    appDetails.siteAddress || 
    appDetails.inspected_site_address || 
    application.companyAddress || 
    "Registered Facility Address";

  const rawProductLines = appDetails.productLines || [];
  const productLinesState: string[] = rawProductLines.map((line: any) => {
    const lineName = line.lineName || line.lineType || "Production Line";
    const productNames = Array.isArray(line.products)
      ? line.products.map((p: any) => p.name).filter(Boolean).join(", ")
      : "";
    return productNames ? `${lineName} (${productNames})` : lineName;
  });

  // 📦 Safely resolve Lead Inspector Signature with prior draft fallback logic
  const resolvedLeadInspectorName = activeSnapshot?.lead_inspector || leadInspectorName;
  const resolvedLeadSig = 
    leadSignatureUrl || 
    signaturesMap[resolvedLeadInspectorName] ||
    activeSnapshot?.lead_signature_url || 
    activeSnapshot?.leadSignatureUrl || 
    "";

  // 📦 Bundling team assignments & fetched signatures into initial snapshot
  const initialChecklistSnapshot = activeSnapshot 
    ? {
        ...BASE_CHECKLIST_TEMPLATE,
        ...activeSnapshot, // 👈 1. Spread draft first so intentional field overrides below take priority!
        
        inspection_dates: activeSnapshot.inspection_dates || scheduledDate,
        lead_inspector: resolvedLeadInspectorName,
        co_inspectors: activeSnapshot.co_inspectors || coInspectorsFormatted,
        trainee_inspectors: activeSnapshot.trainee_inspectors || traineeInspectorsFormatted,
        lead_signature_url: resolvedLeadSig, // 👈 2. Explicit override safely preserved
        leadSignatureUrl: resolvedLeadSig,
        signatures: {
          ...signaturesMap,
          ...(activeSnapshot.signatures || {})
        },
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
        lead_inspector: leadInspectorName,
        co_inspectors: coInspectorsFormatted,
        trainee_inspectors: traineeInspectorsFormatted,
        lead_signature_url: leadSignatureUrl,
        leadSignatureUrl: leadSignatureUrl,
        signatures: signaturesMap,
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

  console.log('Just before passing to Workspace: ', initialChecklistSnapshot.lead_signature_url);

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
        coInspectors={coInspectorsFormatted}
        traineeInspectors={traineeInspectorsFormatted}
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