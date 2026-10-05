"use server";

import { db } from "@/db";
import { applications, qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function recallIrsdApplication(applicationId: number, actorName: string = "Divisional Deputy Director") {
  try {
    // 1. Fetch current application details to preserve comment history
    const appRecord = await db
      .select({ details: applications.details })
      .from(applications)
      .where(eq(applications.id, applicationId))
      .limit(1);

    if (!appRecord.length) {
      throw new Error("Application not found.");
    }

    const currentDetails = typeof appRecord[0].details === "string" 
      ? JSON.parse(appRecord[0].details || "{}") 
      : (appRecord[0].details || {});

    const existingComments = Array.isArray(currentDetails.comments) ? currentDetails.comments : [];

    // Append the recall action to the comment history audit trail
    const updatedDetails = {
      ...currentDetails,
      comments: [
        ...existingComments,
        {
          text: "Application recalled by Divisional Deputy Director back to IRSD Intake Routing.",
          action: "RECALL",
          fromStep: "IRSD_STAFF_VETTING",
          toStep: "DDD_IRSD_INTAKE",
          actorRole: "Divisional Deputy Director",
          actorName: actorName,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    // 2. Update Application State
    await db
      .update(applications)
      .set({
        currentPoint: "Divisional Deputy Director IRSD Routing",
        status: "PENDING_IRSD_ROUTING",
        assignedVettingInspectorId: null,
        details: updatedDetails,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    // 3. QMS Timeline Audit Handling
    // Close active QMS timeline for the staff member
    await db
      .update(qmsTimelines)
      .set({ endTime: new Date() })
      .where(
        and(
          eq(qmsTimelines.applicationId, applicationId),
          eq(qmsTimelines.point, "IRSD Staff Compliance Vetting"),
          isNull(qmsTimelines.endTime)
        )
      );

    // Start new QMS timeline for DDD Intake step
    await db.insert(qmsTimelines).values({
      applicationId: applicationId,
      point: "Divisional Deputy Director IRSD Routing",
      division: "IRSD",
      startTime: new Date(),
      details: { action: "RECALLED_FROM_IRSD_STAFF" },
    });

    revalidatePath("/LocalInspectionReports/ddd");
    return { success: true };
  } catch (error: any) {
    console.error("Recall operation failed:", error);
    return { success: false, error: error.message || "Failed to recall application." };
  }
}