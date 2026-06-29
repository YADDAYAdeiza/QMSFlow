// @/app/dashboard/local-reports/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { notFound } from "next/navigation";
import GMPReportWorkspace from "@/components/LocalInspectionReports/GMPReportWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

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
    const start = new Date(log.startTime);
    const end = log.endTime ? new Date(log.endTime) : null;
    
    // Calculate precise time difference on the fly to meet strict QMS duration specs
    const durationInSeconds = end 
      ? Math.round((end.getTime() - start.getTime()) / 1000) 
      : Math.round((new Date().getTime() - start.getTime()) / 1000); // Running total if still active

    return {
      id: log.id.toString(),
      point: log.point || "Unknown Desk Node",
      division: log.division || "Unassigned",
      staffName: log.staffId || "System Pending", // Later maps to structural directory
      enteredAt: start.toISOString(),
      exitedAt: end ? end.toISOString() : null,
      durationInSeconds,
    };
  });

  // 4. Safely extract values from the jsonb details block to feed the workspace fields
  const appDetails = (application.details as any) || {};
  
  const initialComments = appDetails.comments || [];
  const initialChecklistSnapshot = appDetails.savedChecklistSnapshot || null;
  const initialReportHtml = appDetails.compiledReportHtml || null;
  
  // Resolve active desk step key from metadata, fallback to a default if not set
  const initialStepKey = appDetails.inspectionWorkflowMeta?.currentStepKey || "DDD_TECHNICAL_ASSIGNMENT";

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <GMPReportWorkspace 
        applicationId={application.id.toString()} 
        companyId={application.companyId ? application.companyId.toString() : ""} 
        companyName={application.companyName || "Unknown Manufacturing Site"}
        initialStepKey={initialStepKey}
        initialReportHtml={initialReportHtml}
        initialChecklistSnapshot={initialChecklistSnapshot}
        initialComments={initialComments}
        // If your workspace requires the raw timeline metrics display:
        // timeLogs={formattedTimeLogs} 
      />
    </div>
  );
}