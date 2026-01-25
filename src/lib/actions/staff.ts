"use server";

import { db } from "@/db";
import { applications, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from 'next/cache';

export async function submitToDDD(
  appId: number, 
  observations: any[], 
  justification: string,
  userId: string 
) {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    const app = await db.query.applications.findFirst({ where: eq(applications.id, appId) });

    if (!user || !app) throw new Error("Context missing");

    const details = (app.details as Record<string, any>) || {};
    const currentComments = details.comments || [];

    // 1. UNIQUE POINT LOGIC (The "Next Hop" refactor)
    let nextPoint = "";
    let nextStatus = "";
    let actionTag = "";
    let nextQMSDivision = "";

    if (user.role === 'Staff') {
      // Step 5: Staff Technical Review -> Technical DD Review
      nextPoint = "Technical DD Review";
      nextStatus = "PENDING_DDD_REVIEW";
      actionTag = "SUBMITTED_TO_DDD"; // ✅ Standardized for Director's scannability
      nextQMSDivision = user.division; // Stays in the same division, just goes up to DD
    } 
    else if (user.role === 'Divisional Deputy Director' && user.division !== 'IRSD') {
      // Step 6: Technical DD -> IRSD Hub Clearance
      nextPoint = "IRSD Hub Clearance"; 
      nextStatus = "PENDING_IRSD_CLEARANCE";
      actionTag = "SUBMITTED_FOR_IRSD_RECOMMENDATION";
      nextQMSDivision = "IRSD"; // Moves to the Hub
    } 
    else if (user.role === 'Divisional Deputy Director' && user.division === 'IRSD') {
      // Step 7: IRSD -> Director Final Review
      nextPoint = "Director Final Review";
      nextStatus = "PENDING_DIRECTOR_APPROVAL";
      actionTag = "ENDORSED_FOR_DIRECTOR"; // ✅ Matches Director's "dddMinute" logic
      nextQMSDivision = "DIRECTORATE"; // Moves to the Top
    }

    // 2. Prepare Comment with Action Tags
    const newComment = {
      from: user.name,
      role: user.role,
      division: user.division,
      text: justification,
      action: actionTag, 
      timestamp: new Date().toISOString(),
      observations: observations, 
    };

    // --- QMS DATABASE TRANSACTION ---
    await db.transaction(async (tx) => {
      // A. Update Application State
      await tx.update(applications)
        .set({
          status: nextStatus,
          currentPoint: nextPoint, 
          details: {
            ...details,
            comments: [...currentComments, newComment],
            last_submission_date: new Date().toISOString(), 
          } as any,
          updatedAt: sql`now()`
        })
        .where(eq(applications.id, appId));

      // B. Close Current Segment (Stop Clock)
      // We remove the staffId check to ensure the Divisional clock closes regardless of assignee
      await tx.update(qmsTimelines)
        .set({ endTime: sql`now()` })
        .where(
          and(
            eq(qmsTimelines.applicationId, appId),
            isNull(qmsTimelines.endTime)
          )
        );

      // C. Open Next Segment (Start Clock for the Point)
      await tx.insert(qmsTimelines)
        .values({
          applicationId: appId,
          point: nextPoint,
          division: nextQMSDivision, // ✅ Uses our predicted division
          startTime: sql`now()`,
        });
    });

    revalidatePath(`/dashboard/${user.division.toLowerCase()}`);
    revalidatePath(`/dashboard/ddd`);
    revalidatePath(`/dashboard/director`);
    
    return { success: true, movedTo: nextPoint };
  } catch (error: any) {
    console.error("QMS_SUBMISSION_ERROR:", error);
    return { success: false, error: error.message };
  }
}