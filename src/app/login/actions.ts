"use server";

import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * getRedirectPath
 * Determines the secure internal dashboard path based on the 
 * authenticated user's role and division in the Postgres registry.
 */
export async function getRedirectPath(userId: string) {
  // 1. Log the attempt for server-side auditing
  console.log("🔍 AUTH ATTEMPT - UUID:", userId);

  try {
    // 2. Query the 'users' table using the Supabase Auth UUID
    const result = await db
      .select()
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    // 3. Handle cases where user exists in Auth but not in our Staff Registry
    if (!result || result.length === 0) {
      console.error("❌ REGISTRY FAIL: UUID not found in 'users' table:", userId);
      throw new Error("UNREGISTERED_STAFF");
    }

    const userProfile = result[0];
    
    /** * 4. Normalization Logic
     * We convert division to lowercase for URL compatibility (e.g., "VMD" -> "vmd")
     * and fallback to "vmd" only if the field is null.
     */
    const division = userProfile.division?.toLowerCase() || "vmd";
    const role = userProfile.role;

    console.log(`👤 IDENTIFIED: ${userProfile.email} | ROLE: ${role} | DIV: ${division}`);

    // --- ROUTING ENGINE ---

    // A. SYSTEM ADMINS
    // Goes to the centralized staff and system management area
    if (role === "Admin") {
      return "/dashboard/admin/staff";
    }

    // B. DIVISIONAL DEPUTY DIRECTORS (DDDs)
    // We use the single 'app/dashboard/ddd/page.tsx' file 
    // and pass the 'as' parameter to filter the view.
    if (role === "Divisional Deputy Director") {
      return `/dashboard/ddd?as=${division}`;
    }

    // C. LABORATORY OPERATIONAL DASHBOARD (LOD)
    if (role === "LOD") {
      return "/dashboard/lod";
    }
    if (role === "Director") {
      return "/director";
    }

    /** * D. TECHNICAL STAFF / SPECIALISTS
     * This redirects to the dynamic division segment.
     * Path: /dashboard/[division]
     * This relies on your folder structure being: app/dashboard/[division]/page.tsx
     */
    const staffPath = `/dashboard/${division}`;
    
    console.log("✅ ACCESS GRANTED. Redirecting to Workspace:", staffPath);
    return staffPath;

  } catch (error: any) {
    // This logs to your terminal console (VS Code / Server logs)
    console.error("🔥 REDIRECT ENGINE ERROR:", error.message);
    
    // We throw the error so the Client Component's 'catch' block can show a UI toast/alert
    throw error; 
  }
}