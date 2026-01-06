"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function assignToStaff(applicationId: number, staffId: string, division: string) {
  // 1. Update the application to show it's now at the "Staff" point
  await db.update(applications)
    .set({ currentPoint: 'Staff' })
    .where(eq(applications.id, applicationId));

  // 2. IMPORTANT: Update the timeline row so it leaves the DDD inbox
  // We change the 'point' so the DDD query (which looks for 'Divisional Deputy Director') 
  // no longer finds this specific record.
  await db.update(qmsTimelines)
    .set({ 
      staffId: staffId, 
      point: 'Technical Review' // Changing the point moves it out of the DDD inbox
    })
    .where(and(
      eq(qmsTimelines.applicationId, applicationId),
      eq(qmsTimelines.division, division.toUpperCase()),
      isNull(qmsTimelines.endTime)
    ));

  revalidatePath('/dashboard/ddd');
  revalidatePath(`/dashboard/${division.toLowerCase()}`);
}