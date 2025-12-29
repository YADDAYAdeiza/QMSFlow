"use server"

import {db} from "@/db";
import { companies, applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

export async function submitLODApplication(data: any) {
  // 1. Check/Create Company
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

  // 2. Insert Application
  await db.insert(applications).values({
    applicationNumber: data.appNumber,
    type: data.type,
    companyId: company.id,
    currentPoint: 'LOD',
    details: {
      inputs: {
        facilityName: data.facilityName,
        productCategory: data.productCategory,
        poaUrl: data.poaUrl,
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
  });
}