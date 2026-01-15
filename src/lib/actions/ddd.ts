"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";


/**
 * DDD assigns a dossier to a specific technical officer with a directive.
 */
export async function assignToStaff(
  applicationId: number, 
  staffId: string, 
  instruction: string
) {
  const timestamp = sql`now()`;

  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch current application to preserve existing JSONB history
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, applicationId) 
      });
      
      if (!app) throw new Error("Application not found");

      const oldDetails = JSON.parse(JSON.stringify(app.details || {}));

      // 2. Update the JSONB with the DDD's Technical Directive
      const updatedDetails = {
        ...oldDetails,
        staff_reviewer_id: staffId, // Assign the specific officer
        ddd_to_staff_history: [
          ...(oldDetails.ddd_to_staff_history || []),
          {
            instruction: instruction,
            staffId: staffId,
            assigned_at: new Date().toISOString()
          }
        ]
      };

      // 3. Update Application: Move point to 'Technical Review' and save JSONB
      await tx.update(applications)
        .set({ 
          currentPoint: 'Technical Review',
          details: updatedDetails 
        })
        .where(eq(applications.id, applicationId));

      // 4. QMS: Close the DDD's current active segment
      // Note: No 'comments' field used here as per schema constraints
      await tx.update(qmsTimelines)
        .set({ 
          endTime: timestamp
          // staffId is typically null for DDD/Director segments unless specifically tracked
        })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 5. QMS: Create the new active segment for the Technical Reviewer
      await tx.insert(qmsTimelines).values({
        applicationId,
        point: 'Technical Review',
        division: (app.details as any)?.assignedDivisions?.[0] || 'VMD', 
        staffId: staffId, // The officer now "owns" this segment of time
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error) {
    console.error("DDD_ASSIGNMENT_ERROR:", error);
    return { success: false, error: "Failed to assign staff member." };
  }
}

/**
 * PATH B: DDD Approves to Director
 * This stops the Division's involvement and starts the Directorate's Master Clock.
 */


export async function approveToDirector(appId: number, recommendationNote: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Get current details
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });
      if (!app) throw new Error("App not found");

      const oldDetails = (app.details as any) || {};

      // 2. Append the recommendation to the history array
      const updatedDetails = {
        ...oldDetails,
        ddd_recommendation_to_director: recommendationNote, // For quick lookup
        ddd_history: [
          ...(oldDetails.ddd_history || []),
          {
            note: recommendationNote,
            timestamp: new Date().toISOString(),
            status: 'RECOMMENDED_FOR_APPROVAL'
          }
        ]
      };

      // 3. Move Application to Director Desk
      await tx.update(applications)
        .set({
          currentPoint: 'Director',
          details: updatedDetails
        })
        .where(eq(applications.id, appId));

      // 4. Close DDD's QMS segment and open Director's segment
      const timestamp = sql`now()`;
      
      // Close DDD segment
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      // Open Director segment
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Director',
        startTime: timestamp,
        status: 'PENDING'
      });

      revalidatePath(`/dashboard/ddd/review/${appId}`);
      return { success: true };
    });
  } catch (error) {
    console.error(error);
    return { success: false };
  }
}