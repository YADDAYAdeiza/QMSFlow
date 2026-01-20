"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";

export async function getDirectorInbox() {
  // Direct Join: Get the app AND its active Director clock in one go
  const results = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details,
      companyName: companies.name,
      // Grab the startTime from the timeline table
      activeStartTime: qmsTimelines.startTime, 
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(
      qmsTimelines, 
      and(
        eq(qmsTimelines.applicationId, applications.id),
        eq(qmsTimelines.point, 'Director'),
        isNull(qmsTimelines.endTime) // Only the "running" clock
      )
    )
    .where(eq(applications.currentPoint, 'Director'));

  console.log(`Found ${results.length} apps. App 74 StartTime:`, results.find(r => r.id === 74)?.activeStartTime);

  return results;
}