import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DirectorReviewClient from "./DirectorReviewClient"; 

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  const history = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)]
  });

//   console.log('This is history: ', history);

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: {
      company: true, // Assuming you have this relation set up
    }
  });

  if (!app) return <div>Application not found</div>;
  const previewUrl = app.details?.inspectionReportUrl || 
                     app.details?.poaUrl || 
                     app.details?.inputs?.poaUrl || // Check nested if necessary
                     "";

  // Determine which PDF to show from the JSONB details
// const dossierUrl = app.details?.inspectionReportUrl || app.details?.poaUrl || "/default-placeholder.pdf";


  return (
    <DirectorReviewClient 
      history={history} 
      app={app} 
      // pdfUrl={urlData.publicUrl} 
      pdfUrl={previewUrl} 
    />
  );
}