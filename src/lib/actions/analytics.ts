// lib/actions/analytics.ts
"use server";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { isNotNull, and, gte, lte } from "drizzle-orm";

export async function getGMPHealthReport(startDate?: Date, endDate?: Date) {
  // Default to the last 90 days if no dates are provided
  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const allApps = await db.query.applications.findMany({
    where: and(
      isNotNull(applications.details),
      gte(applications.createdAt, start),
      lte(applications.createdAt, end)
    ),
    // Optimization: Only select the ID and details to reduce payload size
    columns: {
      id: true,
      details: true,
      createdAt: true
    }
  });

  const systemStats: Record<string, { critical: number; major: number; other: number; total: number }> = {
    "Quality System": { critical: 0, major: 0, other: 0, total: 0 },
    "Facilities & Equipment System": { critical: 0, major: 0, other: 0, total: 0 },
    "Materials System": { critical: 0, major: 0, other: 0, total: 0 },
    "Production System": { critical: 0, major: 0, other: 0, total: 0 },
    "Packaging & Labeling System": { critical: 0, major: 0, other: 0, total: 0 },
    "Laboratory Control System": { critical: 0, major: 0, other: 0, total: 0 },
  };

  allApps.forEach(app => {
    const findings = (app.details as any)?.complianceRisk?.findings || [];
    findings.forEach((f: any) => {
      if (systemStats[f.system]) {
        const cat = f.classification.toLowerCase() as 'critical' | 'major' | 'other';
        systemStats[f.system][cat]++;
        systemStats[f.system].total++;
      }
    });
  });

  return systemStats;
}