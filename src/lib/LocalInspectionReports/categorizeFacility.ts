"use server";

import { db } from "@/db";
import { facilities, productsLocal, productLinesLocal, applications, qmsTimelines } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { 
  getWorkflowStep 
} from "@/config/workflows/facilityVerificationWorkflow";

// ==========================================
// PIC/S Level Categorization Domain Types
// ==========================================
export type SterilityType = "Non-Sterile" | "Sterile (Terminal)" | "Sterile (Aseptic)";

export type HighRiskContainment = 
  | "None / Standard General Facility"
  | "Beta-Lactam / Penicillin"
  | "Cephalosporin"
  | "Cytotoxic / Highly Potent"
  | "Biological / Live Vaccine";

export interface ProductLineUpdateInput {
  lineId: string;
  sterilityLevel: SterilityType;
  containmentCategory: HighRiskContainment;
  isDedicatedLine: boolean;
}

export interface ProductUpdateInput {
  productId: string;
  classification: string;
  targetSpecies: string;
}

export interface FacilityCategorizationPayload {
  applicationId: number;
  facilityId: string;
  userId: string;
  directorate?: string; // Defaults to "VMAP"
  productLines: ProductLineUpdateInput[];
  products: ProductUpdateInput[];
}

// ==========================================
// Server Action
// ==========================================
export async function submitFacilityCategorization({
  applicationId,
  facilityId,
  userId,
  directorate = "VMAP",
  productLines,
  products,
}: FacilityCategorizationPayload) {
  try {
    const currentStepKey = "DDD_TECHNICAL_ASSIGNMENT";
    const currentStep = getWorkflowStep(directorate, currentStepKey);

    if (!currentStep || !currentStep.nextStepKey) {
      throw new Error(`Invalid workflow step or missing nextStepKey for ${currentStepKey}`);
    }

    const nextStepKey = currentStep.nextStepKey;
    const nextStep = getWorkflowStep(directorate, nextStepKey);

    if (!nextStep) {
      throw new Error(`Target workflow step ${nextStepKey} not found`);
    }

    const now = new Date();

    // 1. Update PIC/S categorization attributes on Product Lines
    for (const line of productLines) {
      await db
        .update(productLinesLocal)
        .set({
          sterilityLevel: line.sterilityLevel,
          containmentCategory: line.containmentCategory,
          isDedicatedLine: line.isDedicatedLine,
          updatedAt: now,
        })
        .where(eq(productLinesLocal.id, line.lineId));
    }

    // 2. Update Product classifications and mark as VMD Approved
    for (const prod of products) {
      await db
        .update(productsLocal)
        .set({
          classification: prod.classification,
          targetSpecies: prod.targetSpecies,
          vmdApproved: true,
          updatedAt: now,
        })
        .where(eq(productsLocal.id, prod.productId));
    }

    // 3. Mark facility as categorized
    await db
      .update(facilities)
      .set({
        isCategorized: true,
        categorizedBy: userId,
        categorizedAt: now,
        updatedAt: now,
      })
      .where(eq(facilities.id, facilityId));

    // 4. Close QMS timeline for current point ("DDD_TECHNICAL_ASSIGNMENT")
    await db
      .update(qmsTimelines)
      .set({ endTime: now })
      .where(
        and(
          eq(qmsTimelines.applicationId, applicationId),
          eq(qmsTimelines.point, currentStepKey)
        )
      );

    // 5. Advance application currentPoint to "STAFF_TECHNICAL_REVIEW"
    await db
      .update(applications)
      .set({
        currentPoint: nextStepKey,
        updatedAt: now,
      })
      .where(eq(applications.id, applicationId));

    // 6. Start new QMS timeline step for next point ("STAFF_TECHNICAL_REVIEW")
    await db.insert(qmsTimelines).values({
      applicationId,
      staffId: userId,
      division: nextStep.division ?? "VMD",
      point: nextStepKey,
      startTime: now,
    });

    revalidatePath("/inspector-inbox");
    return { success: true };
  } catch (error: any) {
    console.error("Failed to process facility categorization:", error);
    return { success: false, error: error?.message || "Categorization failed to save." };
  }
}