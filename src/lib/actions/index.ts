"use server"

import { db } from "@/db";
import { 
  companies, companyAffiliations, productLines, 
  products, applications, qmsTimelines, riskAssessments 
} from "@/db/schema";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lodFormSchema } from "@/lib/validations";

const RISK_CATEGORIES: Record<string, { complexity: number, criticality: number }> = {
  "VACCINES / BIOLOGICALS": { complexity: 3, criticality: 3 },
  "STERILE INJECTABLES": { complexity: 3, criticality: 2 },
  "POWDER BETA-LATAMS": { complexity: 2, criticality: 3 },
  "TABLETS (GENERAL)": { complexity: 1, criticality: 2 },
  "MULTIVITAMINS": { complexity: 1, criticality: 1 },
};

const normalize = (str: string) => str?.trim().toUpperCase() || "";

export async function submitLODApplication(rawData: any) {
  const validated = lodFormSchema.safeParse(rawData);
  if (!validated.success) return { success: false, error: "Validation Failed" };

  const data = validated.data;
  const normalizedAppNumber = normalize(data.appNumber);

  try {
    const existingApp = await db.query.applications.findFirst({
      where: eq(applications.applicationNumber, normalizedAppNumber)
    });

    if (existingApp) return { success: false, error: `App Number "${normalizedAppNumber}" exists.` };

    return await db.transaction(async (tx) => {
      // 1. Handle Companies
      const upsertCompany = async (name: string, address: string, category: 'LOCAL' | 'FOREIGN') => {
        const cleanName = normalize(name);
        const existing = await tx.query.companies.findFirst({
          where: and(eq(companies.name, cleanName), eq(companies.category, category))
        });
        if (existing) return existing;
        const [inserted] = await tx.insert(companies).values({ name: cleanName, address, category }).returning();
        return inserted;
      };

      const localComp = await upsertCompany(data.companyName, data.companyAddress, 'LOCAL');
      const foreignFact = await upsertCompany(data.facilityName, data.facilityAddress, 'FOREIGN');

      // 2. Links & Products
      await tx.insert(companyAffiliations).values({ localCompanyId: localComp.id, foreignFactoryId: foreignFact.id }).onConflictDoNothing();

      let maxComp = 1;
      let maxCrit = 1;

      for (const lineEntry of data.productLines) {
        const categoryKey = normalize(lineEntry.riskCategory);
        const risk = RISK_CATEGORIES[categoryKey];
        
        if (risk) {
          maxComp = Math.max(maxComp, risk.complexity);
          maxCrit = Math.max(maxCrit, risk.criticality);
        }

        const cleanLineName = normalize(lineEntry.lineName);
        let [lineRec] = await tx.insert(productLines)
          .values({ companyId: foreignFact.id, name: cleanLineName })
          .onConflictDoUpdate({ 
            target: [productLines.companyId, productLines.name], 
            set: { name: cleanLineName } 
          })
          .returning();

        if (lineEntry.products) {
          for (const prod of lineEntry.products) {
            await tx.insert(products).values({ 
              lineId: lineRec.id, 
              name: normalize(prod.name) 
            }).onConflictDoNothing();
          }
        }
      }

      // --- NEW LOGIC: UNIFY LOD REMARKS INTO THE COMMENTS ARRAY ---
      // We take the lodRemarks and transform it into the first formal audit entry.
      const initialComment = {
        from: "LOD INTAKE",
        role: "Director General / Director",
        text: data.lodRemarks || "Application submitted via LOD.",
        round: 1,
        action: "INTAKE_DIRECTIVE",
        timestamp: new Date().toISOString()
      };

      // Prepare the details object with the unified comments array
      const enhancedDetails = {
        ...data,
        comments: [initialComment] // This starts the trail
      };

      // 3. Create Application with enhancedDetails
      const [newApp] = await tx.insert(applications).values({
        applicationNumber: normalizedAppNumber,
        type: data.type,
        companyId: localComp.id,
        foreignFactoryId: foreignFact.id,
        status: 'PENDING_DIRECTOR',
        currentPoint: 'Director Review',
        details: enhancedDetails // Unified array is now inside details
      }).returning();

      // 4. Create Pass 1 Risk Assessment (Inherent Risk)
      const score = maxComp * maxCrit;
      const level = score <= 2 ? "Low" : score <= 4 ? "Medium" : "High";

      await tx.insert(riskAssessments).values({
        facilityId: foreignFact.id,
        applicationId: newApp.id,
        complexityScore: maxComp,
        criticalityScore: maxCrit,
        intrinsicLevel: level,
        status: 'PARTIAL'
      });

      // 5. Audit/Timeline
      await tx.insert(qmsTimelines).values({ 
        applicationId: newApp.id, 
        division: "LOD", 
        point: 'Director Review' 
      });

      revalidatePath("/dashboard/lod");
      return { success: true, id: newApp.id };
    });
  } catch (e: any) {
    return { success: false, error: e.message };
  }
}