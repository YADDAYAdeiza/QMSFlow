"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
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