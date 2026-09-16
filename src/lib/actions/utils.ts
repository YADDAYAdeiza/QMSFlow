import { db } from "@/db";
import { users } from "@/db/schema";
import { eq, and } from "drizzle-orm";

/**
 * Fetches the User ID of the Director.
 * This is used for the final stage of endorsement (Hub -> Director).
 */
export async function getDirectorId(userDivision?: string): Promise<string | null> {
  try {
    const director = await db.query.users.findFirst({
      where: and(
        eq(users.role, 'Director'),
        userDivision ? eq(users.division, userDivision as any) : undefined
      ),
    });

    return director?.id || null;
  } catch (error) {
    console.error("Error fetching Director ID:", error);
    return null;
  }
}