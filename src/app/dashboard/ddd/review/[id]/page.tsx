import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
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

  if (!app) return <div className="p-10 text-center font-bold font-mono text-rose-600 tracking-tighter uppercase">APPLICATION_NOT_FOUND</div>;

  // 2. Fetch Timeline segments (Used for QMS audit)
  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  // 3. Fetch Staff List
  const staffList = await db.select({
    id: users.id,
    name: users.name
  }).from(users);

  const appDetails = (app.details as Record<string, any>) || {};
  
  // 4. THE COMPLETE TRAIL
  // Instead of filtering, we take the entire array of comments
  const fullCommentsTrail = appDetails.comments || [];

  // Identify the most recent staff submission to highlight CAPAs
  const latestStaffSubmission = [...fullCommentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  // 5. Clean the App Object for Client Component
  const cleanApp = {
    id: app.id,
    applicationNumber: app.applicationNumber,
    type: app.type,
    status: app.status,
    currentPoint: app.currentPoint,
    details: appDetails, 
    // ✅ Change: Passing EVERYTHING so the timeline is 100% complete
    narrativeHistory: fullCommentsTrail, 
    latestObservations: latestStaffSubmission?.observations || [],
    company: app.company ? {
      name: app.company.name,
      address: app.company.address
    } : null
  };

  // 6. Determine Preview URL
  const previewUrl = appDetails.inspectionReportUrl || 
                     appDetails.poaUrl || 
                     "";

  return (
    <DeputyDirectorReviewClient 
      timeline={timelineSegments} 
      app={cleanApp} 
      staffList={staffList} 
      pdfUrl={previewUrl} 
    />
  );
}