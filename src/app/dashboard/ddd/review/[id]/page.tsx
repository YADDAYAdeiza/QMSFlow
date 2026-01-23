import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";

export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) return <div className="p-10 text-center font-black text-rose-600 uppercase">APPLICATION_NOT_FOUND</div>;

  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  const staffList = await db.select({ id: users.id, name: users.name }).from(users);

  const appDetails = (app.details as Record<string, any>) || {};
  const fullCommentsTrail = appDetails.comments || [];

  const latestStaffSubmission = [...fullCommentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  // Robust extraction of the nested observations object
  const findingsContainer = latestStaffSubmission?.observations || {};

  const cleanApp = {
    id: app.id,
    applicationNumber: app.applicationNumber,
    type: app.type,
    status: app.status,
    currentPoint: app.currentPoint,
    details: appDetails, 
    narrativeHistory: fullCommentsTrail, 
    // Safely extract the nested arrays from your JSON structure
    latestObservations: Array.isArray(findingsContainer.observations) ? findingsContainer.observations : [],
    latestCapas: Array.isArray(findingsContainer.capas) ? findingsContainer.capas : [],
    company: app.company ? { name: app.company.name, address: app.company.address } : null
  };

  const previewUrl = appDetails.inspectionReportUrl || appDetails.poaUrl || "";

  return (
    <DeputyDirectorReviewClient 
      timeline={timelineSegments} 
      app={cleanApp} 
      staffList={staffList} 
      pdfUrl={previewUrl} 
    />
  );
}