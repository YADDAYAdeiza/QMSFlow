import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import DirectorReviewClient from "./DirectorReviewClient"; 
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  // 1. Fetch application with company relation
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) return notFound();

  const appDetails = (app.details as Record<string, any>) || {};
  const commentsTrail = appDetails.comments || [];

  // 2. Identify if this is a CAPA workflow based on DDD recommendation
  const isCapaOutcome = commentsTrail.some((c: any) => c.action === "RECOMMENDED_FOR_CAPA");

  // 3. Extract the latest technical observations for the PDF/Letter template
  const latestStaffSubmission = [...commentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  // 4. Extract the Divisional Deputy Director's recommendation note
  // Instructions: Use 'Divisional Deputy Director' instead of 'DDD'
  const dddEndorsement = [...commentsTrail]
    .reverse()
    .find((c: any) => 
      c.role === "Divisional Deputy Director" && 
      ["RECOMMENDED_FOR_CAPA", "SUBMITTED_TO_DIRECTOR", "RECOMMENDED_FOR_APPROVAL"].includes(c.action)
    );

  // 5. Generate a signed URL for the original technical dossier (POA/Inspection Report)
  const rawUrl = appDetails.inspectionReportUrl || appDetails.poaUrl || "";
  let dossierPublicUrl = null;
  
  if (rawUrl) {
    // Extract filename from the Supabase URL or stored path
    const filename = rawUrl.split('/').pop() || "";
    const { data } = supabase.storage.from('documents').getPublicUrl(filename);
    dossierPublicUrl = data.publicUrl;
  }

  // 6. Construct the clean application object for the Client Component
  const cleanApp = {
    ...JSON.parse(JSON.stringify(app)),
    isCapaOutcome,
    // The Audit Trail: We pass the entire comments history
    narrativeHistory: commentsTrail, 
    latestObservations: latestStaffSubmission?.observations || [],
    dddRecommendation: dddEndorsement?.text || "No formal recommendation note found.",
    // Standard data for the letterhead
    facilityName: appDetails.factory_name || "N/A",
    facilityAddress: appDetails.factory_address || "N/A"
  };

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      pdfUrl={dossierPublicUrl} 
    />
  );
}