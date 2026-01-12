"use server"

import { db } from "@/db";
import { qmsTimelines, applications } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * PATH A: DDD Assigns to Staff (The Initial Handoff)
 * This stops the DDD's 'Arrival' clock and starts the Staff's 'Review' clock.
 */
export async function assignToStaff(applicationId: number, staffId: string, division: string) {
  try {
    const now = sql`now()`;

    // 1. Close the DDD's "Pending Assignment" segment
    // We keep the point name consistent so it doesn't break your Inbox query
    await db.update(qmsTimelines)
      .set({ 
        endTime: now,
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.point, 'Divisional Deputy Director'), // Target the specific DDD row
        isNull(qmsTimelines.endTime)
      ));

    // 2. Start the Staff's "Technical Review" segment
    // FIXED: Bug #1 - This ensures the Staff dashboard "sees" the row
    await db.insert(qmsTimelines).values({
      applicationId,
      division: division.toUpperCase(),
      staffId: staffId, 
      point: 'Technical Review',
      startTime: now,
      details: { iteration: 1 } as any
    });

    // 3. NEW: Update the main Application Pointer
    // This allows the Director/LOD to see the status without checking timelines
    await db.update(applications)
      .set({ 
        currentPoint: 'Technical Review',
        status: 'TECHNICAL_REVIEW' 
      })
      .where(eq(applications.id, applicationId));

    // 4. Revalidate to clear the DDD's inbox immediately
    revalidatePath('/dashboard/ddd');
    revalidatePath(`/dashboard/${division.toLowerCase()}`);
    
    return { success: true };
  } catch (error) {
    console.error("Assignment Error:", error);
    return { success: false };
  }
}

/**
 * PATH B: DDD Approves to Director
 * This stops the Division's involvement and starts the Directorate's Master Clock.
 */

export async function approveToDirector(
  applicationId: number,
  division: string,
  dddComments: string
) {
  try {
    const now = sql`now()`;

    // 1. Close the DDD's active row
    // FIX: We target 'Divisional Deputy Director' specifically to ensure we close the right segment
    await db.update(qmsTimelines)
      .set({ 
        endTime: now,
        comments: dddComments, // Storing here makes it easy for the Director to read
        details: {
          ddd_comment: dddComments,
          status: 'FORWARDED_TO_DIRECTOR'
        } as any
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.point, 'Divisional Deputy Director'), // Consistent naming
        isNull(qmsTimelines.endTime)
      ));

    // 2. Start the Director's Action Row
    await db.insert(qmsTimelines).values({
      applicationId,
      division: 'DIRECTORATE',
      point: 'Director', // Keep this simple so the Director's query finds it
      startTime: now,
      details: {
        originating_division: division,
        division_comments: dddComments
      } as any
    });

    // 3. NEW: Sync the Application Table
    // This is the "Truth" for the LOD/Status tracker
    await db.update(applications)
      .set({ 
        currentPoint: 'Director',
        status: 'PENDING_FINAL_AUTHORIZATION' 
      })
      .where(eq(applications.id, applicationId));

    // 4. Revalidate
    revalidatePath(`/dashboard/ddd`);
    revalidatePath(`/dashboard/director`);
    revalidatePath(`/dashboard/lod`); 

    return { success: true };
  } catch (error) {
    console.error("Approval Error:", error);
    return { success: false };
  }
}