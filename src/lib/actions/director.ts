"use server"

import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function pushToDDD(applicationId: number, selectedDivisions: string[]) {
  // Convert our array and timestamp to strings for Postgres to ingest
  const divisionsJson = JSON.stringify(selectedDivisions);
  const timestamp = new Date().toISOString();

  await db.update(applications)
    .set({ 
      currentPoint: 'Divisional Deputy Director',
      // We use ::jsonb and ::text to tell Postgres exactly what these parameters are
      details: sql`jsonb_set(
        jsonb_set(details, '{assignedDivisions}', ${divisionsJson}::jsonb),
        '{comments}',
        (details->'comments') || jsonb_build_array(jsonb_build_object(
          'from', 'Director',
          'role', 'Director',
          'text', 'Application pushed to DDD for Staff Assignment',
          'timestamp', ${timestamp}::text
        ))
      )`
    })
    .where(eq(applications.id, applicationId));

  revalidatePath('/dashboard/director');
  revalidatePath('/dashboard/ddd');
}