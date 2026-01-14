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



export async function returnToStaff(
  appId: number, 
  rejectionReason: string, 
  newStaffId?: string 
) {
  try {
    return await db.transaction(async (tx) => {
      const dbNow = sql`now()`;

      // 1. Fetch the application
      const app = await tx.query.applications.findFirst({
        where: eq(applications.id, appId)
      });

      if (!app) throw new Error("Application not found");

      // THE "DEEP CLEAN" FIX: Parse the details explicitly.
      // This prevents Drizzle Proxy objects from corrupting the JSONB update.
      const oldDetails = JSON.parse(JSON.stringify(app.details || {}));
      
      // Determine who gets the rework
      const assignedStaff = newStaffId || oldDetails.staff_reviewer_id;
      
      // FIX: Ensure we respect the original division (VMD, PAD, etc.)
      const division = oldDetails.assignedDivisions?.[0] || 'VMD';

      // 2. Close the DDD's vetting segment
      await tx.update(qmsTimelines)
        .set({ 
          endTime: dbNow,
          comments: `REWORK INITIATED: ${rejectionReason}` 
        })
        .where(and(
          eq(qmsTimelines.applicationId, appId),
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 3. Update Application Status & Details
      // We explicitly re-construct the object to ensure no nested keys are lost
      const updatedDetails = {
        ...oldDetails,
        last_rejection_reason: rejectionReason,
        staff_reviewer_id: assignedStaff,
        // Bonus: Increment a rework counter for QMS metrics
        rework_count: (oldDetails.rework_count || 0) + 1 
      };

      await tx.update(applications)
        .set({ 
          currentPoint: 'Technical Review',
          status: 'PENDING_REWORK',
          details: updatedDetails 
        })
        .where(eq(applications.id, appId));

      // 4. Open the NEW segment for the Reviewer
      // IMPROVEMENT: Include the reason in the timeline comments so it's 
      // immediately visible in the staff's Audit Trail.
      await tx.insert(qmsTimelines).values({
        applicationId: appId,
        point: 'Technical Review',
        division: division.toUpperCase(),
        staffId: assignedStaff, 
        startTime: dbNow,
        comments: `Rework Required: ${rejectionReason}`
      });

      // Clear the cache so dashboards update instantly
      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/staff`);
      revalidatePath(`/dashboard/ddd/review/${appId}`);
      
      return { success: true };
    });
  } catch (error) {
    console.error("Return Path Error:", error);
    return { success: false, error: "Failed to return application" };
  }
}