import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

/**
 * For "Vibe-Coding" and local development, we use the 
 * connection string from your .env.local file.
 */
const connectionString = process.env.DATABASE_URL!;

// Disable prefetch as it causes issues with Supabase's connection pooler
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema });