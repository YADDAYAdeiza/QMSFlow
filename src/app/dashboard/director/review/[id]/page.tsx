export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, users, riskAssessments } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DirectorReviewClient from "./DirectorReviewClient";
import { supabase } from "@/lib/supabase";

export default async function DirectorReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;
  if (!id || id === "undefined") return notFound();
  
  const appId = parseInt(id);
  if (isNaN(appId)) return notFound();

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { localApplicant: true, riskAssessments: true }
  });

  if (!app) return notFound();

  const appDetails = (app.details as any) || {};
  
  // DETECTION LOGIC: Swapping to GMP Certificate mode if an inspection report exists
  const isInspection = !!(appDetails.inspectionReportUrl || appDetails.isInspectionFlow);
  const docTitle = isInspection ? "GMP Certificate" : "GMP Clearance Letter";
  const docType = isInspection ? "CERTIFICATE" : "CLEARANCE";

  const riskData = app.riskAssessments?.[0];
  
  const complianceRisk = riskData ? {
    isSra: riskData.sraStatus === "TRUE" || riskData.sraStatus === "true",
    intrinsicLevel: riskData.intrinsicLevel || "Low",
    overallRating: riskData.overallRiskRating || "N/A", 
    summary: {
      criticalCount: riskData.criticalDeficiencies || 0,
      majorCount: riskData.majorDeficiencies || 0,
      otherCount: appDetails.otherCount || 0, 
    },
    findings: appDetails.complianceFindings || [],
  } : null;

  const activeStream = appDetails.division || "VMD";

  // Priority URL logic: Always favor the Inspection Report for this view if it exists
  let finalPdfUrl = appDetails.inspectionReportUrl || appDetails.poaUrl || appDetails.reportUrl || "";
  if (finalPdfUrl && !finalPdfUrl.startsWith('http')) {
    const { data } = supabase.storage.from('documents').getPublicUrl(finalPdfUrl);
    finalPdfUrl = data.publicUrl;
  }

  const cleanApp = {
    ...app,
    isInspection,
    docTitle,
    docType,
    company: app.localApplicant, 
    details: appDetails,
    commentsTrail: Array.isArray(appDetails.comments) ? appDetails.comments : [],
    // Dynamic recommendation text based on type
    dddInstruction: [...(appDetails.comments || [])].reverse().find((c: any) => 
        c.role === "Divisional Deputy Director" || c.role === "DDD"
    )?.text || `Recommended for ${isInspection ? 'certification' : 'clearance'} based on technical compliance.`,
    complianceRisk 
  };

  const usersList = await db.select({ id: users.id, name: users.name }).from(users);

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      usersList={usersList}
      currentUserId="DIR-001" 
      stream={activeStream}
      pdfUrl={finalPdfUrl}
    />
  );
}