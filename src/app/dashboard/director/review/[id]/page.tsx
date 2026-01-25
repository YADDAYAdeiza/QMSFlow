// dashboard/director/review/[id]/page.tsx

import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DirectorReviewClient from "./DirectorReviewClient";

/**
 * DirectorReviewPage
 * Handles the server-side data fetching for the Director's final sign-off stage.
 * Aligned with the Unique Point Map for App 88.
 */
export default async function DirectorReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  // 1. Guard against malformed IDs to prevent database errors
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

  // 3. Extract and Clean Data for the Client Component
  const appDetails = (app.details as any) || {};
  const commentsTrail = Array.isArray(appDetails.comments) ? appDetails.comments : [];
  
  // Locate the technical submission from the Staff stage (contains original observations)
  const latestStaffSubmission = [...commentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  /**
   * ✅ QMS UNIQUE POINT LOGIC:
   * We look for the most recent minute from a Divisional Deputy Director.
   * This specifically targets the endorsement from the IRSD Hub or technical division.
   */
  const dddMinute = [...commentsTrail]
    .reverse()
    .find((c: any) => 
      (c.action === "ENDORSED_FOR_DIRECTOR" || c.action === "SUBMITTED_TO_DIRECTOR") && 
      c.role === "Divisional Deputy Director"
    );

  const cleanApp = {
    ...app,
    details: appDetails,
    latestObservations: latestStaffSubmission?.observations?.observations || [],
    latestCapas: latestStaffSubmission?.observations?.capas || [],
    commentsTrail: commentsTrail, // Full history for the internal feed
    // Fallback to generic find if specific action tags are missing in legacy data
    dddInstruction: dddMinute?.text || 
      commentsTrail.reverse().find((c: any) => c.role === "Divisional Deputy Director")?.text ||
      "No specific recommendation notes provided by the division."
  };

  // 4. Fetch Users List 
  // We include role and division to allow the Director to route rework correctly
  const usersList = await db.select({ 
    id: users.id, 
    name: users.name,
    role: users.role,
    division: users.division
  }).from(users);

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      usersList={usersList}
    />
  );
}