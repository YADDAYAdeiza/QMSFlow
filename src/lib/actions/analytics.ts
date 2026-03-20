"use server";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { isNotNull, and, gte, lte } from "drizzle-orm";

// Define the exact system names used in your VMAP findings ledger
type GMPSystem = 
  | "Quality Management System"
  | "Facilities & Equipment System"
  | "Materials System"
  | "Production System"
  | "Packaging & Labeling System"
  | "Laboratory Control System";

interface SystemMetrics {
  critical: number;
  major: number;
  other: number;
  total: number;
}

export async function getGMPHealthReport(startDate?: Date, endDate?: Date) {
  const start = startDate || new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const end = endDate || new Date();

  const allApps = await db.query.applications.findMany({
    where: and(
      isNotNull(applications.details),
      gte(applications.createdAt, start),
      lte(applications.createdAt, end)
    ),
    columns: {
      id: true,
      details: true,
      createdAt: true
    }
  });

  // Initialize the stats object with explicit keys
  const systemStats: Record<GMPSystem, SystemMetrics> = {
    "Quality Management System": { critical: 0, major: 0, other: 0, total: 0 },
    "Facilities & Equipment System": { critical: 0, major: 0, other: 0, total: 0 },
    "Materials System": { critical: 0, major: 0, other: 0, total: 0 },
    "Production System": { critical: 0, major: 0, other: 0, total: 0 },
    "Packaging & Labeling System": { critical: 0, major: 0, other: 0, total: 0 },
    "Laboratory Control System": { critical: 0, major: 0, other: 0, total: 0 },
  };

  allApps.forEach(app => {
    const details = app.details as any;
    // Targeting findings_ledger based on your JSON schema
    const findings = details?.findings_ledger || [];

    findings.forEach((f: any) => {
      // 1. Cast f.system to our GMPSystem type to allow indexing
      const systemName = f.system as GMPSystem;

      // 2. Verify the system exists in our tracking object
      if (systemStats[systemName]) {
        // 3. Extract severity and normalize
        const rawSev = f.severity?.toLowerCase();
        
        // 4. Determine category and cast to the specific metric keys
        let cat: keyof SystemMetrics;
        
        if (rawSev === 'critical') {
          cat = 'critical';
        } else if (rawSev === 'major') {
          cat = 'major';
        } else {
          cat = 'other';
        }

        // 5. Update counts safely
        systemStats[systemName][cat]++;
        systemStats[systemName].total++;
      }
    });
  });

  return systemStats;
}