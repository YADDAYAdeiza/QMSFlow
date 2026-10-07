"use server";

import { db } from "@/db";
import { applications, qmsTimelines, users } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

interface AssignCategorizationPayload {
  applicationId: number;
  assignedStaffId: string;
  instructions?: string;
  targetStepKey?: string;
}

export async function assignCategorizationTaskAction(
  payload: AssignCategorizationPayload
) {
  const { applicationId, assignedStaffId, instructions, targetStepKey } = payload;

  if (!applicationId || !assignedStaffId) {
    throw new Error("Missing required fields: applicationId or assignedStaffId.");
  }

  // Authenticate Divisional Deputy Director via Supabase Server Client
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized");
  }

  const currentUserId = user.id;
  const stepKey = targetStepKey || "UNDER_CATEGORIZATION";

  // Fetch target staff member to extract division details
  const assignedStaff = await db.query.users.findFirst({
    where: eq(users.id, assignedStaffId),
  });

  if (!assignedStaff) {
    throw new Error("Assigned staff member not found.");
  }

  // Execute in a single transaction to maintain state & QMS integrity
  await db.transaction(async (tx) => {
    // 1. Update Application status and current macro point
    await tx
      .update(applications)
      .set({
        currentPoint: stepKey,
        assignedToId: assignedStaffId, // Cached snapshot for quick macro lookup
        status: "UNDER_CATEGORIZATION",
        internalNotes: instructions || null,
        updatedAt: new Date(),
      })
      .where(eq(applications.id, applicationId));

    // 2. Close any existing open QMS timeline record for this application (stops the previous clock)
    await tx
      .update(qmsTimelines)
      .set({
        endTime: new Date(),
      })
      .where(
        and(
          eq(qmsTimelines.applicationId, applicationId),
          isNull(qmsTimelines.endTime)
        )
      );

    // 3. Insert new QMS timeline record (starts the active clock for the assigned inspector)
    await tx.insert(qmsTimelines).values({
      applicationId: applicationId,
      staffId: assignedStaffId, // Inspector ownership
      point: stepKey,
      division: assignedStaff.division || "VMD",
      startTime: new Date(),
      details: {
        instructions: instructions || null,
        assignedBy: currentUserId,
        assignedAt: new Date().toISOString(),
      },
    });
  });

  revalidatePath("/LocalInspectionReports/ddd");
  return { success: true };
}