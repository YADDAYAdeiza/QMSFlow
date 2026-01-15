"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server";
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


/**
 * Finalizes the application by setting status to CLEARED
 * and saving the archival path to the documents bucket.
 */
export async function issueFinalClearance(
  appId: string, 
  comments: string, 
  storagePath: string
) {
  const supabase = await createClient();

  try {
    // 1. Fetch current application details to preserve existing JSONB data
    const { data: currentApp, error: fetchError } = await supabase
      .from('applications')
      .select('details, applicationNumber')
      .eq('id', appId)
      .single();

    if (fetchError || !currentApp) {
      throw new Error("Could not find application to update.");
    }

    // 2. Prepare the updated JSONB payload
    // We spread the existing details and add our new Director data
    const updatedDetails = {
      ...(currentApp.details || {}),
      director_final_notes: comments,
      archived_path: storagePath, // The path in the 'documents' bucket
      final_approval_date: new Date().toISOString(),
      issuance_metadata: {
        system_version: "2.0-OptionAB",
        archived_by: "Director_Role"
      }
    };

    // 3. Update the Application record
    // Status moves to CLEARED, Point moves to COMPLETED
    const { error: updateError } = await supabase
      .from('applications')
      .update({
        status: 'CLEARED',
        currentPoint: 'COMPLETED',
        details: updatedDetails,
        updated_at: new Date().toISOString()
      })
      .eq('id', appId);

    if (updateError) {
      throw new Error(`Database Update Failed: ${updateError.message}`);
    }

    // 4. Refresh the page data for the Director's dashboard
    revalidatePath('/dashboard/director');
    revalidatePath(`/dashboard/director/${appId}`);

    return { 
      success: true, 
      message: "Application cleared and document archived." 
    };

  } catch (err: any) {
    console.error("Critical Server Action Error:", err.message);
    return { 
      success: false, 
      error: err.message 
    };
  }
}