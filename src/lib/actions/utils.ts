// @/lib/actions/utils.ts
import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function getDirectorId() {
  const director = await db.query.users.findFirst({
    where: eq(users.role, 'Director'),
  });
  return director?.id || null;
}