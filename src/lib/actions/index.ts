"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, sql } from "drizzle-orm"; // Added sql
import { revalidatePath } from "next/cache"; // Added revalidatePath

export async function submitLODApplication(data: any) {
  try {
    // 1. Company Logic (Ensure the company exists in a structured table)
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

    // 2. Create Application
    // Note: We use the JSONB 'details' field for evolving data as per your instructions
    const [newApp] = await db.insert(applications).values({
      applicationNumber: data.appNumber,
      type: data.type,
      companyId: company.id,
      status: 'PENDING_DIRECTOR', // Setting a clear initial status
      currentPoint: 'Director', 
      details: {
        factory_name: data.facilityName, // Aligning keys with your PDF generator
        factory_address: data.companyAddress, 
        products: [data.productCategory || "Product under review"],
        poaUrl: data.poaUrl,
        inspectionReportUrl: data.inspectionReportUrl,
        assignedDivisions: data.divisions,
        comments: [{
          from: "LOD",
          role: "LOD",
          text: data.initialComment,
          timestamp: new Date().toISOString()
        }]
      }
    }).returning();

    // 3. START THE QMS CLOCK (The Critical Step)
    // We use sql`now()` to bypass your local computer's clock and use DB time
    await db.insert(qmsTimelines).values({
      applicationId: newApp.id,
      staffId: "LOD_OFFICER", // Or dynamic if you have auth
      division: "LOD",
      point: 'Director',
      startTime: sql`now()`, 
    });

    // 4. Refresh the data for all viewers
    revalidatePath("/");
    revalidatePath("/dashboard/applications");

    return { success: true, id: newApp.id };
  } catch (error) {
    console.error("QMS Submission Error:", error);
    throw new Error("Failed to register application in QMS");
  }
}