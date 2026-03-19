"use server"

import { db } from "@/db"; // Your Drizzle instance
import { companies, riskAssessments, applications } from "@/db/schema";
import { eq, desc, and, isNotNull, sql } from "drizzle-orm";

export async function getRiskInventory() {
  try {
    const inventory = await db.select({
      id: riskAssessments.id,
      facilityName: companies.name,
      facilityId: companies.id,
      appNumber: applications.applicationNumber,
      intrinsicLevel: riskAssessments.intrinsicLevel, // Pass 1 result
      complianceLevel: riskAssessments.complianceLevel, // Pass 2 result
      orr: riskAssessments.overallRiskRating, // The 'A', 'B', 'C'
      status: riskAssessments.status, // 'PARTIAL' | 'FINALIZED'
      nextInspection: riskAssessments.nextInspectionDate,
      updatedAt: riskAssessments.updatedAt,
    })
    .from(riskAssessments)
    .innerJoin(companies, eq(riskAssessments.facilityId, companies.id))
    .leftJoin(applications, eq(riskAssessments.applicationId, applications.id))
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