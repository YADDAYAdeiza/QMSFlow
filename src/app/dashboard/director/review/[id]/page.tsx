export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, users } from "@/db/schema";
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

  const riskData = app.riskAssessments?.[0];
  
  const complianceRisk = riskData ? {
    isSra: riskData.sraStatus === "TRUE" || riskData.sraStatus === "true",
    intrinsicLevel: riskData.intrinsicLevel || "Low",
    overallRating: riskData.overallRiskRating || "N/A", 
    summary: {
      criticalCount: riskData.criticalDeficiencies || 0,
      majorCount: riskData.majorDeficiencies || 0,
      otherCount: 0, 
    },
    findings: (app.details as any)?.complianceFindings || [],
  } : null;

  const appDetails = (app.details as any) || {};
  const activeStream = appDetails.division || "VMD";

  let finalPdfUrl = appDetails.poaUrl || appDetails.inspectionReportUrl || appDetails.reportUrl || "";
  if (finalPdfUrl && !finalPdfUrl.startsWith('http')) {
    const { data } = supabase.storage.from('documents').getPublicUrl(finalPdfUrl);
    finalPdfUrl = data.publicUrl;
  }

  const cleanApp = {
    ...app,
    company: app.localApplicant, 
    details: appDetails,
    commentsTrail: Array.isArray(appDetails.comments) ? appDetails.comments : [],
    dddInstruction: [...(appDetails.comments || [])].reverse().find((c: any) => 
        c.role === "Divisional Deputy Director" || c.role === "DDD"
    )?.text || "Recommended for approval based on technical compliance.",
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