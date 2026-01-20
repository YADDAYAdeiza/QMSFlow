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

  if (!app) return <div className="p-10 text-center font-bold font-mono">APPLICATION_NOT_FOUND</div>;

  // 2. Fetch Timeline segments (Used for QMS audit)
  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  // 3. Fetch Staff List for the Reassignment dropdown
  const staffList = await db.select({
    id: users.id,
    name: users.name
  }).from(users);

  const appDetails = (app.details as Record<string, any>) || {};

  // 4. Clean the App Object for Client Component
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
                     "";

  return (
    <DeputyDirectorReviewClient 
    timeline={timelineSegments} 
    app={cleanApp} 
    staffList={staffList} // Ensure this matches the variable name from your DB query
    pdfUrl={previewUrl} 
  />
  );
}