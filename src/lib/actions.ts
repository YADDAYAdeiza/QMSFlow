"use server"

import { db } from "@/db";
import { applications, companies, qmsTimelines } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function submitLODApplication(data: any) {
  // 1. Company Logic (Existing)
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
  const [newApp] = await db.insert(applications).values({
    applicationNumber: data.appNumber,
    type: data.type,
    companyId: company.id,
    currentPoint: 'Director', // Moving it forward
    details: {
      inputs: {
        facilityName: data.facilityName,
        productCategory: data.productCategory,
        poaUrl: data.poaUrl, // Now a real URL from the uploader
        inspectionReportUrl: data.inspectionReportUrl
      },
      assignedDivisions: data.divisions,
      comments: [{
        from: "LOD",
        role: "LOD",
        text: data.initialComment,
        timestamp: new Date().toISOString()
      }]
    }
  }).returning();

  // 3. START THE QMS CLOCK
  // This records that the dossier is now sitting with the Director
  await db.insert(qmsTimelines).values({
    applicationId: newApp.id,
    point: 'Director',
    startTime: new Date(),
  });
}