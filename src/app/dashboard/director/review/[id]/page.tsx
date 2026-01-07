import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DirectorReviewClient from "./DirectorReviewClient"; 
import { supabase } from "@/lib/supabase";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  const history = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)]
  });

//   console.log('This is history: ', history);

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId)
  });

  const { data: urlData } = supabase.storage.from('documents').getPublicUrl('0.9554887811327575.pdf');

  return (
    <DirectorReviewClient 
      history={history} 
      app={app} 
      pdfUrl={urlData.publicUrl} 
    />
  );
}