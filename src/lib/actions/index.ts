"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitLODApplication(data: any) {
  try {
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

    const flattenedProducts = data.productLines?.map((pl: any) => 
      `${pl.lineName}${pl.products ? ': ' + pl.products : ''}`
    ) || [];

    const [newApp] = await db.insert(applications).values({
      applicationNumber: data.appNumber,
      type: data.type, 
      companyId: company.id,
      status: 'PENDING_DIRECTOR',
      currentPoint: 'Director Review', 
      details: {
        factory_name: data.facilityName || data.companyName,
        factory_address: data.facilityAddress || data.companyAddress,
        products: flattenedProducts.length > 0 ? flattenedProducts : ["Product list not provided"],
        poaUrl: data.poaUrl || "",
        inspectionReportUrl: data.inspectionReportUrl || "",
        notificationEmail: data.notificationEmail,
        // The divisions suggested by LOD
        assignedDivisions: data.divisions, 
        // We set the first one as the primary 'division' key for the review page
        division: data.divisions[0],
        riskProfile: {
          hasOAI: data.hasOAI,
          maturity: data.lastInspected,
          failedSystems: data.failedSystems
        },
        comments: [{
          from: "LOD",
          role: "LOD",
          text: data.lodRemarks || "Application logged and routed for review.",
          timestamp: new Date().toISOString(),
          round: 1,
          action: "INITIAL_INTAKE",
          division: "LOD"
        }]
      }
    }).returning();

    await db.insert(qmsTimelines).values({
      applicationId: newApp.id,
      staffId: "LOD_OFFICER",
      division: "LOD",
      point: 'Director Review', 
      startTime: sql`now()`,
    });

    revalidatePath("/dashboard/director");
    return { success: true, id: newApp.id };
  } catch (error: any) {
    console.error("QMS Submission Error:", error);
    return { success: false, error: error.message };
  }
}