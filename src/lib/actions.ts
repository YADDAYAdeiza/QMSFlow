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
      
      // 1. Fetch current application state
      const app = await tx.query.applications.findFirst({ 
        where: eq(applications.id, appId) 
      });
      if (!app) throw new Error("App not found");

      const oldDetails = (app.details as any) || {};
      const oldComments = oldDetails.comments || [];

      // 2. Logic for Round Progression
      // We increment the round because this is a formal "Return" cycle.
      const lastRound = oldDetails.currentRound || 1;
      const nextRound = lastRound + 1;
      
      // 3. Create the Unified Rejection Entry for the Audit Trail
      const rejectionEntry = {
        from: "Divisional Deputy Director",
        role: "Divisional Deputy Director",
        text: rejectionReason,
        timestamp: new Date().toISOString(),
        round: nextRound, 
        action: "RETURNED_FOR_REWORK",
        assigned_to_id: staffId // ✅ Keeping your requirement to track the target staff
      };

      // 4. Update the JSONB Details
      const updatedDetails = {
        ...oldDetails,
        currentRound: nextRound,      // ✅ Explicitly updating the top-level round
        staff_reviewer_id: staffId,   // ✅ Updating the pointer for the Technical Reviewer
        comments: [...oldComments, rejectionEntry] 
      };

      // 5. Update Application Table (Point & Status)
      await tx.update(applications)
        .set({
          currentPoint: 'Technical Review',
          status: 'PENDING_REWORK',
          details: updatedDetails,
          updatedAt: dbNow
        })
        .where(eq(applications.id, appId));

      // 6. QMS: Close Divisional Deputy Director Clock
      await tx.update(qmsTimelines)
        .set({ endTime: dbNow })
        .where(and(
          eq(qmsTimelines.applicationId, appId), 
          eq(qmsTimelines.point, 'Divisional Deputy Director'),
          isNull(qmsTimelines.endTime)
        ));

      // 7. QMS: Open Staff Clock for the designated Reviewer
      // We default to the first assigned division if not specified
      const targetDivision = (oldDetails.divisions?.[0]) || "VMD"; 

      await tx.insert(qmsTimelines).values({ 
        applicationId: appId, 
        point: 'Technical Review', 
        staffId: staffId, 
        division: targetDivision.toUpperCase(), 
        startTime: dbNow,
        details: { status: `Rework initiated by Divisional Deputy Director (Round ${nextRound})` }
      });

      // 8. Refresh the views
      revalidatePath(`/dashboard/ddd`);
      revalidatePath(`/dashboard/ddd/review/${appId}`);
      
      return { success: true };
    });
  } catch (error) {
    console.error("REWORK_ERROR:", error);
    return { success: false };
  }
}