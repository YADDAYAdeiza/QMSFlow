"use server"

import { db } from "@/db"; 
import { applications, qmsTimelines } from "@/db/schema"; 
import { eq, sql } from "drizzle-orm"; 
import { revalidatePath } from "next/cache";

export async function assignToStaff(applicationId: number, divisions: string[]) { // 1. Update the Application Point and add a Comment to the History // We use sql to perform a JSONB merge so we don't lose LOD or Director comments 
await db.update(applications) 
    .set({ 
        currentPoint: 'Staff', 
        details: sqljsonb_set( details, '{comments}', (details->'comments') || jsonb_build_array(jsonb_build_object( 'from', 'DDD', 'role', 'Divisional Deputy Director', 'text', 'Assigned to Staff for technical review.', 'timestamp', ${new Date().toISOString()} )) ) }) .where(eq(applications.id, applicationId));

// 2. Start the QMS Clock for each assigned division // This creates a new record for each division to track their 48-hour window 
for (const div of divisions) { 
    await db.insert(qmsTimelines)
        .values({ applicationId: applicationId, point: 'Staff', division: div, startTime: new Date(), }); 
    }

// 3. Refresh the cache so the UI updates immediately 
revalidatePath('/dashboard/ddd'); 
revalidatePath('/dashboard/[division]', 'layout'); }