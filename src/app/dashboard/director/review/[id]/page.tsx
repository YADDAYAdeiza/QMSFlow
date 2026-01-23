import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DirectorReviewClient from "./DirectorReviewClient";

export default async function DirectorReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  // 1. Guard against 'undefined' or malformed IDs to prevent Postgres NaN errors
  if (!id || id === "undefined") return notFound();
  const appId = parseInt(id);
  if (isNaN(appId)) return notFound();

  // 2. Fetch Application with Company Details
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: {
      company: true,
    }
  });

  if (!app) return notFound();

  // 3. Extract Observations and categorization of comments
  const appDetails = (app.details as any) || {};
  const commentsTrail = Array.isArray(appDetails.comments) ? appDetails.comments : [];
  
  // Find the Staff submission (for technical data like CAPAs)
  const latestStaffSubmission = [...commentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  // Find the specific minute from the Divisional Deputy Director
  const dddRecommendation = [...commentsTrail]
    .reverse()
    .find((c: any) => c.role === "Divisional Deputy Director");

  const cleanApp = {
    ...app,
    details: appDetails,
    latestObservations: latestStaffSubmission?.observations?.observations || [],
    latestCapas: latestStaffSubmission?.observations?.capas || [],
    commentsTrail: commentsTrail, // Full history for the internal feed
    dddInstruction: dddRecommendation?.text || "No specific recommendation notes provided by the division."
  };

  // 4. Fetch Users List (for context or routing)
  const usersList = await db.select({ 
    id: users.id, 
    name: users.name 
  }).from(users);

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      usersList={usersList}
    />
  );
}