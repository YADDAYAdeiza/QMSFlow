"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines, users } from "@/db/schema";
import { eq, and, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitLODApplication(data: any) {
  try {
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

      const dbNow = sql`now()`;

      // 2. Create Application with Unique Point
      const [newApp] = await tx.insert(applications).values({
        applicationNumber: data.appNumber,
        type: data.type,
        companyId: company.id,
        status: 'PENDING_DIRECTOR',
        // ✅ UPDATE: Matches Point 2 in our Workflow Map
        currentPoint: 'Director Review', 
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
            timestamp: new Date().toISOString() 
          }]
        }
      }).returning();

      // 3. START THE QMS CLOCK
      // We attribute the start of the "Director Review" period to this app
      await tx.insert(qmsTimelines).values({
        applicationId: newApp.id,
        staffId: "LOD_OFFICER", 
        division: "LOD",
        // ✅ UPDATE: Clock is now tracking the "Director Review" phase
        point: 'Director Review', 
        startTime: dbNow,
      });

      revalidatePath("/");
      revalidatePath("/dashboard/applications");
      revalidatePath("/dashboard/director"); // Added to ensure Director's inbox refreshes

      return { success: true, id: newApp.id };
    });
  } catch (error) {
    console.error("QMS Submission Error:", error);
    return { success: false, error: "Failed to register application in QMS" };
  }
}