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
  name: string;
  id: string;
  value: number;
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

  // 1. Fetch data from the database
  const { data, error } = await supabase.rpc('get_ams_stats_v5', { 
    start_date: currentStart, 
    end_date: currentEnd, 
    species_filter: species,
    risk_filter: risk 
  });

  if (error) {
    console.error("QMS Audit: SQL Analytics Failure", error);
    return { zones: [], topSubstances: [], rawRows: [], totalDDD: 0, globalTrend: 0 };
  }

  // Preserve the raw data stream so client-side components can compute custom view-ports
  const rawRows = data || [];

  // 2. Compute aggregations using internal sub-trackers for nested mapping
  const zoneMap: Record<string, { zone: string; value: number; statesMap: Record<string, number> }> = {};
  const substanceMap: Record<string, any> = {};

  rawRows.forEach((row: any) => {
    // Read raw values from the database schema structure
    const rawZone = row.zone || 'Unknown Region';
    const rawState = row.state_name || 'Unknown State';
    const rowDDD = parseFloat(row.total_ddd) || 0;

    // Zone Accumulator Initialization
    if (!zoneMap[rawZone]) {
      zoneMap[rawZone] = { 
        zone: rawZone, 
        value: 0,
        statesMap: {} 
      };
    }
    zoneMap[rawZone].value += rowDDD;

    // Group state volumes under their parent geopolitical zone
    if (!zoneMap[rawZone].statesMap[rawState]) {
      zoneMap[rawZone].statesMap[rawState] = 0;
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

  // 3. Format Data Objects into Arrays Expected by the Frontend Components
  const zones = Object.values(zoneMap).map(z => {
    // Normalization Layer: Corrects INITCAP formatting to match map component requirements
    let standardZoneName = z.zone;
    const lowerZone = z.zone.toLowerCase();
    
    if (lowerZone.includes('central')) standardZoneName = 'North-Central';
    else if (lowerZone.includes('north-east') || lowerZone === 'north east') standardZoneName = 'North-East';
    else if (lowerZone.includes('north-west') || lowerZone === 'north west') standardZoneName = 'North-West';
    else if (lowerZone.includes('south-south') || lowerZone === 'south south') standardZoneName = 'South-South';
    else if (lowerZone.includes('south-west') || lowerZone === 'south west') standardZoneName = 'South-West';
    else if (lowerZone.includes('south-east') || lowerZone === 'south east') standardZoneName = 'South-East';

    return {
      zone: standardZoneName,
      name: standardZoneName, // Fallback for map components expecting 'name'
      id: standardZoneName,   // Fallback for map components expecting path matching 'id'
      value: z.value,
      trend: 0, 
      // Transform the temporary states map into a clean sorted array
      states: Object.entries(z.statesMap).map(([name, value]) => ({
        name,
        value
      })).sort((a, b) => b.value - a.value)
    };
  });

  const topSubstances = Object.values(substanceMap)
    .sort((a: any, b: any) => b.volume - a.volume);

  const totalDDD = zones.reduce((sum, z) => sum + z.value, 0);

  // QMS Performance execution log metric
  console.log(`QMS Audit: Analytics compute took ${(performance.now() - startTimer).toFixed(2)}ms`);

  return { 
    zones, 
    topSubstances, 
    rawRows, // ◄ FIXED: Provided back to the UI state engine
    totalDDD, 
    globalTrend: 0 
  };
}