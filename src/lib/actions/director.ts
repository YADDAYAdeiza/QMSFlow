"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, sql, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function pushToDDD(applicationId: number, selectedDivisions: string[]) {
  console.log("RECEIVED DIVISIONS:", selectedDivisions); // Check your terminal!

  if (!selectedDivisions || selectedDivisions.length === 0) {
    throw new Error("No divisions selected for assignment.");
  }

  const timestamp = new Date();

  // 1. Update the Main Application Point
  await db.update(applications)
    .set({ currentPoint: 'Divisional Deputy Director' })
    .where(eq(applications.id, applicationId));

  // 2. Prepare entries with explicit key names
  const timelineEntries = selectedDivisions.map((divName) => {
    // Ensuring we return a clean object with no undefined values
    return {
      applicationId: applicationId,
      division: divName.toUpperCase().trim(), // Force clean uppercase string
      point: 'Divisional Deputy Director',
      startTime: timestamp,
    };
  });

  console.log("INSERTING ROWS:", timelineEntries);

  // 3. Perform Insert
  try {
    await db.insert(qmsTimelines).values(timelineEntries);
  } catch (error) {
    console.error("DATABASE INSERT ERROR:", error);
    throw error;
  }

  revalidatePath('/dashboard/director');
}



export async function issueFinalClearance(
  applicationId: number,
  directorComments: string
) {
  try {
    const now = new Date();

    // 1. Close the Director's active clock
    await db.update(qmsTimelines)
      .set({ 
        endTime: now,
        point: 'Certificate Issued',
        details: {
          director_final_notes: directorComments,
          final_status: 'CLEARED'
        } as any
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.division, 'DIRECTORATE'),
        isNull(qmsTimelines.endTime)
      ));

    // 2. Update the main Application record to 'Completed'
    await db.update(applications)
      .set({ 
        // Assuming you have a status field in your applications table
        // status: 'APPROVED' 
      })
      .where(eq(applications.id, applicationId));

    // 3. Clear all relevant caches
    revalidatePath(`/dashboard/director`);
    revalidatePath(`/dashboard/lod`);
    revalidatePath(`/application/${applicationId}`);

    return { success: true };
  } catch (error) {
    console.error("Final Issuance Error:", error);
    return { success: false, error: "Failed to issue certificate." };
  }
}