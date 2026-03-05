"use server";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitToDDD(
  appId: number, 
  userId: string, 
  justification: string, 
  isHubVetting: boolean // From our form's prop
) {
  try {
    const user = await db.query.users.findFirst({ 
      where: eq(users.id, userId) 
    });
    if (!user) throw new Error("User not found");

    // 1. Find the specific DD for this staff's division (PAD, VMD, or IRSD)
    const divisionalDD = await db.query.users.findFirst({
      where: (u, { and, eq }) => and(
        eq(u.division, user.division as any), 
        eq(u.role, 'Divisional Deputy Director')
      ),
    });

    /**
     * ✅ DYNAMIC LABELLING
     * Ensures IRSD actions are logged differently than Technical actions
     */
    const nextPoint = isHubVetting ? "IRSD Hub Clearance" : "Technical DD Review Return";
    const actionLabel = isHubVetting ? "HUB_VETTING_COMPLETED" : "TECHNICAL_ASSESSMENT_SUBMITTED";

    return await db.transaction(async (tx) => {
      const timestamp = sql`now()`;
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      const details = (app?.details as any) || {};

      const newComment = {
        from: user.name,
        role: isHubVetting ? "IRSD Officer" : "Staff",
        division: user.division,
        text: justification,
        action: actionLabel,
        timestamp: new Date().toISOString(),
      };

      // A. Update Application
      await tx.update(applications)
        .set({
          currentPoint: nextPoint,
          status: isHubVetting ? "AWAITING_HUB_ENDORSEMENT" : "PENDING_DD_RECOMMENDATION",
          details: { 
            ...details, 
            comments: [...(details.comments || []), newComment] 
          },
          updatedAt: timestamp
        })
        .where(eq(applications.id, appId));

      // B. Close Staff Clock (The current desk clock)
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          isNull(qmsTimelines.endTime)
        ));

      // C. Open DD Return Clock (Assigned back to the boss)
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: nextPoint,
        division: user.division,
        staffId: divisionalDD?.id || null, 
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      revalidatePath('/dashboard/staff');
      return { success: true };
    });
  } catch (error: any) {
    console.error("SUBMIT_TO_DDD_ERROR:", error);
    return { success: false, error: error.message };
  }
}