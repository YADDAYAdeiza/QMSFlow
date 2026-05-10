// lib/actions/Vetstat/fetchAnalytics.ts
'use server'

import { createClient } from '@/utils/supabase/server';

/**
 * Fetches aggregated AMS data filtered by Date and Species.
 * @param startDate - ISO string for the beginning of the range
 * @param endDate - ISO string for the end of the range
 * @param species - The target species filter (e.g., 'Poultry', 'Aquaculture', or 'All')
 */
// lib/actions/Vetstat/fetchAnalytics.ts

// lib/actions/Vetstat/fetchAnalytics.ts

export async function getAMSRegionalAnalytics(
  startDate?: string, 
  endDate?: string, 
  species: string = 'All',
  risk: string = 'All' 
) {
  const supabase = await createClient();
  
  const currentStart = startDate || '2026-01-01';
  const currentEnd = endDate || new Date().toISOString();
  const speciesFilter = species || 'All';
  const riskFilter = risk || 'All';

  const duration = new Date(currentEnd).getTime() - new Date(currentStart).getTime();
  const prevStart = new Date(new Date(currentStart).getTime() - duration).toISOString();
  const prevEnd = currentStart;

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

  // --- DEBUG LOGS ---
  console.log("--- VMD DASHBOARD DEBUG ---");
  console.log("Filters used:", { speciesFilter, riskFilter });
  
  if (currentReq.error) {
    console.error("SQL ERROR:", currentReq.error.message);
  } else {
    console.log("DATA RECEIVED FROM SQL:", currentReq.data);
  }
  // -------------------

  if (currentReq.error) return { zones: [], totalDDD: 0, globalTrend: 0 };

  const zoneMap: Record<string, any> = {};

  currentReq.data?.forEach((row: any) => {
    if (!zoneMap[row.geopolitical_zone]) {
      zoneMap[row.geopolitical_zone] = { 
        zone: row.geopolitical_zone, 
        value: 0, 
        prevValue: 0, 
        states: [] 
      };
    }
    const val = parseFloat(row.total_ddd) || 0;
    zoneMap[row.geopolitical_zone].value += val;
    zoneMap[row.geopolitical_zone].states.push({ 
      name: row.state_name, 
      value: val 
    });
  });

  prevReq.data?.forEach((row: any) => {
    if (zoneMap[row.geopolitical_zone]) {
      zoneMap[row.geopolitical_zone].prevValue += parseFloat(row.total_ddd) || 0;
    }
  });

  const zones = Object.values(zoneMap).map((z: any) => ({
    ...z,
    trend: z.prevValue > 0 ? ((z.value - z.prevValue) / z.prevValue) * 100 : 0
  }));

  const totalDDD = zones.reduce((sum, z) => sum + z.value, 0);
  const prevTotal = zones.reduce((sum, z) => sum + z.prevValue, 0);
  const globalTrend = prevTotal > 0 ? ((totalDDD - prevTotal) / prevTotal) * 100 : 0;

  return { zones, totalDDD, globalTrend };
}