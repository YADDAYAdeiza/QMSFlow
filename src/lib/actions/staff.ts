// @/lib/actions/staff.ts
"use server";

import { db } from "@/db";
import { applications, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from 'next/cache';

export async function submitToDDD(appId: number, observations: any[], justification: string, userId: string) {
  try {
    const user = await db.query.users.findFirst({ where: eq(users.id, userId) });
    if (!user) throw new Error("User not found");

    // Find the DD for this specific staff's division
    // const divisionalDD = await db.query.users.findFirst({
    //   where: and(eq(users.division, user.division), eq(users.role, 'Divisional Deputy Director'))
    // });

    // Replace your divisionalDD fetch with this:
    const divisionalDD = await db.query.users.findFirst({
      where: (users, { and, eq }) => and(
        eq(users.division, user.division as any), 
        eq(users.role, 'Divisional Deputy Director')
      ),
    });

    return await db.transaction(async (tx) => {
      const timestamp = sql`now()`;
      const app = await tx.query.applications.findFirst({ where: eq(applications.id, appId) });
      const details = (app?.details as any) || {};

      const newComment = {
        from: user.name,
        role: "Staff",
        division: user.division,
        text: justification,
        action: "TECHNICAL_ASSESSMENT_SUBMITTED",
        timestamp: new Date().toISOString(),
        observations
      };

      // A. Update Application
      await tx.update(applications)
        .set({
          currentPoint: "Technical DD Review Return",
          status: "PENDING_DD_RECOMMENDATION",
          details: { ...details, comments: [...(details.comments || []), newComment] },
          updatedAt: timestamp
        })
        .where(eq(applications.id, appId));

      // B. Close Staff Clock
      await tx.update(qmsTimelines)
        .set({ endTime: timestamp })
        .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)));

      // C. Open DD Return Clock (Assigned to Divisional DD)
      // await tx.insert(qmsTimelines).values({
      //   applicationId: appId,
      //   point: "Technical DD Review Return",
      //   division: user.division,
      //   userId: divisionalDD?.id || null, 
      //   startTime: timestamp,
      // });

      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: "Technical DD Review Return",
        division: user.division,
        staffId: divisionalDD?.id || null, // Match your schema!
        startTime: timestamp,
      });

      revalidatePath('/dashboard/ddd');
      return { success: true };
    });
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}