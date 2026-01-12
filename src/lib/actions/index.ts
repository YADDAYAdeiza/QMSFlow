"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitLODApplication(data: any) {
  try {
    // 1. Get/Create Company
    let company = await db.query.companies.findFirst({
      where: eq(companies.name, data.companyName),
    });

    if (!company) {
      const [newComp] = await db.insert(companies).values({
        name: data.companyName,
        address: data.companyAddress || "",
      }).returning();
      company = newComp;
    }

    // 2. We use sql`now()` for the QMS timing (The Source of Truth)
    const dbNow = sql`now()`; 

    // 3. Create Application (Standard JavaScript Style)
    const [newApp] = await db.insert(applications).values({
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
          // We use a regular string here for the JSON, 
          // but the timeline table will use the REAL clock.
          timestamp: new Date().toISOString() 
        }]
      }
    }).returning();

    // 4. START THE QMS CLOCK (This is what fixes the "Out of Order" bug)
    await db.insert(qmsTimelines).values({
      applicationId: newApp.id,
      staffId: "LOD_OFFICER",
      division: "LOD",
      point: 'Director',
      startTime: dbNow, // ✅ Uses the DB clock (sql`now()`)
    });

    revalidatePath("/");
    revalidatePath("/dashboard/applications");

    return { success: true, id: newApp.id };
  } catch (error) {
    console.error("QMS Submission Error:", error);
    return { success: false, error: "Submission failed" };
  }
}