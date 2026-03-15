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

  // ✅ FIX: Changed 'company' to 'localApplicant' to match Named Relations in schema.ts
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { localApplicant: true }
  });

  if (!app) return notFound();

  const appDetails = (app.details as any) || {};
  const commentsTrail = Array.isArray(appDetails.comments) ? appDetails.comments : [];
  
  // 1. Resolve the active stream
  const activeStream = appDetails.division || appDetails.assignedDivisions?.[0] || "VMD";

  // 2. Extract Evidence Reports (Technical and Hub)
  const staffReports = {
    verification: appDetails.verificationReportUrl || null,
    technical: appDetails.technicalAssessmentUrl || null
  };

  // 3. Find the most recent DDD recommendation
  const dddMinute = [...commentsTrail]
    .reverse()
    .find((c: any) => 
      (c.action === "ENDORSED_FOR_DIRECTOR" || c.action === "ENDORSED_FOR_DIRECTOR_SIGN_OFF") && 
      c.role === "Divisional Deputy Director"
    );

  // 4. Resolve the primary Dossier PDF URL
  let finalPdfUrl = appDetails.poaUrl || appDetails.inspectionReportUrl || appDetails.reportUrl || "";
  
  if (finalPdfUrl && !finalPdfUrl.startsWith('http')) {
    const { data } = supabase.storage
      .from('documents') // Standardized bucket name
      .getPublicUrl(finalPdfUrl);
    finalPdfUrl = data.publicUrl;
  }

  const cleanApp = {
    ...app,
    // ✅ Re-map to 'company' so the Client Component logic remains stable
    company: app.localApplicant, 
    details: appDetails,
    commentsTrail: commentsTrail,
    staffReports,
    dddInstruction: dddMinute?.text || "Technical assessment finalized. Ready for executive sign-off."
  };

  const usersList = await db.select({ 
    id: users.id, 
    name: users.name,
    role: users.role,
    division: users.division
  }).from(users);

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