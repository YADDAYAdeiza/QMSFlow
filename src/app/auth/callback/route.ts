import { createClient } from "@/utils/supabase/server";
import { NextResponse } from "next/next";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  // if "next" is in search params, use it as the redirection URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = createClient();
    
    // 1. Swap the code for a Session
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    
    if (!error) {
      const { data: { user } } = await supabase.auth.getUser();

      if (user) {
        // 2. Final QMS Check: Ensure the user is in our public.users table
        const [userProfile] = await db
          .select()
          .from(users)
          .where(eq(users.id, user.id))
          .limit(1);

        // 3. Teleport them to their specific dashboard based on role
        if (userProfile?.role === "Admin" || userProfile?.role === "Divisional Deputy Director") {
          return NextResponse.redirect(`${origin}/dashboard/admin/staff`);
        }
        
        const division = userProfile?.division?.toLowerCase() || "vmd";
        return NextResponse.redirect(`${origin}/dashboard/${division}`);
      }
    }
  }

  // If something goes wrong, send them back to login with an error
  return NextResponse.redirect(`${origin}/login?error=Could not verify authentication code`);
}