import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // 'next' allows you to pass a specific return path, default to root if not found
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // 1. Swap the temporary code for a secure Session
    const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!authError) {
      // 2. Fetch the authenticated user's metadata
      const { data: { user }, error: userError } = await supabase.auth.getUser();

      if (user && !userError) {
        // 3. QMS HANDSHAKE: Cross-reference with our internal users table
        const [userProfile] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        /**
         * 4. DYNAMIC ROUTING ENGINE
         * High-level officials go to the Directorate Portal.
         * Technical staff go to their specific Division Hub.
         */
        
        // If profile hasn't been created yet (Edge case), send to a generic onboarding or root
        if (!userProfile) {
          console.warn(`⚠️ Profile missing for user ${user.id} during callback.`);
          return NextResponse.redirect(`${origin}/login?error=profile-not-found`);
        }

        // Routing for High-Level Access
        if (userProfile.role === "Admin" || userProfile.role === "Director") {
          return NextResponse.redirect(`${origin}/dashboard/director`);
        }

        // Routing for Division Staff
        // We normalize to lowercase to match the folder structure (e.g., /dashboard/vmd)
        const division = userProfile.division?.toLowerCase() || "vmd";
        return NextResponse.redirect(`${origin}/dashboard/${division}`);
      }
    }
  }

  // 5. ERROR HANDLING
  // If code exchange fails or user isn't found, return to login with a clear error
  console.error("❌ Auth Callback Failure: Invalid code or session exchange error.");
  return NextResponse.redirect(`${origin}/login?error=authentication_failed`);
}