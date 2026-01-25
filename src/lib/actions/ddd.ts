"use server"

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * DD -> Staff: Moves the file to the staff's desk for technical work.
 */
export async function assignToStaff(
  applicationId: number, 
  staffId: string, 
  instruction: string
) {
  const timestamp = sql`now()`;

  try {
    return await db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, applicationId) 
      });
      
      if (!app) throw new Error("Application not found");
      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      const lastAction = oldComments[oldComments.length - 1]?.action;
      const currentRound = lastAction === "REWORK_REQUIRED" 
        ? (oldComments[oldComments.length - 1].round || 1) + 1 
        : (oldComments[oldComments.length - 1]?.round || 1);

      const newEntry = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        text: instruction,
        timestamp: new Date().toISOString(),
        round: currentRound,
        action: "ASSIGNED_TO_STAFF",
        assigned_to_id: staffId
      };

      // 3. Update Application Table with NEW POINT
      await tx.update(applications)
        .set({ 
          // ✅ Matches Map Item 4
          currentPoint: 'Staff Technical Review', 
          details: {
            ...oldDetails,
            staff_reviewer_id: staffId, 
            comments: [...oldComments, newEntry]
          },
          updatedAt: timestamp
        })
        .where(eq(applications.id, applicationId));

      // 4. QMS: Close DDD clock, Open Staff clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, applicationId),
          // We close whatever point the DD was working on (Technical or Hub)
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId,
        point: 'Staff Technical Review',
        division: oldDetails.assignedDivisions?.[0] || 'VMD', 
        staffId: staffId,
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
 * DD -> IRSD (Hub) or Director (Final)
 */
// ✅ Refined approveToDirector with robust QMS closing
export async function approveToDirector(
  appId: number, 
  recommendationNote: string, 
  loggedInUserId: string 
) {
  try {
    return await db.transaction(async (tx) => {
      const actingUser = await tx.query.users.findFirst({
        where: eq(users.id, loggedInUserId),
      });

      if (!actingUser) throw new Error("Acting User not found");

      // Logic Check: IRSD acts as the final gate (Point 7), others go to Hub (Point 6)
      const isIRSD = actingUser.division === "IRSD";
      const nextPoint = isIRSD ? "Director Final Review" : "IRSD Hub Clearance";

      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId),
      });

      if (!app) throw new Error("App not found");
      const oldDetails = (app.details as any) || {};

      const newEntry = {
        from: actingUser.name,
        role: "Divisional Deputy Director",
        division: actingUser.division,
        text: recommendationNote,
        timestamp: new Date().toISOString(),
        // Matches Point Map Actions
        action: isIRSD ? "ENDORSED_FOR_DIRECTOR" : "SUBMITTED_FOR_IRSD_CLEARANCE"
      };

      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), newEntry]
          },
          updatedAt: sql`now()`
        })
        .where(eq(applications.id, appId));

      const timestamp = sql`now()`;
      
      // ✅ QMS FIX: Close the active clock regardless of who opened it
      // This ensures Point 3 or Point 6 is officially stamped "Ended"
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      // Open new clock for the Next Point (Point 6 or 7)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPoint,
        division: isIRSD ? "DIRECTORATE" : "IRSD", 
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/director'); 
      return { success: true };
    });
  } catch (error: any) {
    console.error("RELAY_ACTION_ERROR:", error);
    return { success: false, error: error.message };
  }
}

/**
 * DD -> Staff (Return for Rework)
 */
export async function returnToStaff(
  appId: number, 
  rejectionReason: string, 
  targetStaffId: string, 
  currentDDId: string 
) {
  const timestamp = sql`now()`;
  try {
    const ddUser = await db.query.users.findFirst({ where: eq(users.id, currentDDId) });
    if (!ddUser) throw new Error("DD User not found");

    return await db.transaction(async (tx) => {
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];
      const nextRound = (oldDetails.currentRound || 1) + 1;

      const reworkEntry = {
        from: ddUser.name,
        role: "Divisional Deputy Director",
        division: ddUser.division,
        text: rejectionReason,
        timestamp: new Date().toISOString(),
        round: nextRound,
        action: "REWORK_REQUIRED"
      };

      await tx.update(applications)
        .set({
          // ✅ Matches Map Item 4
          currentPoint: 'Staff Technical Review', 
          status: 'PENDING_REWORK',
          details: {
            ...oldDetails,
            currentRound: nextRound,
            staff_reviewer_id: targetStaffId,
            comments: [...oldComments, reworkEntry]
          } as any,
          updatedAt: timestamp
        })
        .where(eq(applications.id, appId));

      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.staffId, currentDDId),
          isNull(qmsTimelines.endTime)
        ));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: targetStaffId,
        division: ddUser.division,
        point: 'Staff Technical Review',
        startTime: timestamp,
      });

      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/staff`);
      return { success: true };
    });
  } catch (error: any) {
    console.error("REWORK_ACTION_ERROR:", error);
    return { success: false, error: error.message };
  }
}