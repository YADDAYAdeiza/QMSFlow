"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function pushToDDD(applicationId: number, selectedDivisions: string[]) {
  if (!selectedDivisions || selectedDivisions.length === 0) {
    throw new Error("No divisions selected for assignment.");
  }

  // Use this for every segment in this action to keep them perfectly in sync
  const timestamp = sql`now()`; 

  try {
    // 1. Close the Director's current active segment
    await db.update(qmsTimelines)
      .set({ 
        endTime: timestamp,
        comments: `Assigned to: ${selectedDivisions.join(", ")}` 
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.point, 'Director'),
        isNull(qmsTimelines.endTime)
      ));

    // 2. Move the application point forward
    await db.update(applications)
      .set({ currentPoint: 'Divisional Deputy Director' })
      .where(eq(applications.id, applicationId));

    // 3. Create the new segments for the DDDs
    const timelineEntries = selectedDivisions.map((divName) => ({
      applicationId: applicationId,
      division: divName.toUpperCase().trim(), 
      point: 'Divisional Deputy Director',
      startTime: timestamp, // ✅ Uses DB Clock
    }));

    await db.insert(qmsTimelines).values(timelineEntries);

    revalidatePath('/dashboard/director');
    return { success: true };
    
  } catch (error) {
    console.error("DATABASE WORKFLOW ERROR:", error);
    throw error;
  }
}

export async function issueFinalClearance(appId: number, directorNotes: string) {
  try {
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, appId),
      with: { company: true }
    });

    if (!app) throw new Error("Application not found");

    const companyFolderName = app.company?.name.replace(/[^a-z0-9]/gi, '_') || "Unknown_Company";
    const appNumberClean = app.applicationNumber.replace(/[^a-z0-9]/gi, '-');
    const archivePath = `${companyFolderName}/${appNumberClean}/Final_Clearance.pdf`;

    const timestamp = sql`now()`; // ✅ One clock for everything

    // 3. Update Application (Beginner-Friendly JavaScript Style)
    await db.update(applications)
      .set({
        status: 'CLEARED',
        currentPoint: 'Closed',
        details: {
          ...(app.details as object || {}), // Standard JS spread
          director_final_notes: directorNotes,
          archived_path: archivePath, 
          bucket_name: 'documents',
          issued_at: new Date().toISOString() // String label for the JSON
        }
      })
      .where(eq(applications.id, appId));

    // 4. Close the final QMS Timeline segment
    await db.update(qmsTimelines)
      .set({ 
        endTime: timestamp, // ✅ Uses REAL DB Clock
        comments: directorNotes 
      })
      .where(and(
        eq(qmsTimelines.applicationId, appId),
        eq(qmsTimelines.point, 'Director'),
        isNull(qmsTimelines.endTime)
      ));

    revalidatePath("/dashboard/applications");
    revalidatePath(`/dashboard/director/review/${appId}`);

    return { 
      success: true, 
      message: "Application cleared and clock stopped.",
      path: archivePath 
    };
    
  } catch (error) {
    console.error("Issuance Error:", error);
    return { success: false, error: "Failed to issue final clearance" };
  }
}