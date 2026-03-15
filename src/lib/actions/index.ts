"use server"

import { db } from "@/db";
import { 
  applications, companies, companyAffiliations, 
  productLines, products, qmsTimelines 
} from "@/db/schema";
import { eq, and, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

/**
 * Normalizes strings for database consistency:
 * 1. Trims whitespace
 * 2. Converts to Uppercase (Standard for Regulatory records)
 * 3. Collapses multiple spaces into one
 */
const normalize = (text: string) => {
  if (!text) return "";
  return text.trim().replace(/\s+/g, ' ').toUpperCase();
};

export async function submitLODApplication(data: any) {
  try {
    return await db.transaction(async (tx) => {
      
      // 1. NORMALIZATION HELPER FOR COMPANIES
      const upsertCompany = async (name: string, address: string, category: 'LOCAL' | 'FOREIGN') => {
        const cleanName = normalize(name);
        const cleanAddress = address?.trim() || "";

        // Check for existing company using the normalized name
        const existing = await tx.query.companies.findFirst({
          where: and(
            eq(companies.name, cleanName), 
            eq(companies.category, category)
          )
        });

        if (existing) return existing;

        const [inserted] = await tx.insert(companies).values({ 
          name: cleanName, 
          address: cleanAddress, 
          category 
        }).returning();
        
        return inserted;
      };

      const localComp = await upsertCompany(data.companyName, data.companyAddress, 'LOCAL');
      const foreignFact = await upsertCompany(data.facilityName, data.facilityAddress, 'FOREIGN');

      // 2. AFFILIATION LINK
      await tx.insert(companyAffiliations).values({
        localCompanyId: localComp.id,
        foreignFactoryId: foreignFact.id,
      }).onConflictDoNothing();

      // 3. NORMALIZED PRODUCT LINES & PRODUCTS
      if (data.productLines && data.productLines.length > 0) {
        for (const lineEntry of data.productLines) {
          const cleanLineName = normalize(lineEntry.lineName);
          if (!cleanLineName) continue;

          let lineRecord = await tx.query.productLines.findFirst({
            where: and(
              eq(productLines.companyId, foreignFact.id), 
              eq(productLines.name, cleanLineName)
            )
          });

          if (!lineRecord) {
            [lineRecord] = await tx.insert(productLines).values({
              companyId: foreignFact.id,
              name: cleanLineName
            }).returning();
          }

          if (lineEntry.products && Array.isArray(lineEntry.products)) {
            for (const prod of lineEntry.products) {
              const cleanProdName = normalize(prod.name);
              if (cleanProdName) {
                await tx.insert(products).values({
                  lineId: lineRecord.id,
                  name: cleanProdName
                }).onConflictDoNothing();
              }
            }
          }
        }
      }

      // 4. CREATE DOSSIER (With Snapshot)
      const [newApp] = await tx.insert(applications).values({
        applicationNumber: normalize(data.appNumber),
        type: data.type,
        companyId: localComp.id,
        foreignFactoryId: foreignFact.id,
        status: 'PENDING_DIRECTOR',
        currentPoint: 'Director Review',
        details: {
          assignedDivisions: data.divisions,
          // We store the user's raw input in the snapshot for the audit trail
          productLines: data.productLines, 
          lodRemarks: data.lodRemarks,
          notificationEmail: data.notificationEmail?.toLowerCase().trim(),
          poaUrl: data.poaUrl || "",
          inspectionReportUrl: data.inspectionReportUrl || "",
          comments: [{
            from: "LOD",
            role: "LOD",
            text: data.lodRemarks || "Application logged.",
            timestamp: new Date().toISOString()
          }]
        }
      }).returning();

      // 5. QMS TIMELINE
      await tx.insert(qmsTimelines).values({
        applicationId: newApp.id,
        staffId: "LOD_OFFICER", // Replace with auth session in production
        division: "LOD",
        point: 'Director Review',
        startTime: sql`now()`,
      });

      revalidatePath("/dashboard/director");
      return { success: true, id: newApp.id };
    });
  } catch (error: any) {
    console.error("Submission Error:", error);
    return { success: false, error: error.message };
  }
}