"use server"

import { db } from "@/db";
import { 
  companies, companyAffiliations, productLines, 
  products, applications, qmsTimelines, riskAssessments, users 
} from "@/db/schema";
import { and, eq, isNull, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { lodFormSchema } from "@/lib/validations";

const RISK_CATEGORIES: Record<string, { complexity: number, criticality: number }> = {
  "VACCINES / BIOLOGICALS": { complexity: 3, criticality: 3 },
  "STERILE INJECTABLES": { complexity: 3, criticality: 2 },
  "POWDER BETA-LACTAMS": { complexity: 2, criticality: 3 },
  "TABLETS (GENERAL)": { complexity: 1, criticality: 2 },
  "MULTIVITAMINS": { complexity: 1, criticality: 1 },
};

const normalize = (str: string) => str?.trim().toUpperCase() || "";

export async function submitLODApplication(
  rawData: any, 
  userId: string, 
  userName: string, 
  userRole: string
) {
  const validated = lodFormSchema.safeParse(rawData);
  if (!validated.success) return { success: false, error: "Validation Failed" };

  const data = validated.data;
  const normalizedAppNumber = normalize(data.appNumber);

  try {
    return await db.transaction(async (tx) => {
      // 1. Context Fetching
      const existingApp = await tx.query.applications.findFirst({
        where: eq(applications.applicationNumber, normalizedAppNumber)
      });
      
      const submittingUser = await tx.query.users.findFirst({
        where: eq(users.id, userId)
      });

      const isUpdate = !!existingApp;
      const userDivision = submittingUser?.division || "LOD";
      
      // Determine if this is a Round 2 (Compliance) update or Pass 1
      const isActuallyRound2 = isUpdate && (existingApp.status === 'TECHNICAL_PASSED' || existingApp.isComplianceReview === true);

      // 2. Upsert Companies
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

      await tx.insert(companyAffiliations).values({ 
        localCompanyId: localComp.id, 
        foreignFactoryId: foreignFact.id 
      }).onConflictDoNothing();

      // 3. Products & Intrinsic Risk Calculation
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
        const [lineRec] = await tx.insert(productLines)
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

      // 4. Update Details & Comments
      const existingDetails = (existingApp?.details as any) || {};
      const newComment = {
        from: userName,
        role: userRole,
        text: data.lodRemarks || (isUpdate ? "Technical details updated." : "Application initiated."),
        round: isActuallyRound2 ? 2 : 1,
        action: isActuallyRound2 ? "COMPLIANCE_DATA_UPDATE" : "INTAKE_DIRECTIVE",
        timestamp: new Date().toISOString()
      };

      const enhancedDetails = {
        ...data,
        comments: [...(existingDetails.comments || []), newComment],
        isComplianceReview: isActuallyRound2 
      };

      let appId = existingApp?.id;

      if (isUpdate) {
        await tx.update(applications)
          .set({
            status: isActuallyRound2 ? 'PENDING_DIRECTOR_FINAL' : 'PENDING_DIRECTOR',
            currentPoint: 'Director Review',
            details: enhancedDetails,
            type: data.type,
            updatedAt: sql`now()`
          })
          .where(eq(applications.id, existingApp.id));

        await tx.update(qmsTimelines)
          .set({ endTime: sql`now()` })
          .where(and(eq(qmsTimelines.applicationId, existingApp.id), isNull(qmsTimelines.endTime)));

        await tx.insert(qmsTimelines).values({
          applicationId: existingApp.id,
          division: userDivision as any, 
          point: 'Director Review',
          startTime: sql`now()`
        });
      } else {
        const [newApp] = await tx.insert(applications).values({
          applicationNumber: normalizedAppNumber,
          type: data.type,
          companyId: localComp.id,
          foreignFactoryId: foreignFact.id,
          status: 'PENDING_DIRECTOR',
          currentPoint: 'Director Review',
          details: enhancedDetails
        }).returning();
        appId = newApp.id;
      }

      // 5. Risk Assessment Upsert (Strictly Intrinsic in Pass 1)
      const score = maxComp * maxCrit;
      const level = score <= 2 ? "Low" : score <= 4 ? "Medium" : "High";

      await tx.insert(riskAssessments)
        .values({
          facilityId: foreignFact.id,
          applicationId: appId,
          complexityScore: maxComp,
          criticalityScore: maxCrit,
          intrinsicLevel: level,
          status: isActuallyRound2 ? 'DRAFT' : 'PARTIAL'
        })
        .onConflictDoUpdate({
          target: [riskAssessments.applicationId],
          set: {
            complexityScore: maxComp,
            criticalityScore: maxCrit,
            intrinsicLevel: level,
            updatedAt: sql`now()`
          }
        });

      revalidatePath("/dashboard/director");
      return { success: true, id: appId };
    });
  } catch (e: any) {
    console.error("LOD Submission Error:", e);
    return { success: false, error: e.message };
  }
}