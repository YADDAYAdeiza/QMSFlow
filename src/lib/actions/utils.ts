import { db } from "@/db";
import { users } from "@/db/schema";
import { eq } from "drizzle-orm";

/**
 * Fetches the User ID of the Director.
 * This is used for the final stage of endorsement (Hub -> Director).
 */
export async function getDirectorId(): Promise<string | null> {
  try {
    const director = await db.query.users.findFirst({
      where: eq(users.role, 'Director'),
      // You can also add a division check if there are multiple Directors, 
      // e.g., eq(users.division, 'DIRECTORATE')
    });

    return director?.id || null;
  } catch (error) {
    console.error("Error fetching Director ID:", error);
    return null;
  }
}