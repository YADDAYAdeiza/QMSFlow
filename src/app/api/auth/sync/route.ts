import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  try {
    const { email, id } = await req.json();

    // The logic: Update the pre-registered user with the new Supabase Auth ID
    const updated = await db
      .update(users)
      .set({ id: id }) // Link the Drizzle ID to the Supabase ID
      .where(eq(users.email, email))
      .returning();

    if (updated.length === 0) {
      return NextResponse.json({ error: "Email not pre-registered" }, { status: 403 });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}