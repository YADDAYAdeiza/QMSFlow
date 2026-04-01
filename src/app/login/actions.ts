"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getRedirectPath(userId: string) {
  // 1. Log the incoming ID to your TERMINAL (not the browser)
  console.log("🔍 AUTH ATTEMPT - UUID:", userId);

  try {
    // 2. Query our staff registry
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 3. Log if result is empty
    if (!result || result.length === 0) {
      console.error("❌ REGISTRY FAIL: UUID not found in 'users' table:", userId);
      throw new Error("UNREGISTERED_STAFF");
    }

    const userProfile = result[0];

    // 4. Role-based routing logic
    if (userProfile.role === "Admin" || userProfile.role === "Divisional Deputy Director") {
      return "/dashboard/admin/staff";
    }

    // 5. Division-based routing
    const division = userProfile.division?.toLowerCase() || "vmd";
    const targetPath = `/dashboard/${division}`;
    
    console.log("✅ ACCESS GRANTED:", userProfile.email, "->", targetPath);
    return targetPath;

  } catch (error: any) {
    // This will show up in your VS Code / Terminal console
    console.error("🔥 DATABASE CRITICAL ERROR:", error.message);
    throw error; // Re-throw so the UI catch block can see it
  }
}