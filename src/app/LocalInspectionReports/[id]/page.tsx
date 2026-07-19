// @/app/dashboard/local-reports/[id]/page.tsx
import { db } from "@/db";
// 📝 Imported inspectionSchedules and inspectionTeamAssignments from your schema file
import { applications, companies, qmsTimelines, inspectionSchedules, inspectionTeamAssignments } from "@/db/schema";
import { eq, desc, and } from "drizzle-orm";
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
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const resolvedParams = await params;
  const targetId = resolvedParams.id;
  const numericId = Number(targetId);
  if (isNaN(numericId)) {
    notFound();
  }

  // 1. Fetch baseline tracking parameters and the details JSON config
  const appData = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      companyId: applications.companyId,
      companyName: companies.name,
      details: applications.details,
      currentPoint: applications.currentPoint,
      status: applications.status,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, numericId))
    .limit(1);

  const application = appData[0];

  if (!application) {
    notFound();
  }

  // 🛡️ 2. Dynamic Assignment Role Retrieval
  // Cross-reference this application's schedule with team assignments for this specific user
  const assignmentData = await db
    .select({
      role: inspectionTeamAssignments.role,
    })
    .from(inspectionTeamAssignments)
    .innerJoin(
      inspectionSchedules, 
      eq(inspectionTeamAssignments.scheduleId, inspectionSchedules.id)
    )
    .where(
      and(
        eq(inspectionSchedules.applicationId, numericId),
        eq(inspectionTeamAssignments.inspectorId, user.id)
      )
    )
    .limit(1);

  // Fallback to "CO_INSPECTOR" if no explicit schedule assignment is found in the ledger yet
  const dynamicAssignmentRole = assignmentData[0]?.role || "CO_INSPECTOR";

  // 3. Fetch public global user configuration from your public.users table for names
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
  
  const initialStepKey = appDetails.inspectionWorkflowMeta?.currentStepKey 
    || application.currentPoint 
    || "STAFF_TECHNICAL_REVIEW"; 

  const activeSnapshot = appDetails.checklistSnapshot || appDetails.savedChecklistSnapshot;

  const initialChecklistSnapshot = activeSnapshot 
    ? {
        ...BASE_CHECKLIST_TEMPLATE,
        ...activeSnapshot,
        site_contact_details: {
          ...BASE_CHECKLIST_TEMPLATE.site_contact_details,
          ...(activeSnapshot.site_contact_details || {})
        },
        historical_baseline: {
          ...BASE_CHECKLIST_TEMPLATE.historical_baseline,
          ...(activeSnapshot.historical_baseline || {})
        }
      }
    : {
        ...BASE_CHECKLIST_TEMPLATE,
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
        activeUserRole={dynamicAssignmentRole} // 👈 Dynamic per-dossier role verification
        globalStructuralRole={structuralBaseRole} // Pass organizational role context if needed
        initialStepKey={initialStepKey}
        initialReportHtml={initialReportHtml}
        initialChecklistSnapshot={initialChecklistSnapshot}
        initialComments={initialComments}
      />
    </div>
  );
}