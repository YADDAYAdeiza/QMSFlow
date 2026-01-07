// "use server"

// import { db } from "@/db";
// import { qmsTimelines, applications } from "@/db/schema";
// import { eq, and, isNull } from "drizzle-orm";
// import { revalidatePath } from "next/cache";

// export async function assignToStaff(applicationId: number, staffId: string, division: string) {
//   // 1. Update the application to show it's now at the "Staff" point
//   await db.update(applications)
//     .set({ currentPoint: 'Staff' })
//     .where(eq(applications.id, applicationId));

//   // 2. IMPORTANT: Update the timeline row so it leaves the DDD inbox
//   // We change the 'point' so the DDD query (which looks for 'Divisional Deputy Director') 
//   // no longer finds this specific record.
//   await db.update(qmsTimelines)
//     .set({ 
//       staffId: staffId, 
//       point: 'Technical Review' // Changing the point moves it out of the DDD inbox
//     })
//     .where(and(
//       eq(qmsTimelines.applicationId, applicationId),
//       eq(qmsTimelines.division, division.toUpperCase()),
//       isNull(qmsTimelines.endTime)
//     ));

//   revalidatePath('/dashboard/ddd');
//   revalidatePath(`/dashboard/${division.toLowerCase()}`);
// }

// "use server"

// import { db } from "@/db";
// import { qmsTimelines } from "@/db/schema";
// import { eq, and, isNull } from "drizzle-orm";
// import { revalidatePath } from "next/cache";

// export async function approveToDirector(
//   applicationId: number,
//   division: string,
//   dddComments: string
// ) {
//   try {
//     const now = new Date();

//     // 1. Close the DDD's active validation row
//     await db.update(qmsTimelines)
//       .set({ 
//         endTime: now,
//         point: 'Approved by DDD',
//         details: {
//           ddd_comment: dddComments,
//           status: 'FORWARDED_TO_DIRECTOR'
//         } as any
//       })
//       .where(and(
//         eq(qmsTimelines.applicationId, applicationId),
//         eq(qmsTimelines.division, division.toUpperCase()),
//         isNull(qmsTimelines.endTime)
//       ));

//     // 2. Start the Director's Action Row
//     // Note: The Director's clock often runs on a different SOP limit (e.g. 5 days)
//     await db.insert(qmsTimelines).values({
//       applicationId,
//       division: 'DIRECTORATE',
//       staffId: 'DIRECTOR_ID', // Replace with Director's actual ID later
//       point: 'Director Final Review',
//       startTime: now,
//       details: {
//         originating_division: division,
//         division_comments: dddComments
//       } as any
//     });

//     // 3. Revalidate the dashboards
//     revalidatePath(`/dashboard/ddd`);
//     revalidatePath(`/dashboard/director`);
//     revalidatePath(`/dashboard/lod`); // So LOD sees the move

//     return { success: true };
//   } catch (error) {
//     console.error("Approval Error:", error);
//     return { success: false, error: "Failed to move to Director." };
//   }
// }

"use server"

import { db } from "@/db";
import { qmsTimelines } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * PATH A: DDD Assigns to Staff (The Initial Handoff)
 * This stops the DDD's 'Arrival' clock and starts the Staff's 'Review' clock.
 */
export async function assignToStaff(applicationId: number, staffId: string, division: string) {
  try {
    const now = new Date();

    // 1. Close the DDD's "Pending Assignment" segment
    await db.update(qmsTimelines)
      .set({ 
        endTime: now,
        point: 'Assigned to Staff' 
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.division, division.toUpperCase()),
        isNull(qmsTimelines.endTime)
      ));

    // 2. Start the Staff's "Technical Review" segment
    await db.insert(qmsTimelines).values({
      applicationId,
      division: division.toUpperCase(),
      staffId: staffId, 
      point: 'Technical Review',
      startTime: now,
      details: { iteration: 1 } as any
    });

    revalidatePath('/dashboard/ddd');
    revalidatePath(`/dashboard/${division.toLowerCase()}`);
    
    return { success: true };
  } catch (error) {
    console.error("Assignment Error:", error);
    return { success: false };
  }
}

/**
 * PATH B: DDD Approves to Director
 * This stops the Division's involvement and starts the Directorate's Master Clock.
 */
export async function approveToDirector(
  applicationId: number,
  division: string,
  dddComments: string
) {
  try {
    const now = new Date();

    // 1. Close the DDD's active validation row
    await db.update(qmsTimelines)
      .set({ 
        endTime: now,
        point: 'Approved by DDD',
        details: {
          ddd_comment: dddComments,
          status: 'FORWARDED_TO_DIRECTOR'
        } as any
      })
      .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.division, division.toUpperCase()),
        isNull(qmsTimelines.endTime)
      ));

    // 2. Start the Director's Action Row
    await db.insert(qmsTimelines).values({
      applicationId,
      division: 'DIRECTORATE',
      staffId: 'DIRECTOR_ID', 
      point: 'Director Final Review',
      startTime: now,
      details: {
        originating_division: division,
        division_comments: dddComments
      } as any
    });

    revalidatePath(`/dashboard/ddd`);
    revalidatePath(`/dashboard/director`);
    revalidatePath(`/dashboard/lod`); 

    return { success: true };
  } catch (error) {
    console.error("Approval Error:", error);
    return { success: false };
  }
}