"use server"

import { db } from "@/db";
import { applications, qmsTimelines, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateORR } from "@/lib/actions/riskEngine"; 

// import { getDirectorId } from "./utils";

/**
 * DD -> Staff: Moves the file to the staff's desk for technical work.
 */
// @/lib/actions/ddd.ts
// @/lib/actions/ddd.ts
// @/lib/actions/staff.ts (or wherever your assignment logic lives)

export async function assignToStaff(appId: number, staffId: string, remarks: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch Staff Details
      const staffMember = await tx.query.users.findFirst({
        where: eq(users.id, staffId)
      });

      if (!staffMember) throw new Error("Staff member not found");

      // 2. Fetch Application
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const timestamp = sql`now()`;

      /**
       * ✅ DYNAMIC POINT SELECTION
       * If staff is IRSD, we use the Hub Vetting point.
       * Otherwise, use the standard Technical Review point.
       */
      const isIRSD = staffMember.division === "IRSD";
      const targetPoint = isIRSD ? "IRSD Staff Vetting" : "Staff Technical Review";
      const targetStatus = isIRSD ? "UNDER_HUB_VETTING" : "UNDER_TECHNICAL_REVIEW";

      // LOGIC CHECK: Is this a change of staff or first assignment?
      // For IRSD, we check a specific key to avoid clashing with the technical staff history
      const currentAssignedId = isIRSD ? oldDetails.irsd_reviewer_id : oldDetails.staff_reviewer_id;
      const isReassignment = !!currentAssignedId;
      
      const displayAction = isIRSD 
        ? (isReassignment ? "REASSIGNED_HUB_VETTER" : "ASSIGNED_FOR_HUB_VETTING")
        : (isReassignment ? "REASSIGNED_TECHNICAL_STAFF" : "ASSIGNED_TO_TECHNICAL_STAFF");

      // 3. CLOSE ANY EXISTING OPEN CLOCKS (Closes the DD's current clock)
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // 4. LOG IN COMMENTS
      const assignmentComment = {
        from: `Divisional Deputy Director (${staffMember.division})`,
        role: "Divisional Deputy Director",
        division: staffMember.division,
        text: remarks,
        action: displayAction,
        timestamp: new Date().toISOString()
      };

      // 5. UPDATE APPLICATION
      // We store irsd_reviewer_id separately to maintain a clean audit trail
      const updatedDetails = {
        ...oldDetails,
        comments: [...(oldDetails.comments || []), assignmentComment]
      };

      if (isIRSD) {
        updatedDetails.irsd_reviewer_id = staffId;
      } else {
        updatedDetails.staff_reviewer_id = staffId;
      }

      await tx.update(applications)
        .set({
          currentPoint: targetPoint,
          status: targetStatus,
          updatedAt: timestamp,
          details: updatedDetails
        })
        .where(eq(applications.id, appId));

      // 6. START NEW CLOCK (For the Staff Member)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: targetPoint,
        staffId: staffId, 
        division: staffMember.division,
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      return { success: true };
    });
  } catch (error: any) {
    console.error("ASSIGN_TO_STAFF_ERROR:", error);
    return { success: false, error: error.message };
  }
}
/**
 * DD -> IRSD (Hub) or Director (Final)
 */
// ✅ Refined approveToDirector with robust QMS closing

// @/lib/actions/ddd.ts

/**
 * DD -> IRSD (Hub) OR DD IRSD -> Director (Final)
 * Handles the high-level movement of the dossier between leadership desks.
 */

// Helper to find the Director (VMAP)
async function getDirectorId() {
  const director = await db.query.users.findFirst({
    where: (u, { and, eq }) => and(
      eq(u.role, 'Director'),
      eq(u.division, 'DIRECTORATE') // Assuming Director is under VMAP
    )
  });
  return director?.id || null;
}

export async function approveToDirector(
  appId: number, 
  recommendationNote: string, 
  loggedInUserId: string
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Identify Actor (DDD)
      const actingUser = await tx.query.users.findFirst({ 
        where: (u, { eq }) => eq(u.id, loggedInUserId) 
      });
      if (!actingUser) throw new Error("Acting User not found");

      const isIRSD = actingUser.division === "IRSD";
      const nextPoint = isIRSD ? "Director Final Review" : "IRSD Hub Clearance";
      const actionLabel = isIRSD ? "ENDORSED_FOR_DIRECTOR_SIGN_OFF" : "TECHNICAL_CONCURRENCE_FORWARDED_TO_HUB";
      const nextStatus = isIRSD ? "PENDING_DIRECTOR_APPROVAL" : "UNDER_HUB_CLEARANCE";
      
      // 2. GRACEFUL ORR CALCULATION (Only for IRSD DD)
      if (isIRSD) {
        try {
          const riskRecord = await tx.query.riskAssessments.findFirst({
            where: (ra, { eq }) => eq(ra.applicationId, appId)
          });

          // Graceful check: Only calculate if the data is actually there
          if (riskRecord?.intrinsicLevel && riskRecord?.complianceLevel) {
            const { rating, interval } = calculateORR(
              riskRecord.intrinsicLevel as any, 
              riskRecord.complianceLevel as any
            );

            const nextInspectionDate = new Date();
            nextInspectionDate.setMonth(nextInspectionDate.getMonth() + interval);

            await tx.update(riskAssessments)
              .set({
                overallRiskRating: rating,
                nextInspectionDate: nextInspectionDate,
                status: "FINALIZED",
                updatedAt: new Date()
              })
              .where(eq(riskAssessments.applicationId, appId));

            console.log(`[RISK_LOG]: App ${appId} finalized with ORR: ${rating}`);
          } else {
            // Log the omission but don't stop the transaction
            console.warn(`[RISK_LOG]: Skipping ORR for App ${appId} - Data incomplete.`);
          }
        } catch (riskErr) {
          // If the risk table update fails, we log it and continue so the workflow isn't blocked
          console.error("[RISK_CALC_ERROR]:", riskErr);
        }
      }

      // 3. Resolve Next Owner (Director or IRSD DD)
      let nextOwnerId: string | null = null;
      if (isIRSD) {
        const director = await tx.query.users.findFirst({
          where: (u, { eq }) => eq(u.role, 'Director')
        });
        nextOwnerId = director?.id || null;
      } else {
        const irsdDD = await tx.query.users.findFirst({
          where: (u, { and, eq }) => and(
            eq(u.division, 'IRSD'), 
            eq(u.role, 'Divisional Deputy Director')
          )
        });
        nextOwnerId = irsdDD?.id || null;
      }

      // 4. Update Application & Audit Trail
      const app = await tx.query.applications.findFirst({ where: (a, { eq }) => eq(a.id, appId) });
      if (!app) throw new Error("Application record missing");
      
      const oldDetails = (app.details as any) || {};
      const newEntry = {
        from: actingUser.name,
        role: "Divisional Deputy Director",
        division: actingUser.division,
        text: recommendationNote,
        timestamp: new Date().toISOString(),
        action: actionLabel,
        referenceReport: isIRSD ? oldDetails.verificationReportUrl : oldDetails.technicalAssessmentUrl
      };

      const dbTimestamp = new Date();

      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          status: nextStatus,
          details: { 
            ...oldDetails, 
            comments: [...(oldDetails.comments || []), newEntry],
            lastEndorsedBy: actingUser.id 
          },
          updatedAt: dbTimestamp
        })
        .where(eq(applications.id, appId));

      // 5. QMS Timing Management
      await tx.update(qmsTimelines)
        .set({ endTime: dbTimestamp })
        .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPoint,
        division: isIRSD ? "DIRECTORATE" : "IRSD", 
        staffId: nextOwnerId, 
        startTime: dbTimestamp,
      });

      // 6. Refresh UI
      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/director'); 
      
      return { success: true };
    });
  } catch (error: any) {
    console.error("APPROVE_TO_DIRECTOR_ERROR:", error);
    return { success: false, error: error.message };
  }
}
/**
 * DD -> Staff (Return for Rework)
 */

export async function returnToStaff(
  appId: number, 
  targetStaffId: string,
  rejectionReason: string, 
  currentDDId: string 
) {
  const timestamp = sql`now()`;
  try {
    const ddUser = await db.query.users.findFirst({ 
      where: eq(users.id, currentDDId) 
    });
    
    if (!ddUser) throw new Error("Divisional Deputy Director user not found");

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

      // 1. Update Application State
      await tx.update(applications)
        .set({
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

      // 2. QMS Timing: End current Divisional Deputy Director clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.staffId, currentDDId),
          isNull(qmsTimelines.endTime)
        ));

      // 3. QMS Timing: Start new Staff Technical Review clock
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

/**
 * DD IRSD -> IRSD Staff (Internal Hub Vetting)
 */
export async function assignToIRSDStaff(appId: number, irsdStaffId: string, instruction: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Verify the IRSD Staff exists
      const irsdStaff = await tx.query.users.findFirst({
        where: and(eq(users.id, irsdStaffId), eq(users.division, 'IRSD'))
      });
      if (!irsdStaff) throw new Error("IRSD Staff member not found");

      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("Application not found");

      const oldDetails = (app.details as any) || {};
      const timestamp = sql`now()`;

      // 2. Log the Vetting Instruction in comments
      const vettingComment = {
        from: "IRSD Deputy Director",
        role: "Divisional Deputy Director",
        division: "IRSD",
        text: instruction,
        action: "ASSIGNED_FOR_HUB_VETTING",
        timestamp: new Date().toISOString()
      };

      // 3. Update Point to 'IRSD Staff Vetting'
      await tx.update(applications)
        .set({
          currentPoint: "IRSD Staff Vetting",
          status: "UNDER_HUB_VETTING",
          updatedAt: timestamp,
          details: { 
            ...oldDetails, 
            irsd_reviewer_id: irsdStaffId, // Separate key for tracking IRSD reviewer
            comments: [...(oldDetails.comments || []), vettingComment] 
          }
        })
        .where(eq(applications.id, appId));

      // 4. Close DD IRSD's current clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // 5. Open the IRSD Staff Vetting clock
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "IRSD Staff Vetting",
        staffId: irsdStaffId, 
        division: "IRSD",
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}