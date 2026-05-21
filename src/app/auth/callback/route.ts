import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  console.log('Getting auth: ')
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // This is our safety net. If anything fails, we go back to the terminal.
  const loginUrl = `${origin}/login`;

  // 1. Check if the code exists in the URL
  if (!code) {
    console.error("❌ No code provided in auth callback");
    return NextResponse.redirect(`${loginUrl}?error=missing_code`);
  }

  const cookieStore = cookies();
  
  // 2. Initialize the Supabase Server Client with Cookie Handlers
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );

  // 3. Exchange the temporary code for a persistent Session
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);

  if (authError) {
    console.error("❌ Code exchange failed:", authError.message);
    return NextResponse.redirect(`${loginUrl}?error=link_expired_or_invalid`);
  }

  // 4. Retrieve the user details
  const { data: { user }, error: userError } = await supabase.auth.getUser();

  if (userError || !user) {
    console.error("❌ Failed to retrieve user after exchange");
    return NextResponse.redirect(`${loginUrl}?error=user_fetch_failed`);
  }

  // 5. QMS HANDSHAKE: Cross-reference with our internal Drizzle Registry
  const [userProfile] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  // 6. DYNAMIC ROUTING ENGINE
  if (!userProfile) {
    /** * If they are authenticated via Supabase but don't exist in our 
     * internal users table yet, they are likely not pre-authorized personnel.
     */
    console.warn(`⚠️ Profile missing for user ${user.id} in internal database.`);
    return NextResponse.redirect(`${loginUrl}?error=unauthorized_personnel`);
  }

  // Route to high-level dashboard
  if (userProfile) {
      const division = userProfile.division?.toLowerCase() || "vmd";
      const role = userProfile.role;
      console.log('My role is: ', role);
      let dashboardPath: string;

      // Evaluate routing logic based on user role assignments
      if (role === "Admin" || role === "Director") {
        dashboardPath = "/dashboard/director";
      } else if (role === "PID") {
        dashboardPath = "/Vetstat/Ledger";
      } else {
        // The missing catch-all: falls back to the division-specific dashboard
        console.log('Catch all?');
        dashboardPath = `/dashboard/${division}`;
      }
        
      return NextResponse.redirect(`${origin}${dashboardPath}`);
    }
}