"use server"

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function assignToStaff(applicationId: number, staffId: string, division: string) {
  const timestamp = new Date().toISOString();

  // 1. Move Point to Staff & Log the specific assignment
  await db.update(applications)
    .set({
      currentPoint: 'Staff',
      details: sql`jsonb_set(
        details, 
        '{comments}', 
        (details->'comments') || jsonb_build_array(jsonb_build_object(
          'from', 'DDD',
          'role', 'Divisional Deputy Director',
          'text', ${`Assigned to technical staff for review in ${division}`},
          'timestamp', ${timestamp}::text
        ))
      )`
    })
    .where(eq(applications.id, applicationId));

  // 2. Start the INDIVIDUAL QMS Clock
  await db.insert(qmsTimelines).values({
    applicationId: applicationId,
    staffId: staffId, // This is the UUID of the specific person
    point: 'Staff',
    division: division,
    startTime: new Date(),
  });

  revalidatePath('/dashboard/ddd');
}