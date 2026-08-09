// src/lib/LocalInspectionReports/analytics/inspectionAnalytics.ts

import { db } from "@/db";
import { inspectionObservationsAnalytics, localInspectionReports } from "@/db/schema";
import { sql, eq, and, gte, lte, SQL } from "drizzle-orm";

export interface AnalyticsFilterParams {
  timeframe?: string; // 'YTD', 'Q1', 'Q2', 'Q3', 'ALL'
  inspectionType?: string; // 'ALL', 'Pre-Production', 'Pre-Registration', etc.
}

/**
 * Helper to build dynamic SQL WHERE conditions based on timeframe and inspection type.
 */
function buildFilterConditions(filters?: AnalyticsFilterParams) {
  const conditions: SQL[] = [];

  if (!filters) return conditions;

  // 1. Filter by Inspection Type
  if (filters.inspectionType && filters.inspectionType !== "ALL") {
    conditions.push(eq(localInspectionReports.typeOfInspection, filters.inspectionType));
  }

  // 2. Filter by Timeframe / Period
  const currentYear = new Date().getFullYear();
  if (filters.timeframe === "YTD") {
    conditions.push(gte(localInspectionReports.createdAt, new Date(`${currentYear}-01-01`)));
  } else if (filters.timeframe === "Q1") {
    conditions.push(
      gte(localInspectionReports.createdAt, new Date(`${currentYear}-01-01`)),
      lte(localInspectionReports.createdAt, new Date(`${currentYear}-03-31T23:59:59`))
    );
  } else if (filters.timeframe === "Q2") {
    conditions.push(
      gte(localInspectionReports.createdAt, new Date(`${currentYear}-04-01`)),
      lte(localInspectionReports.createdAt, new Date(`${currentYear}-06-30T23:59:59`))
    );
  } else if (filters.timeframe === "Q3") {
    conditions.push(
      gte(localInspectionReports.createdAt, new Date(`${currentYear}-07-01`)),
      lte(localInspectionReports.createdAt, new Date(`${currentYear}-09-30T23:59:59`))
    );
  }

  return conditions;
}

/**
 * 1. Quality System Deficits Breakdown (Stacked Bar Chart)
 */
export async function getQualitySystemDeficits(filters?: AnalyticsFilterParams) {
  const conditions = buildFilterConditions(filters);

  let query = db
    .select({
      qualitySystem: inspectionObservationsAnalytics.qualitySystem,
      criticalCount: sql<number>`SUM(CASE WHEN ${inspectionObservationsAnalytics.severity} = 'CRITICAL' THEN 1 ELSE 0 END)::int`,
      majorCount: sql<number>`SUM(CASE WHEN ${inspectionObservationsAnalytics.severity} = 'MAJOR' THEN 1 ELSE 0 END)::int`,
      otherCount: sql<number>`SUM(CASE WHEN ${inspectionObservationsAnalytics.severity} = 'OTHER' THEN 1 ELSE 0 END)::int`,
      totalCount: sql<number>`COUNT(*)::int`,
    })
    .from(inspectionObservationsAnalytics)
    .innerJoin(
      localInspectionReports,
      eq(inspectionObservationsAnalytics.reportId, localInspectionReports.id)
    );

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const data = await query
    .groupBy(inspectionObservationsAnalytics.qualitySystem)
    .orderBy(sql`COUNT(*) DESC`); // Fixed: explicit aggregate expression prevents alias crash

  return data;
}

/**
 * 2. Primary Failure Root Cause Distribution (Donut Chart)
 */
export async function getRootCauseDistribution(filters?: AnalyticsFilterParams) {
  const conditions = buildFilterConditions(filters);

  let query = db
    .select({
      rootCauseCategory: sql<string>`COALESCE(${inspectionObservationsAnalytics.rootCauseCategory}, 'Uncategorized')`,
      count: sql<number>`COUNT(*)::int`,
      percentage: sql<number>`ROUND((COUNT(*)::numeric / NULLIF(SUM(COUNT(*)) OVER (), 0)) * 100, 1)::float`,
    })
    .from(inspectionObservationsAnalytics)
    .innerJoin(
      localInspectionReports,
      eq(inspectionObservationsAnalytics.reportId, localInspectionReports.id)
    );

  if (conditions.length > 0) {
    query = query.where(and(...conditions)) as typeof query;
  }

  const data = await query
    .groupBy(inspectionObservationsAnalytics.rootCauseCategory)
    .orderBy(sql`COUNT(*) DESC`);

  return data;
}

/**
 * 3. CAPA Resolution Velocity & Turnaround Metrics (Executive KPI Cards)
 */
export async function getCapaVelocityMetrics(filters?: AnalyticsFilterParams) {
  const conditions = buildFilterConditions(filters);

  // Require capaRequired = true
  conditions.push(eq(localInspectionReports.capaRequired, true));

  const [metrics] = await db
    .select({
      totalCapaRequired: sql<number>`COUNT(*)::int`,
      closedCapaCount: sql<number>`COUNT(${localInspectionReports.capaClosedAt})::int`,
      pendingCapaCount: sql<number>`COUNT(*) FILTER (WHERE ${localInspectionReports.capaClosedAt} IS NULL)::int`,
      
      // Velocity metrics (COALESCE to 0 if no closed CAPAs)
      avgTurnaroundDays: sql<number>`COALESCE(ROUND(AVG(${localInspectionReports.capaTurnaroundDays}), 1), 0)::float`,
      maxTurnaroundDays: sql<number>`COALESCE(MAX(${localInspectionReports.capaTurnaroundDays}), 0)::int`,
      
      // Compliance rate: Closed within statutory window
      within30DaysCount: sql<number>`COUNT(*) FILTER (WHERE ${localInspectionReports.capaTurnaroundDays} <= 30)::int`,
      compliance30DayRate: sql<number>`
        COALESCE(
          ROUND(
            (COUNT(*) FILTER (WHERE ${localInspectionReports.capaTurnaroundDays} <= 30)::numeric / 
            NULLIF(COUNT(${localInspectionReports.capaClosedAt}), 0)) * 100, 1
          ), 0
        )::float`,
    })
    .from(localInspectionReports)
    .where(and(...conditions));

  return metrics || {
    totalCapaRequired: 0,
    closedCapaCount: 0,
    pendingCapaCount: 0,
    avgTurnaroundDays: 0,
    maxTurnaroundDays: 0,
    within30DaysCount: 0,
    compliance30DayRate: 0,
  };
}