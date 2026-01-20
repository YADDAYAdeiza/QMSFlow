import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DirectorReviewClient from "./DirectorReviewClient"; 
import { notFound } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  // 1. Fetch the application with Company data
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) return notFound();

  // 2. Extract the Unified Comments Trail
  const appDetails = (app.details as Record<string, any>) || {};
  const unifiedComments = appDetails.comments || [];

  // 3. Determine PDF preview (Using the 'Documents' bucket logic)
  const rawUrl = appDetails.inspectionReportUrl || appDetails.poaUrl || "";
  const filename = rawUrl.split('/').pop() || "";
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);
  const finalPdfUrl = filename ? urlData.publicUrl : null;

  // 4. Clean data for the Client Component
  const cleanApp = JSON.parse(JSON.stringify(app));

  return (
    <DirectorReviewClient 
      comments={unifiedComments} // Passing the unified array directly
      app={cleanApp} 
      pdfUrl={finalPdfUrl} 
    />
  );
}