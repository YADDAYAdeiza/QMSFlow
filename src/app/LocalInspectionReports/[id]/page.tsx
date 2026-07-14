// @/app/dashboard/local-reports/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import GMPReportWorkspace from "@/components/LocalInspectionReports/GMPReportWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

// 📋 Strict 1:1 deduction of your ChecklistData Schema structure 
// Used to safely initialize missing properties in older or fresh database records
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

export default async function LocalReportPage({ params }: PageProps) {
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

  // 2. Fetch QMS metrics ledger directly from your Supabase table for this specific record
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
    .orderBy(desc(qmsTimelines.startTime)); // Show freshest desk activities first

  // 3. Map database values into clean, scannable parameters for your UI component
  const formattedTimeLogs = rawTimeLogs.map((log) => {
    // Safe fallback if startTime is null or missing in the DB
    const start = log.startTime ? new Date(log.startTime) : new Date();
    const end = log.endTime ? new Date(log.endTime) : null;
    
    // Calculate precise time difference on the fly to meet strict QMS duration specs
    const durationInSeconds = end 
      ? Math.round((end.getTime() - start.getTime()) / 1000) 
      : Math.round((new Date().getTime() - start.getTime()) / 1000); // Running total if still active

    // 🔄 Applied custom structural mapping for NAFDAC units
    const mappedDivision = log.division; 
    const finalDivision = ["VMD", "PAD", "AFPD", "IRSD"].includes(mappedDivision || "") 
      ? mappedDivision 
      : "VMD"; // Sensible default alignment

    return {
      id: log.id.toString(),
      // Clean string conversion for UI text mapping rules (DDD updated to Divisional Deputy Director)
      point: log.point ? log.point.replace("DDD", "Divisional Deputy Director") : "Unknown Desk Node",
      division: finalDivision,
      staffName: log.staffId || "System Pending", 
      enteredAt: start.toISOString(),
      exitedAt: end ? end.toISOString() : null,
      durationInSeconds,
    };
  });

  // --- 4. Safely extract values from the jsonb details block ---
  const appDetails = (application.details as any) || {};

  const initialComments = appDetails.comments || [];
  const initialReportHtml = appDetails.compiledReportHtml || null;
  
  // Try to find the step in the workflow metadata, fallback to row-level currentPoint, then standard default
  const initialStepKey = appDetails.inspectionWorkflowMeta?.currentStepKey 
    || application.currentPoint 
    || "STAFF_TECHNICAL_REVIEW"; 

  // Focus directly on the active 'checklistSnapshot', falling back to 'savedChecklistSnapshot' if needed
  const activeSnapshot = appDetails.checklistSnapshot || appDetails.savedChecklistSnapshot;

  const initialChecklistSnapshot = activeSnapshot 
    ? {
        ...BASE_CHECKLIST_TEMPLATE,
        ...activeSnapshot,
        // Hydrate sub-structures safely so undefined nested elements do not cause layout crashes
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
        type_of_inspection: application.type || "PRI", // Grabs 'PRI' value from applications row
        report_doc_number: application.applicationNumber || `NAFDAC/VMD/GMP/${application.id}/2026`,
        final_recommendation: "PENDING"
      };

  // 🔐 Authenticated session context default
  const authenticatedUserSessionName = "Roseline";

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <GMPReportWorkspace 
        applicationId={application.id.toString()} 
        companyId={application.companyId ? application.companyId.toString() : ""} 
        companyName={application.companyName || "Unknown Manufacturing Site"}
        activeUserName={authenticatedUserSessionName} 
        initialStepKey={initialStepKey}
        initialReportHtml={initialReportHtml}
        initialChecklistSnapshot={initialChecklistSnapshot}
        initialComments={initialComments}
        // timeLogs={formattedTimeLogs} 
      />
    </div>
  );
}