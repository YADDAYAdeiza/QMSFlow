"use server"

import { db } from "@/db"; // Your Drizzle instance
import { companies, riskAssessments, applications } from "@/db/schema";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";

export async function getRiskInventory() {
  try {
    const inventory = await db.select({
      id: riskAssessments.id,
      applicationId: riskAssessments.applicationId,
      facilityName: companies.name,
      facilityId: companies.id,
      appNumber: applications.applicationNumber,
      intrinsicLevel: riskAssessments.intrinsicLevel,
      complianceLevel: riskAssessments.complianceLevel,
      orr: riskAssessments.overallRiskRating,
      status: riskAssessments.status, // Risk assessment lifecycle (PARTIAL/FINALIZED)
      applicationStatus: applications.status, // The actual workflow status (CLEARED/REJECTED etc)
      nextInspection: riskAssessments.nextInspectionDate,
      updatedAt: riskAssessments.updatedAt,
    })
    .from(riskAssessments)
    .innerJoin(companies, eq(riskAssessments.facilityId, companies.id))
    .innerJoin(applications, eq(riskAssessments.applicationId, applications.id)) // Changed to innerJoin for strictness
    .where(eq(applications.status, 'CLEARED')) // <--- THE FIX: Only show fully processed Pass 1 apps
    .orderBy(desc(riskAssessments.updatedAt));

    return { success: true, data: inventory };
  } catch (error) {
    console.error("Failed to fetch risk inventory:", error);
    return { success: false, error: "Could not retrieve risk data." };
  }
}
// lib/actions/risk.ts
// import { db } from "@/db";
// import { riskAssessments, companies } from "@/db/schema";
// import { eq, and, isNotNull, sql } from "drizzle-orm";

export async function getInspectionDeadlines() {
  console.log('--- STARTING DEADLINE FETCH ---');
  try {
    const results = await db
      .select({
        id: riskAssessments.id,
        companyName: companies.name,
        expiryDate: riskAssessments.nextInspectionDate,
        category: companies.category,
      })
      .from(riskAssessments)
      .innerJoin(companies, eq(riskAssessments.facilityId, companies.id))
      .where(
        and(
          isNotNull(riskAssessments.nextInspectionDate),
          // Using sql lower() for case-insensitive matching
          sql`lower(${companies.category}) = 'foreign'`
        )
      )
      .orderBy(riskAssessments.nextInspectionDate);

    console.log('DATABASE RAW RESULTS:', results);

    if (results.length === 0) {
      // DEBUG: If empty, let's see if ANY companies are marked as foreign
      const anyForeign = await db.select().from(companies).where(sql`lower(${companies.category}) = 'foreign'`).limit(1);
      console.log('DEBUG: Any foreign companies in DB at all?', anyForeign);
      
      // DEBUG: Any risk assessments with dates at all?
      const anyDates = await db.select().from(riskAssessments).where(isNotNull(riskAssessments.nextInspectionDate)).limit(1);
      console.log('DEBUG: Any risk assessments with dates at all?', anyDates);
    }

    return results.map((res) => ({
      ...res,
      expiryDate: res.expiryDate ? new Date(res.expiryDate) : null,
    }));
  } catch (error) {
    console.error("CRITICAL ERROR in getInspectionDeadlines:", error);
    return [];
  }
}

export async function getApplicationForEditing(id: number) {
  try {
    const app = await db.query.applications.findFirst({
      where: eq(applications.id, id),
      with: {
        localApplicant: true,
        foreignFactory: true,
      },
    });

    if (!app) return { success: false, error: "Application not found" };

    // We return a flat object that matches the form's schema exactly
    return {
      success: true,
      data: {
        id: app.id,
        appNumber: app.applicationNumber || "",
        type: app.type || "Facility Verification",
        companyName: app.localApplicant?.name || "",
        companyAddress: app.localApplicant?.address || "",
        notificationEmail: (app.details as any)?.notificationEmail || "",
        facilityName: app.foreignFactory?.name || "",
        facilityAddress: app.foreignFactory?.address || "",
        // Pull directly from the flattened keys we created
        productLines: (app.details as any)?.productLines || [
          { lineName: "", riskCategory: "", products: [{ name: "" }] }
        ],
        divisions: (app.details as any)?.divisions || ["VMD"],
        poaUrl: (app.details as any)?.poaUrl || "",
        inspectionReportUrl: (app.details as any)?.inspectionReportUrl || "",
        lodRemarks: "", // Always start fresh for the new assessment
      }
    };
  } catch (error) {
    console.error("Fetch Error:", error);
    return { success: false, error: "Failed to fetch application data" };
  }
}