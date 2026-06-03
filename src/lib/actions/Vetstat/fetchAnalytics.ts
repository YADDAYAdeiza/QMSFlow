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

export async function getAMSRegionalAnalytics(
  startDate?: string, 
  endDate?: string, 
  species: string = 'All',
  risk: string = 'All' 
) {
  const startTimer = performance.now();
  const supabase = await createClient();
  
  const currentStart = startDate || '2026-01-01';
  const currentEnd = endDate || new Date().toISOString();

  // Calculate matching historical window duration for tracking trends
  const duration = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
  const prevStart = new Date(new Date(currentStart).getTime() - duration).toISOString();
  const prevEnd = currentStart;

  // Execute both analytical queries simultaneously to boost performance
  const [currentReq, prevReq] = await Promise.all([
    supabase.rpc('get_ams_stats_v5', { 
      start_date: currentStart, 
      end_date: currentEnd, 
      species_filter: speciesFilter,
      risk_filter: riskFilter 
    }),
    supabase.rpc('get_ams_stats_v5', { 
      start_date: prevStart, 
      end_date: prevEnd, 
      species_filter: speciesFilter,
      risk_filter: riskFilter
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
    // Process Geopolitical Structural Loads
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
      // Look for an existing state record inside this zone to avoid duplicate row entries
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

    // Process Unique Substance Models
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
  prevReq.data?.forEach((row: any) => {
    const zoneKey = row.zone || "Unassigned";
    const val = parseFloat(row.total_ddd) || 0;
    if (zoneMap[zoneKey]) {
      zoneMap[zoneKey].prevValue += val;
    }
    zoneMap[rawZone].statesMap[rawState] += rowDDD;

    // Substance Accumulator Mapping
    const rawSubstance = row.substance || 'Unknown Substance';
    if (!substanceMap[rawSubstance]) {
      substanceMap[rawSubstance] = { 
        substance: rawSubstance, 
        class: row.substance_class || 'Unclassified', 
        riskPriority: row.risk_priority || 'LOW', 
        volume: 0 
      };
    }
    substanceMap[rawSubstance].volume += rowDDD;
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
    .sort((a, b) => b.volume - a.volume); // Sort by highest consumption volume

  const totalDDD = zones.reduce((sum, z) => sum + z.value, 0);

  // Added rawRows to the structural return block
  return { zones, topSubstances, rawRows, totalDDD, globalTrend };
}