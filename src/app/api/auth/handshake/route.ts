import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const loginUrl = `${origin}/login`;

  if (!code) return NextResponse.redirect(`${loginUrl}?error=missing_code`);

  const cookieStore = cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) { return cookieStore.get(name)?.value; },
        set(name: string, value: string, options: CookieOptions) { cookieStore.set({ name, value, ...options }); },
        remove(name: string, options: CookieOptions) { cookieStore.set({ name, value: "", ...options }); },
      },
    }
  );

  const { error: authError } = await supabase.auth.exchangeCodeForSession(code);
  if (authError) return NextResponse.redirect(`${loginUrl}?error=link_expired`);

  const { data: { user } } = await supabase.auth.getUser();

  if (user) {
    const [userProfile] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    if (userProfile) {
      if (userProfile.role === "Admin" || userProfile.role === "Director") {
        return NextResponse.redirect(`${origin}/dashboard/director`);
      }
      const division = userProfile.division?.toLowerCase() || "vmd";
      return NextResponse.redirect(`${origin}/dashboard/${division}`);
    }
  }

  return NextResponse.redirect(`${loginUrl}?error=unauthorized_personnel`);
}