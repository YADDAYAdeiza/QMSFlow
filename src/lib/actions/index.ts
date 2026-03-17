"use server"

import { db } from "@/db";
import { companies, companyAffiliations, productLines, products, applications, qmsTimelines } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lodFormSchema } from "@/lib/validations";

/**
 * HELPER: Standardizes strings for database consistency
 */
const normalize = (str: string) => str?.trim().toUpperCase() || "";

export async function submitLODApplication(rawData: any) {
  // 0. VALIDATE INPUT
  const validated = lodFormSchema.safeParse(rawData);
  
  if (!validated.success) {
    return { 
      success: false, 
      error: "Validation Failed", 
      details: validated.error.flatten().fieldErrors 
    };
  }

  const data = validated.data;
  const normalizedAppNumber = normalize(data.appNumber);

  try {
    // 1. PRE-CHECK: Prevent Unique Constraint Violation (APP 159 error)
    const existingApp = await db.query.applications.findFirst({
      where: eq(applications.applicationNumber, normalizedAppNumber)
    });

    if (existingApp) {
      return { 
        success: false, 
        error: `Application Number "${normalizedAppNumber}" already exists in the registry.` 
      };
    }

    return await db.transaction(async (tx) => {
      
      // 2. NORMALIZATION HELPER FOR COMPANIES
      const upsertCompany = async (name: string, address: string, category: 'LOCAL' | 'FOREIGN') => {
        const cleanName = normalize(name);
        const cleanAddress = address?.trim() || "";

        const existing = await tx.query.companies.findFirst({
          where: and(
            eq(companies.name, cleanName), 
            eq(companies.category, category)
          )
        });

        if (existing) {
          // Update address if it was missing but is now provided
          if (!existing.address && cleanAddress) {
            await tx.update(companies)
              .set({ address: cleanAddress })
              .where(eq(companies.id, existing.id));
          }
          return existing;
        }

        const [inserted] = await tx.insert(companies).values({ 
          name: cleanName, 
          address: cleanAddress, 
          category 
        }).returning();
        
        return inserted;
      };

      const localComp = await upsertCompany(data.companyName, data.companyAddress, 'LOCAL');
      const foreignFact = await upsertCompany(data.facilityName, data.facilityAddress, 'FOREIGN');

      // 3. AFFILIATION LINK
      await tx.insert(companyAffiliations).values({
        localCompanyId: localComp.id,
        foreignFactoryId: foreignFact.id,
      }).onConflictDoNothing();

      // 4. NORMALIZED PRODUCT LINES & PRODUCTS
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

      // 5. CREATE APPLICATION (The Dossier)
      const [newApp] = await tx.insert(applications).values({
        applicationNumber: normalizedAppNumber,
        type: data.type,
        companyId: localComp.id,
        foreignFactoryId: foreignFact.id,
        status: 'PENDING_DIRECTOR',
        currentPoint: 'Director Review',
        details: {
          companyName: normalize(data.companyName),
          companyAddress: data.companyAddress?.trim() || "",
          facilityName: normalize(data.facilityName),
          facilityAddress: data.facilityAddress?.trim() || "",
          
          assignedDivisions: data.divisions,
          productLines: data.productLines, 
          lodRemarks: data.lodRemarks,
          notificationEmail: data.notificationEmail?.toLowerCase().trim(),
          poaUrl: data.poaUrl || "",
          inspectionReportUrl: data.inspectionReportUrl || "",
          comments: [{
            from: "LOD",
            role: "LOD Officer",
            text: data.lodRemarks || "Application logged and routed for Director Review.",
            timestamp: new Date().toISOString()
          }]
        }
      }).returning();

      // 6. QMS TIMELINE (Timing staff as per QMS requirements)
      await tx.insert(qmsTimelines).values({
        applicationId: newApp.id,
        staffId: "LOD_INTAKE_OFFICER", 
        division: "LOD",
        point: 'Director Review',
        startTime: new Date(),
      });

      revalidatePath("/dashboard/director");
      revalidatePath("/dashboard/lod");
      
      return { success: true, id: newApp.id };
    });
  } catch (error: any) {
    console.error("Critical Submission Error:", error);
    return { success: false, error: error.message || "An internal server error occurred" };
  }
}