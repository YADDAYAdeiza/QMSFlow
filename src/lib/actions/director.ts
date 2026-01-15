"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

// /**
//  * Assigns an application to one or more divisions and records the Director's instruction.
//  * @param applicationId - The ID of the application
//  * @param selectedDivisions - Array of divisions (e.g., ["VMD", "PAD"])
//  * @param directorComment - The instruction/minute from the Director
//  */
export async function assignToDDD(
  applicationId: number, 
  selectedDivisions: string[], 
  directorComment: string
) {
  if (!selectedDivisions || selectedDivisions.length === 0) {
    throw new Error("No divisions selected for assignment.");
  }

  // Consistent timestamp for all DB operations in this transaction
  const timestamp = sql`now()`; 

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch current application to preserve existing JSONB details
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, applicationId) 
      });
      
      if (!app) throw new Error("Application not found");

      const oldDetails = JSON.parse(JSON.stringify(app.details || {}));

      // 2. Update the JSONB "Director History"
      // This ensures the instruction is permanent even if the timeline row is deleted
      const updatedDetails = {
        ...oldDetails,
        director_history: [
          ...(oldDetails.director_history || []),
          {
            instruction: directorComment,
            assigned_at: new Date().toISOString(),
            divisions: selectedDivisions
          }
        ]
      };

      // 3. Update Application: Move to DDD point and save the new JSONB details
      await tx.update(applications)
        .set({ 
          currentPoint: 'Divisional Deputy Director',
          details: updatedDetails 
        })
        .where(eq(applications.id, applicationId));

      // 4. QMS: Close the Director's current active timeline segment
      await tx.update(qmsTimelines)
        .set({ 
          endTime: timestamp,
          comments: directorComment // Duplicate here for easy row-level lookup
        })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          eq(qmsTimelines.point, 'Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 5. QMS: Create new active segments for each assigned Division's DDD
      const timelineEntries = selectedDivisions.map((divName) => ({
        applicationId: applicationId,
        division: divName.toUpperCase().trim(), 
        point: 'Divisional Deputy Director',
        startTime: timestamp,
      }));

      await tx.insert(qmsTimelines).values(timelineEntries);

      // 6. Refresh the UI
      revalidatePath('/dashboard/director');
      
      return { success: true };
    });
  } catch (error) {
    console.error("ASSIGN_TO_DDD_ERROR:", error);
    return { success: false, error: "Failed to complete assignment workflow." };
  }
}


export async function issueFinalClearance(appId: number, directorNotes: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch current app for context
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
        with: { company: true }
      });

      if (!app) throw new Error("Application not found");

      // 2. Setup Archive Paths (Your logic)
      const companyFolderName = app.company?.name.replace(/[^a-z0-9]/gi, '_') || "Unknown_Company";
      const appNumberClean = app.applicationNumber.replace(/[^a-z0-9]/gi, '-');
      const archivePath = `${companyFolderName}/${appNumberClean}/Final_Clearance.pdf`;
      const timestamp = sql`now()`;

      // 3. Prepare the "Full Story" JSONB
      const oldDetails = (app.details as any) || {};
      const updatedDetails = {
        ...oldDetails,
        director_final_notes: directorNotes,
        archived_path: archivePath,
        bucket_name: 'Documents', // Per your saved info
        // NEW: This is the "Ledger" for auditors
        issuance_history: [
          ...(oldDetails.issuance_history || []),
          {
            notes: directorNotes,
            timestamp: new Date().toISOString(),
            action: 'FINAL_CLEARANCE_ISSUED'
          }
        ]
      };

      // 4. Update Application (Status + History)
      await tx.update(applications)
        .set({
          status: 'CLEARED',
          currentPoint: 'Closed',
          details: updatedDetails
        })
        .where(eq(applications.id, appId));

      // 5. Close the final QMS Timeline segment
      // REMOVED 'comments' here since qms_timelines doesn't have it
      await tx.update(qmsTimelines)
        .set({ 
          endTime: timestamp 
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
        message: "Application cleared and history logged.",
        path: archivePath 
      };
    });
  } catch (error) {
    console.error("Issuance Error:", error);
    return { success: false, error: "Failed to issue final clearance" };
  }
}