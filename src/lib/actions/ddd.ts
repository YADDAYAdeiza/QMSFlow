"use server"

import { db } from "@/db";
import { applications, qmsTimelines, users, riskAssessments } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { calculateORR } from "@/lib/actions/riskEngine"; 
import { createClient } from "@/utils/supabase/server";

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


// Assuming you have this utility for the final risk math
// import { calculateORR } from "@/lib/utils/risk-engine"; 

export async function approveToDirector(
  appId: number, 
  recommendationNote: string, 
  loggedInUserId: string
) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Identify Actor (The DDD performing the action)
      const actingUser = await tx.query.users.findFirst({ 
        where: (u, { eq }) => eq(u.id, loggedInUserId) 
      });
      if (!actingUser) throw new Error("Acting User not found");

      // LOGIC: If the user is from IRSD, they are sending to the Director.
      // If they are from VMD/AFPD etc, they are sending to the IRSD Hub.
      const isIRSD = actingUser.division === "IRSD";
      
      const nextPoint = isIRSD ? "Director Final Review" : "IRSD Hub Clearance";
      const nextStatus = isIRSD ? "PENDING_DIRECTOR_APPROVAL" : "UNDER_HUB_CLEARANCE";
      const actionLabel = isIRSD ? "ENDORSED_FOR_DIRECTOR_SIGN_OFF" : "TECHNICAL_CONCURRENCE_FORWARDED_TO_HUB";
      
      // 2. FINAL RISK FINALIZATION (Only for IRSD DD)
      if (isIRSD) {
        const riskRecord = await tx.query.riskAssessments.findFirst({
          where: (ra, { eq }) => eq(ra.applicationId, appId)
        });

        // If we have both levels, bake the final score
        if (riskRecord?.intrinsicLevel && riskRecord?.complianceLevel) {
          // Replace this with your actual ORR calculation logic
          const rating = riskRecord.intrinsicLevel === 'High' || riskRecord.complianceLevel === 'High' ? 'High' : 'Medium';
          const interval = rating === 'High' ? 6 : 12; // Months until next inspection

          const nextDate = new Date();
          nextDate.setMonth(nextDate.getMonth() + interval);

          await tx.update(riskAssessments).set({
            overallRiskRating: rating,
            nextInspectionDate: nextDate,
            status: "FINALIZED",
            updatedAt: new Date()
          }).where(eq(riskAssessments.applicationId, appId));
        }
      }

      // 3. Resolve Next Owner
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
      const app = await tx.query.applications.findFirst({ where: eq(applications.id, appId) });
      if (!app) throw new Error("Application record missing");
      
      const oldDetails = (app.details as any) || {};
      
      // We explicitly link the report that the Director should be looking at
      const reportForDirector = oldDetails.verificationReportUrl || oldDetails.technicalAssessmentUrl;

      const newEntry = {
        from: actingUser.name,
        role: "Divisional Deputy Director",
        division: actingUser.division,
        text: recommendationNote,
        timestamp: new Date().toISOString(),
        action: actionLabel,
        referenceReport: reportForDirector 
      };

      const dbTimestamp = new Date();

      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          status: nextStatus,
          details: { 
            ...oldDetails, 
            comments: [...(oldDetails.comments || []), newEntry],
            lastEndorsedBy: actingUser.id,
            finalRecommendationReport: reportForDirector // Specific key for the Director's UI
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

      /**
       * ✅ DYNAMIC POINT & STATUS SELECTION
       */
      const isIRSD = ddUser.division === "IRSD";
      const targetPoint = isIRSD ? "IRSD Staff Vetting" : "Staff Technical Review";
      const targetStatus = isIRSD ? "HUB_VETTING_REWORK" : "PENDING_REWORK";

      /**
       * ✅ QMS DELTA TRACKING: SNAPSHOT CURRENT FINDINGS
       * We capture the findings_ledger and the report URL as they exist 
       * at the moment of rejection.
       */
      const reworkEntry = {
        from: ddUser.name,
        role: "Divisional Deputy Director",
        division: ddUser.division,
        text: rejectionReason,
        timestamp: new Date().toISOString(),
        round: nextRound,
        action: "REWORK_REQUIRED",
        // The Snapshot:
        frozenFindings: oldDetails.findings_ledger || [],
        frozenReport: oldDetails.inspectionReportUrl || oldDetails.verificationReportUrl
      };

      // 1. Update Application State
      const updatedDetails = {
        ...oldDetails,
        currentRound: nextRound,
        comments: [...oldComments, reworkEntry]
      };

      // Ensure the correct reviewer key is updated
      if (isIRSD) {
        updatedDetails.irsd_reviewer_id = targetStaffId;
      } else {
        updatedDetails.staff_reviewer_id = targetStaffId;
      }

      await tx.update(applications)
        .set({
          currentPoint: targetPoint, 
          status: targetStatus,
          details: updatedDetails as any,
          updatedAt: timestamp
        })
        .where(eq(applications.id, appId));

      // 2. QMS Timing: End current DD clock (Stopping the DD's turnaround time)
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      // 3. QMS Timing: Start new Staff clock (Specific to the division's point)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        staffId: targetStaffId,
        division: ddUser.division,
        point: targetPoint,
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

export async function forwardToHub(appId: number, remarks: string) {
  try {
    return await db.transaction(async (tx) => {
      // 1. Fetch Application
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });
      if (!app) throw new Error("Application not found");

      // 2. Fetch the DD(IRSD) user to "clock" the application to him
      // We look for the user who is the 'Divisional Deputy Director' of 'IRSD'
      const hubDD = await tx.query.users.findFirst({
        where: and(
          eq(users.division, "IRSD"),
          eq(users.role, "Divisional Deputy Director")
        )
      });

      if (!hubDD) throw new Error("DD(IRSD) not found in the system. Cannot open QMS clock.");

      const oldDetails = (app.details as any) || {};
      const timestamp = sql`now()`;

      // 3. Log the Comment
      const hubComment = {
        from: `Divisional Deputy Director (${app.division})`,
        role: "Divisional Deputy Director",
        division: app.division,
        text: remarks,
        action: "FORWARDED_TO_IRSD_HUB",
        timestamp: new Date().toISOString()
      };

      // 4. CLOSE CURRENT CLOCK (The Technical DD's clock)
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          isNull(qmsTimelines.endTime)
        ));

      // 5. START NEW CLOCK (For the DD(IRSD))
      // This ensures he is timed from the second it leaves the Technical Dept.
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "IRSD Hub Clearance",
        staffId: hubDD.id, // Clocked to the DD(IRSD) specifically
        division: "IRSD",
        startTime: timestamp,
      });

      // 6. Update Application State
      await tx.update(applications)
        .set({
          currentPoint: "IRSD Hub Clearance",
          status: "PENDING_HUB_CLEARANCE",
          updatedAt: timestamp,
          details: {
            ...oldDetails,
            comments: [...(oldDetails.comments || []), hubComment]
          }
        })
        .where(eq(applications.id, appId));

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    console.error("FORWARD_TO_HUB_ERROR:", error);
    return { success: false, error: error.message };
  }
}



/**
 * RECALL PROTOCOL
 * Transitions an application from a staff member's desk back to the DDD.
 */

export async function recallApplication(applicationId: string, actingDivision: string) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("Unauthorized: Executive credentials required.");
  }

  const loggedInUserId = session.user.id;
  const numericAppId = Number(applicationId);
  const divisionKey = actingDivision.toUpperCase();
  console.log('This is the division: ', divisionKey);

  // Determine the "Home Desk" point based on the division
  // IRSD recalls to Hub Clearance; Technical Divisions recall to DD Review
  const recallPoint = divisionKey === "IRSD" 
    ? "IRSD Hub Clearance" 
    : "Technical DD Review";

  try {
    await db.transaction(async (tx) => {
      // 1. Identify the active staff timeline entry to be terminated
      const [activeTimeline] = await tx
        .select()
        .from(qmsTimelines)
        .where(
          and(
            eq(qmsTimelines.applicationId, numericAppId),
            eq(qmsTimelines.division, divisionKey),
            isNull(qmsTimelines.endTime)
          )
        )
        .limit(1);

      if (!activeTimeline) {
        throw new Error("Recall Handshake Failed: No active staff review found.");
      }

      // 2. Fetch dossier for the Audit Trail update
      const [app] = await tx
        .select()
        .from(applications)
        .where(eq(applications.id, numericAppId))
        .limit(1);

      const details = (app.details as any) || {};
      const updatedComments = [
        ...(details.comments || []),
        {
          from: divisionKey === "IRSD" ? "DD IRSD" : "Divisional Deputy Director",
          role: divisionKey === "IRSD" ? "DD_IRSD" : "DDD",
          text: `QMS RECALL: File retrieved from staff (Staff ID: ${activeTimeline.staffId}) and returned to ${recallPoint}.`,
          action: "RECALL_TO_DESK",
          timestamp: new Date().toISOString(),
        },
      ];

      // 3. Terminate the Staff's timed session (QMS Compliance)
      await tx
        .update(qmsTimelines)
        .set({ endTime: new Date() })
        .where(eq(qmsTimelines.id, activeTimeline.id));

      // 4. Reset the Application's point to the Executive Desk
      await tx
        .update(applications)
        .set({
          currentPoint: recallPoint,
          details: { ...details, comments: updatedComments },
        })
        .where(eq(applications.id, numericAppId));

      // 5. Start the new timed session for the DD
      await tx.insert(qmsTimelines).values({
        applicationId: numericAppId,
        staffId: loggedInUserId,
        division: divisionKey,
        startTime: new Date(),
      });
    });

    // Revalidate the inbox path to refresh the UI immediately
    revalidatePath("/dashboard/ddd/inbox");
    
    return { success: true };
  } catch (error) {
    console.error("Critical Recall Error:", error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : "Handshake failed during recall." 
    };
  }
}