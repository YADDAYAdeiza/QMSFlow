export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, users, riskAssessments } from "@/db/schema";
import { eq, and } from "drizzle-orm"; // Added and
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

  // 1. Fetch Application and Director Record in parallel
  // We look for a user with the role 'Director' to get their real UUID
  const [app, directorUser] = await Promise.all([
    db.query.applications.findFirst({
      where: eq(applications.id, appId),
      with: { localApplicant: true, riskAssessments: true }
    }),
    db.query.users.findFirst({
      where: eq(users.role, "Director") 
      // If you have multiple directors, you might need: eq(users.email, "director@nafdac.gov.ng")
    })
  ]);

  if (!app || !directorUser) return notFound();

  const appDetails = (app.details as any) || {};
  
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
    dddInstruction: [...(appDetails.comments || [])].reverse().find((c: any) => 
        c.role === "Divisional Deputy Director" || c.role === "Divisional Deputy Director"
    )?.text || `Recommended for ${isInspection ? 'certification' : 'clearance'} based on technical compliance.`,
    complianceRisk 
  };

  const usersList = await db.select({ id: users.id, name: users.name }).from(users);

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      usersList={usersList}
      // PASS THE REAL UUID FROM THE DATABASE
      currentUserId={directorUser.id} 
      stream={activeStream}
      pdfUrl={finalPdfUrl}
    />
  );
}