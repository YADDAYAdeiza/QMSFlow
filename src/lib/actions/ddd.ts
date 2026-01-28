"use server"

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { getDirectorId } from "./utils";

/**
 * DD -> Staff: Moves the file to the staff's desk for technical work.
 */
// @/lib/actions/ddd.ts
// @/lib/actions/ddd.ts
// @/lib/actions/staff.ts (or wherever your assignment logic lives)
export async function assignToStaff(appId: number, staffId: string, remarks: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch the staff member to get their division for the QMS record
      const staffMember = await tx.query.users.findFirst({
        where: eq(users.id, staffId)
      });

      if (!staffMember) throw new Error("Staff member not found");

      // 2. Fetch current application to preserve existing details and comments
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const timestamp = sql`now()`;

      // 3. Create the New Comment Entry for the Dossier Thread
      const assignmentComment = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        division: staffMember.division, // The DD's division (same as staff)
        text: remarks,
        action: "ASSIGNED_TO_STAFF",
        timestamp: new Date().toISOString()
      };

      // A. Update Application: Merge the remark into the comments array
      await tx.update(applications)
        .set({
          currentPoint: "Staff Technical Review",
          status: "UNDER_TECHNICAL_REVIEW",
          updatedAt: timestamp,
          details: { 
            ...oldDetails, 
            staff_reviewer_id: staffId,
            // We append the new remark to the existing list of comments
            comments: [...(oldDetails.comments || []), assignmentComment] 
          }
        })
        .where(eq(applications.id, appId));

      // B. Close Divisional Deputy Director's Clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // C. Open Staff Clock (Now including the Division)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "Staff Technical Review",
        staffId: staffId, 
        division: staffMember.division, // This satisfies the division insert
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    console.error("Assignment Error:", error);
    return { success: false, error: error.message };
  }
}
/**
 * DD -> IRSD (Hub) or Director (Final)
 */
// ✅ Refined approveToDirector with robust QMS closing

// @/lib/actions/ddd.ts
export async function approveToDirector(appId: number, recommendationNote: string, loggedInUserId: string) {
  try {
    return await db.transaction(async (tx) => {
      const actingUser = await tx.query.users.findFirst({ 
        where: (u, { eq }) => eq(u.id, loggedInUserId) 
      });
      if (!actingUser) throw new Error("Acting User not found");

      const isIRSD = actingUser.division === "IRSD";
      const nextPoint = isIRSD ? "Director Final Review" : "IRSD Hub Clearance";
      
      let nextOwnerId: string | null = null;
      if (isIRSD) {
        nextOwnerId = await getDirectorId();
      } else {
        const irsdDD = await tx.query.users.findFirst({
          where: (u, { and, eq }) => and(
            eq(u.division, 'IRSD'), 
            eq(u.role, 'Divisional Deputy Director')
          )
        });
        nextOwnerId = irsdDD?.id || null;
      }

      const app = await tx.query.applications.findFirst({ 
        where: (a, { eq }) => eq(a.id, appId) 
      });
      const oldDetails = (app?.details as any) || {};

      const newEntry = {
        from: actingUser.name,
        role: "Divisional Deputy Director",
        division: actingUser.division,
        text: recommendationNote,
        timestamp: new Date().toISOString(),
        action: isIRSD ? "ENDORSED_FOR_DIRECTOR" : "SUBMITTED_FOR_IRSD_CLEARANCE"
      };

      // A. Update Application
      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          details: { ...oldDetails, comments: [...(oldDetails.comments || []), newEntry] },
          updatedAt: new Date() // JS Date for QMS
        })
        .where(eq(applications.id, appId));

      const timestamp = new Date(); // Standardizing on JS Time for QMS
      
      // B. Close Current DD Clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // C. Open New Clock
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPoint,
        division: isIRSD ? "DIRECTORATE" : "IRSD", 
        // FIX: Using staffId to match your schema
        staffId: nextOwnerId, 
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/director'); 
      return { success: true };
    });
  } catch (error: any) {
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