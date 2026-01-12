import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, desc } from "drizzle-orm";
import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";

// ADD 'Promise' type to the params prop
export default async function DDReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  // 1. UNWRAP the params first
  const resolvedParams = await params;
  const appId = parseInt(resolvedParams.id);

  // Check if appId is valid before querying
  if (isNaN(appId)) {
    return <div>Invalid Application ID</div>;
  }

  // 2. Now run your queries
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  const history = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [desc(qmsTimelines.startTime)]
  });

  const staffWork = history.find(seg => 
    seg.point === "Technical Review" && seg.endTime !== null
  );

  const mode = staffWork ? "VETTING" : "ASSIGNMENT";
  const pdfUrl = (app?.details as any)?.inspectionReportUrl || (app?.details as any)?.poaUrl || "";

  return (
    <DeputyDirectorReviewClient 
      app={app} 
      history={history}
      staffWork={staffWork} 
      mode={mode}
      pdfUrl={pdfUrl}
    />
  );
}