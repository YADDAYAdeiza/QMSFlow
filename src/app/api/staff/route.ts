import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const division = searchParams.get("division");

  if (!division) return NextResponse.json([]);

  const staff = await db.query.users.findMany({
    where: and(
      eq(users.division, division),
      eq(users.role, 'Staff')
    ),
    columns: { id: true, name: true }
  });

  return NextResponse.json(staff);
}