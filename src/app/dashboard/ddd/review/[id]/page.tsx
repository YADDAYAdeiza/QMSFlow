// import { db } from "@/db";
// import { applications, qmsTimelines } from "@/db/schema";
// import { eq, and, desc } from "drizzle-orm";
// import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";

// // ADD 'Promise' type to the params prop
// export default async function DDReviewPage({ 
//   params 
// }: { 
//   params: Promise<{ id: string }> 
// }) {
//   // 1. UNWRAP the params first
//   const resolvedParams = await params;
//   const appId = parseInt(resolvedParams.id);

//   // Check if appId is valid before querying
//   if (isNaN(appId)) {
//     return <div>Invalid Application ID</div>;
//   }

//   // 2. Now run your queries
//   const app = await db.query.applications.findFirst({
//     where: eq(applications.id, appId),
//     with: { company: true }
//   });

//   const history = await db.query.qmsTimelines.findMany({
//     where: eq(qmsTimelines.applicationId, appId),
//     orderBy: [desc(qmsTimelines.startTime)]
//   });

//   const staffWork = history.find(seg => 
//     seg.point === "Technical Review" && seg.endTime !== null
//   );

//   const mode = staffWork ? "VETTING" : "ASSIGNMENT";
//   const pdfUrl = (app?.details as any)?.inspectionReportUrl || (app?.details as any)?.poaUrl || "";

//   return (
//     <DeputyDirectorReviewClient 
//       app={app} 
//       history={history}
//       staffWork={staffWork} 
//       mode={mode}
//       pdfUrl={pdfUrl}
//     />
//   );
// }

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  // 1. Fetch Application with Company data
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: {
      company: true,
    }
  });

  if (!app) return <div className="p-10 text-center font-bold">Application not found</div>;

  // 2. Fetch Timeline segments
  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  const appDetails = (app.details as Record<string, any>) || {};

  // 3. THE "DEEP CLEAN" MAP: 
  // We manually extract only the raw data to kill the "su is not a function" error.
  const cleanHistory = timelineSegments.map((segment) => {
    let displayComments = segment.comments;

    // Inject findings if this is the Technical Review segment
    if (segment.point === 'Technical Review') {
      displayComments = displayComments || appDetails.staff_technical_findings || "No technical comments logged";
    }

    return {
      id: segment.id,
      applicationId: segment.applicationId,
      point: segment.point,
      division: segment.division,
      staffId: segment.staffId,
      startTime: segment.startTime,
      endTime: segment.endTime,
      comments: displayComments, // Now contains the findings
      details: segment.details
    };
  });

  // 4. Manually Clean the App Object
  const cleanApp = {
    id: app.id,
    applicationNumber: app.applicationNumber,
    type: app.type,
    status: app.status,
    currentPoint: app.currentPoint,
    details: appDetails,
    company: app.company ? {
      name: app.company.name,
      address: app.company.address
    } : null
  };

  // 5. Determine Preview URL
  const previewUrl = appDetails.inspectionReportUrl || 
                     appDetails.poaUrl || 
                     appDetails.inputs?.poaUrl || 
                     "";

  return (
    <DeputyDirectorReviewClient 
      history={cleanHistory} 
      app={cleanApp} 
      pdfUrl={previewUrl} 
    />
  );
}