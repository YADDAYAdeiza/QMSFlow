// import { db } from "@/db";
// import { qmsTimelines, applications } from "@/db/schema";
// import { eq, asc } from "drizzle-orm";
// import DirectorReviewClient from "./DirectorReviewClient"; 

// export default async function Page({ params }: { params: Promise<{ id: string }> }) {
//   const { id } = await params;
//   const appId = parseInt(id);

//   // 1. Single fetch for the application (removed the duplicate fetch)
//   const app = await db.query.applications.findFirst({
//     where: eq(applications.id, appId),
//     with: {
//       company: true,
//     }
//   });

//   if (!app) return <div>Application not found</div>;

//   // 2. Fetch the raw timeline segments
//   const timelineSegments = await db.query.qmsTimelines.findMany({
//     where: eq(qmsTimelines.applicationId, appId),
//     orderBy: [asc(qmsTimelines.startTime)],
//   });

//   // 3. Cast details to a usable object to prevent "su is not a function"
//   // This ensures we can safely access properties inside the map
//   const appDetails = (app.details as Record<string, any>) || {};

//   // 4. THE FIX: Enrich the segments with findings from the Application JSON
//   const enrichedSegments = timelineSegments.map((segment, idx) => {
//     let displayComments = segment.comments;

//     // Logic: If the timeline row for 'Technical Review' is missing text,
//     // pull the "staff_technical_findings" we saved in the main application table.
//     if (segment.point === 'Technical Review' && (!displayComments || displayComments === "")) {
//       displayComments = appDetails.staff_technical_findings || "No technical comments logged";
//     }

//     return {
//       ...segment,
//       idx: segment.id || idx, // Ensure we have a unique ID for the key prop
//       comments: displayComments,
//     };
//   });

//   // 5. Determine PDF preview (safety check for nested objects)
//   const previewUrl = appDetails.inspectionReportUrl || 
//                      appDetails.poaUrl || 
//                      appDetails.inputs?.poaUrl || 
//                      "";

//   return (
//   <DirectorReviewClient 
//     history={JSON.parse(JSON.stringify(enrichedSegments))} 
//     app={JSON.parse(JSON.stringify(app))} 
//     pdfUrl={previewUrl} 
//   />
// );
// }

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

  // 4. THE ENRICHMENT: Linking JSONB findings to the Timeline array
  const enrichedSegments = timelineSegments.map((segment, idx) => {
    let displayComments = segment.comments;

    // Direct lookup: If this is the Technical Review row, grab the findings from the main table JSON
    if (segment.point === 'Technical Review') {
      // Prioritize the specific JSON key we saw in your database record
      displayComments = displayComments || appDetails.staff_technical_findings || "No technical comments logged";
    }

    return {
      ...segment,
      idx: segment.id || idx,
      comments: displayComments,
    };
  });

  // 5. Determine PDF preview
  const previewUrl = appDetails.inspectionReportUrl || 
                     appDetails.poaUrl || 
                     appDetails.inputs?.poaUrl || 
                     "";

  // --- THE DEEP CLEAN ---
  // We stringify and parse here on the SERVER. 
  // This strips all Drizzle-specific Proxy methods (like .su, .un, etc) 
  // before they can ever touch the Client Component.
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