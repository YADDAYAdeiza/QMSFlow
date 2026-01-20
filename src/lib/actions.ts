"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";


export async function submitLODApplication(data: any) {
  try {
    // We keep the transaction for safety—it ensures the App and the Clock start together
    return await db.transaction(async (tx) => {
      
      // 1. Company Logic
      let company = await tx.query.companies.findFirst({
        where: eq(companies.name, data.companyName),
      });

      if (!company) {
        const [newComp] = await tx.insert(companies).values({
          name: data.companyName,
          address: data.companyAddress || "",
        }).returning();
        company = newComp;
      }

      // 2. Define the Database Clock once for both entries
      const dbNow = sql`now()`;

      // 3. Create Application (Standard JavaScript Object Style)
      const [newApp] = await tx.insert(applications).values({
        applicationNumber: data.appNumber,
        type: data.type,
        companyId: company.id,
        status: 'PENDING_DIRECTOR',
        currentPoint: 'Director',
        details: {
          factory_name: data.facilityName || data.companyName,
          factory_address: data.companyAddress || "",
          products: [data.productCategory || "Product under review"],
          poaUrl: data.poaUrl || "",
          inspectionReportUrl: data.inspectionReportUrl || "",
          assignedDivisions: data.divisions || [],
          comments: [{
            from: "LOD",
            role: "LOD",
            text: data.initialComment || "Application Received",
            // This is just a string for the JSON, the REAL clock is in the next step
            timestamp: new Date().toISOString() 
          }]
        }
      }).returning();

      // 4. START THE QMS CLOCK (The "Perfectionist" Audit Fix)
      await tx.insert(qmsTimelines).values({
        applicationId: newApp.id,
        staffId: "LOD_OFFICER", 
        division: "LOD",
        point: 'Director',
        startTime: dbNow, // ✅ Uses sql`now()` - Database Source of Truth
      });

      revalidatePath("/");
      revalidatePath("/dashboard/applications");

      return { success: true, id: newApp.id };
    });
  } catch (error) {
    console.error("QMS Submission Error:", error);
    return { success: false, error: "Failed to register application in QMS" };
  }
}


export async function returnToStaff(appId: number, rejectionReason: string, staffId: string) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;
      const app = await tx.query.applications.findFirst({ where: eq(applications.id, appId) });
      if (!app) throw new Error("App not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 1. Determine Current Round (Stay in current round for a rework)
      const currentRound = oldComments[oldComments.length - 1]?.round || 1;
      const lastRound = oldComments[oldComments.length - 1]?.round || 1;
      
      // 2. Create the Unified Rejection Entry
      const rejectionEntry = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        text: rejectionReason,
        timestamp: new Date().toISOString(),
        round: lastRound + 1, // ✅ Correctly triggers the new round
        action: "RETURNED_FOR_REWORK",
        assigned_to_id: staffId 
      };

      const updatedDetails = {
        ...oldDetails,
        staff_reviewer_id: staffId, // Update the primary reviewer pointer
        comments: [...oldComments, rejectionEntry] // Append to the Unified Trail
      };

      // 3. Update Application Table
      await tx.update(applications)
        .set({
          currentPoint: 'Technical Review',
          status: 'PENDING_REWORK',
          details: updatedDetails,
        })
        .where(eq(applications.id, appId));

      // 4. QMS: Close DDD Clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          eq(qmsTimelines.point, 'Divisional Deputy Director'), // Be specific
          isNull(qmsTimelines.endTime)
        ));

      // 5. QMS: Open Staff Clock 
      const targetDivision = (oldDetails.assignedDivisions?.[0]) || "VMD";

      await tx.insert(qmsTimelines).values({ 
        applicationId: appId, 
        point: 'Technical Review', 
        staffId: staffId, 
        division: targetDivision.toUpperCase(), 
        startTime: dbNow 
      });

      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/ddd/review/${appId}`);
      
      return { success: true };
    });
  } catch (error) {
    console.error("REWORK_ERROR:", error);
    return { success: false };
  }
}