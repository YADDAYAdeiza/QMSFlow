"use server"

import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";


export async function getDirectorInbox() {
  const data = await db.query.applications.findMany({
    where: eq(applications.currentPoint, 'Director'),
    with: {
      company: true, // This brings in the company name automatically
    },
  });
  return data;
}

export async function pushToDivisions(applicationId: number, selectedDivisions: string[]) {
  // 1. Move the Application to the Staff point
  await db.update(applications)
    .set({ 
      currentPoint: 'Staff',
      details: {
        // We preserve the old data but update the assigned divisions
        assignedDivisions: selectedDivisions, 
      }
    })
    .where(eq(applications.id, applicationId));

  // 2. STOP the Director's clock and START the Staff's clock
  // We will build the sophisticated "Timing Engine" next, 
  // but for now, we mark the move.
}

export async function pushToDDD(applicationId: number, selectedDivisions: string[]) {
  // We use sql.raw or structured sql to merge JSONB
  await db.update(applications)
    .set({ 
      currentPoint: 'Divisional Deputy Director',
      // This syntax ensures 'details' isn't overwritten. 
      // It updates 'assignedDivisions' while keeping 'inputs' and 'comments'
      details: sql`jsonb_set(
        jsonb_set(details, '{assignedDivisions}', ${JSON.stringify(selectedDivisions)}),
        '{comments}',
        (details->'comments') || jsonb_build_array(jsonb_build_object(
          'from', 'Director',
          'role', 'Director',
          'text', 'Application pushed to DDD for Staff Assignment',
          'timestamp', ${new Date().toISOString()}
        ))
      )`
    })
    .where(eq(applications.id, applicationId));
}