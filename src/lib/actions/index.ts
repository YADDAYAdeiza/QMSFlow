"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitLODApplication(data: any) {
  try {
    // 1. Company Logic: Get or Create
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

    // 2. PRODUCT MAPPING: Resolves the App 80 "Product under review" bug
    const flattenedProducts = data.productLines?.map((pl: any) => 
      `${pl.lineName}${pl.products ? ': ' + pl.products : ''}`
    ) || [];

    const dbNow = sql`now()`; 

    // 3. Create Application with Unique Point
    const [newApp] = await db.insert(applications).values({
      applicationNumber: data.appNumber,
      type: data.type, 
      companyId: company.id,
      status: 'PENDING_DIRECTOR',
      // ✅ UPDATE: Use unique point name for initial assignment
      currentPoint: 'Director Review', 
      details: {
        factory_name: data.facilityName || data.companyName,
        factory_address: data.facilityAddress || data.companyAddress,
        products: flattenedProducts.length > 0 ? flattenedProducts : ["Product list not provided"],
        poaUrl: data.poaUrl || "",
        inspectionReportUrl: data.inspectionReportUrl || "",
        notificationEmail: data.notificationEmail,
        assignedDivisions: data.divisions || ["VMD"], 
        riskProfile: {
          hasOAI: data.hasOAI,
          maturity: data.lastInspected,
          failedSystems: data.failedSystems
        },
        comments: [{
          from: "LOD",
          role: "LOD",
          text: "Application logged and routed for review.",
          timestamp: new Date().toISOString(),
          round: 1,
          action: "INITIAL_INTAKE"
        }]
      }
    }).returning();

    // 4. QMS Timing: Clock starts for the "Director Review" phase
    await db.insert(qmsTimelines).values({
      applicationId: newApp.id,
      staffId: "LOD_OFFICER",
      division: "LOD",
      // ✅ UPDATE: Aligned with Workflow State Map
      point: 'Director Review', 
      startTime: dbNow,
    });

    revalidatePath("/dashboard/applications");
    revalidatePath("/dashboard/director");

    return { success: true, id: newApp.id };
  } catch (error: any) {
    console.error("QMS Submission Error:", error);
    return { success: false, error: error.message };
  }
}