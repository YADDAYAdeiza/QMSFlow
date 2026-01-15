import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DirectorReviewClient from "./DirectorReviewClient"; 

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  // 1. Single fetch for the application
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: {
      company: true,
    }
  });

  if (!app) return <div className="p-10 text-center font-bold">Application not found</div>;

  // 2. Fetch the raw timeline segments
  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  // 3. Cast details safely
  const appDetails = (app.details as Record<string, any>) || {};

  // --- THE ENRICHMENT LOGIC ---
  // Extract histories from JSONB
  const directorHistory = [...(appDetails.director_history || [])];
  const dddHistory = [...(appDetails.ddd_to_staff_history || [])];
  const techHistory = [...(appDetails.technical_history || [])];
  const lodComment = appDetails.initialComment || "";

  const enrichedSegments = timelineSegments.map((segment, idx) => {
    let displayComments = segment.comments; // Fallback to basic DB column

    if (segment.point === 'LOD Intake') {
      displayComments = lodComment;
    } else if (segment.point === 'Director') {
      // Pulls the minute/instruction the Director gave at this specific stage
      displayComments = directorHistory.shift()?.instruction || segment.comments;
    } else if (segment.point === 'Divisional Deputy Director') {
      // Pulls the technical directive the DDD gave to staff
      displayComments = dddHistory.shift()?.instruction || segment.comments;
    } else if (segment.point === 'Technical Review') {
      // Pulls the actual findings logged by the staff member
      displayComments = techHistory.shift()?.findings || appDetails.staff_technical_findings || "No findings logged";
    }

    return {
      ...segment,
      idx: segment.id || idx,
      comments: displayComments,
    };
  });
  // --- END ENRICHMENT ---

  // 4. Determine PDF preview
  const previewUrl = appDetails.inspectionReportUrl || 
                     appDetails.poaUrl || 
                     appDetails.inputs?.poaUrl || 
                     "";

  // --- THE DEEP CLEAN ---
  // Strip Drizzle proxies before passing to Client Component
  const cleanApp = JSON.parse(JSON.stringify(app));
  const cleanHistory = JSON.parse(JSON.stringify(enrichedSegments));

  return (
    <DirectorReviewClient 
      history={cleanHistory} 
      app={cleanApp} 
      pdfUrl={previewUrl} 
    />
  );
}