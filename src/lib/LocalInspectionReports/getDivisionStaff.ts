"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { createClient } from "@/utils/supabase/server";
import { eq, and } from "drizzle-orm";
// import { createClient } from "@/lib/supabase/server";

export async function getDivisionStaffAction() {
  // 1. Authenticate user via Supabase Server Client
  const supabase = await createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error("Unauthorized: Session not found.");
  }

  const userId = user.id;

  // 2. Fetch current logged-in user to retrieve division context
  const currentUser = await db.query.users.findFirst({
    where: eq(users.id, userId),
  });

  if (!currentUser || !currentUser.division) {
    throw new Error("User division context missing or invalid.");
  }

  // 3. Query technical staff members belonging to the exact same division
  const staffMembers = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      role: users.role,
      division: users.division,
    })
    .from(users)
    .where(
      and(
        eq(users.division, currentUser.division),
        eq(users.role, "Staff") // Adjust role filter to your schema definition
      )
    );

  return {
    division: currentUser.division,
    staff: staffMembers,
  };
}