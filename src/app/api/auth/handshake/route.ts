import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * POST: Handles the "Handshake" during registration.
 * Links the Supabase Auth ID to the Drizzle Personnel Registry.
 */
export async function POST(request: Request) {
  try {
    const { email, id } = await request.json();

    if (!email || !id) {
      return NextResponse.json({ error: "Missing identity data" }, { status: 400 });
    }

    // Update the existing user record in Drizzle to link the Supabase ID
    // We match by email because the personnel was likely pre-registered in the system
    const updatedUser = await db
      .update(users)
      .set({ id: id }) // Setting the Drizzle ID to match Supabase UID
      .where(eq(users.email, email))
      .returning();

    if (!updatedUser.length) {
      return NextResponse.json({ error: "Personnel not found in registry" }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Handshake Error:", error);
    return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
  }
}

/**
 * GET: Handles the Supabase Auth Callback.
 * Exchanges the code for a session and redirects to the correct dashboard.
 */
// Inside app/api/auth/handshake/route.ts -> GET function

export async function GET(request: Request) {
    console.log('Getting api/auth: ')
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  
  // Define your login URL clearly
  const loginUrl = `${origin}/login`;

  if (!code) {
    return NextResponse.redirect(`${loginUrl}?error=missing_code`);
  }

  const cookieStore = cookies();
  const supabase = createClient(cookieStore);

  // Exchange the temporary code for a real session
  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  
  if (authError) {
    console.error("Auth Error:", authError.message);
    return NextResponse.redirect(`${loginUrl}?error=verification_failed`);
  }

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    // if (userProfile) {
    //   // If profile exists, send them to their dashboard
    //   const division = userProfile.division?.toLowerCase() || "vmd";
    //   const dashboardPath = (userProfile.role === "Admin" || userProfile.role === "Director") 
    //     ? "/dashboard/director" 
    //     : `/dashboard/${division}`;
        
    //   return NextResponse.redirect(`${origin}${dashboardPath}`);
    // }

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

  // SUCCESSFUL VERIFICATION BUT NO PROFILE YET? 
  // Send them to login so they can sign in normally.
  return NextResponse.redirect(`${loginUrl}?message=email_verified`);
}

// Helper to keep the code clean
function createClient(cookieStore: ReturnType<typeof cookies>) {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}