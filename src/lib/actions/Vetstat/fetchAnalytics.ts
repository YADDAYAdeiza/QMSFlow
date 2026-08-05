// lib/actions/Vetstat/fetchAnalytics.ts
'use server'

import { createClient } from '@/utils/supabase/server';

export interface SubstanceMetric {
  substance: string;
  class: string;
  riskPriority: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  volume: number;
}

export interface ZoneMetric {
  zone: string;
  value: number;
  prevValue: number;
  trend: number;
  states: Array<{ name: string; value: number }>;
}

// Convert parameters to a clean, structured interface for easier page/filter invocations
export interface FetchAnalyticsParams {
  startDate?: string;
  endDate?: string;
  species?: string;
  risk?: string;
}

export async function getAMSRegionalAnalytics({
  startDate,
  endDate,
  species = 'All',
  risk = 'All'
}: FetchAnalyticsParams = {}) {
  const startTimer = performance.now();
  const supabase = await createClient();
  
  const currentStart = startDate || '2026-01-01';
  const currentEnd = endDate || new Date().toISOString();

  // Calculate matching historical window duration for tracking trends
  const duration = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
  const prevStart = new Date(new Date(currentStart).getTime() - duration).toISOString();
  const prevEnd = currentStart;

  // Execute both analytical queries simultaneously to boost performance
  // Parameters are now correctly mapped to the parameters declared above
  const [currentReq, prevReq] = await Promise.all([
    supabase.rpc('get_ams_stats_v5', { 
      start_date: currentStart, 
      end_date: currentEnd, 
      species_filter: species,
      risk_filter: risk 
    }),
    supabase.rpc('get_ams_stats_v5', { 
      start_date: prevStart, 
      end_date: prevEnd, 
      species_filter: species,
      risk_filter: risk
    })
  ]);

  if (currentReq.error) {
    console.error("SQL Error inside Analytics Action:", currentReq.error.message);
    return { zones: [], topSubstances: [], rawRows: [], totalDDD: 0, globalTrend: 0 };
  }

  const rawRows = currentReq.data || [];
  const zoneMap: Record<string, any> = {};
  const substanceMap: Record<string, { class: string; riskPriority: string; volume: number }> = {};

  // 1. Parse Current Timeframe Stream
  rawRows.forEach((row: any) => {
    const zoneKey = row.zone || "Unassigned";
    if (!zoneMap[zoneKey]) {
      zoneMap[zoneKey] = { 
        zone: zoneKey, 
        value: 0, 
        prevValue: 0, 
        states: [] 
      };
    }
    const val = parseFloat(row.total_ddd) || 0;
    zoneMap[zoneKey].value += val;
    
    if (row.state_name) {
      const existingState = zoneMap[zoneKey].states.find((s: any) => s.name === row.state_name);
      if (existingState) {
        existingState.value += val;
      } else {
        zoneMap[zoneKey].states.push({ 
          name: row.state_name, 
          value: val 
        });
      }
    }

    const subKey = row.substance || "Unknown Substance";
    if (!substanceMap[subKey]) {
      substanceMap[subKey] = {
        class: row.substance_class || "Unclassified",
        riskPriority: row.risk_priority || "LOW",
        volume: 0
      };
    }
    substanceMap[subKey].volume += val;
  });

  // 2. Parse Historical Timeframe Stream for Trends Computation
  let totalPrevDDD = 0; // Local counter to calculate our global analytical trend percentage
  
  prevReq.data?.forEach((row: any) => {
    const zoneKey = row.zone || "Unassigned";
    const val = parseFloat(row.total_ddd) || 0;
    totalPrevDDD += val;

    if (zoneMap[zoneKey]) {
      zoneMap[zoneKey].prevValue += val;
    }
    
    // Fixed historical substance accumulator to correctly reference local scope bindings
    const subKey = row.substance || 'Unknown Substance';
    if (!substanceMap[subKey]) {
      substanceMap[subKey] = { 
        class: row.substance_class || 'Unclassified', 
        riskPriority: row.risk_priority || 'LOW', 
        volume: 0 
      };
    }
    // We are analyzing overall consumption context profiles; historical trends 
    // are driven off the primary zone parameters, but you can track historical 
    // substance volumes here if your UI needs it.
  });

  // 3. Complete In-Memory Analytical Transformations
  const zones: ZoneMetric[] = Object.values(zoneMap).map((z: any) => ({
    ...z,
    trend: z.prevValue > 0 ? ((z.value - z.prevValue) / z.prevValue) * 100 : 0
  }));

  const topSubstances: SubstanceMetric[] = Object.entries(substanceMap)
    .map(([substance, details]) => ({
      substance,
      class: details.class,
      riskPriority: details.riskPriority as any,
      volume: details.volume
    }))
    .sort((a, b) => b.volume - a.volume); 

  const totalDDD = zones.reduce((sum, z) => sum + z.value, 0);
  
  // Calculate Global Trend precisely to avoid undefined crash returns
  const globalTrend = totalPrevDDD > 0 ? ((totalDDD - totalPrevDDD) / totalPrevDDD) * 100 : 0;

  return { zones, topSubstances, rawRows, totalDDD, globalTrend };
}