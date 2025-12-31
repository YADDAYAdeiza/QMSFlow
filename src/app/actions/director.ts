"use server"

import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";


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