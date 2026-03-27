"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getRedirectPath(userId: string) {
  // Query our staff registry (public.users)
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, userId))
    .limit(1);

  if (!userProfile) {
    throw new Error("User not found in registry");
  }

  // 1. Admins and Divisional Deputy Directors go to the Staff Registry
  if (userProfile.role === "Admin" || userProfile.role === "Divisional Deputy Director") {
    return "/dashboard/admin/staff";
  }

  // 2. Technical Reviewers go to their specific Division Workspace
  // (e.g., /dashboard/vmd, /dashboard/pad)
  const division = userProfile.division?.toLowerCase() || "vmd";
  return `/dashboard/${division}`;
}