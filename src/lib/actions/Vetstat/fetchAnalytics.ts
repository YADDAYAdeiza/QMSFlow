// lib/actions/Vetstat/fetchAnalytics.ts
'use server'

import { createClient } from '@/utils/supabase/server';

export async function getAMSRegionalAnalytics() {
  const supabase = await createClient();

  // Fetching the pre-aggregated view
  const { data, error } = await supabase
    .from('ams_regional_summary')
    .select('*');

  if (error) {
    console.error("Analytics Fetch Error:", error);
    return [];
  }

  // Transform for the Map (Zone Totals)
  const zoneData = data.reduce((acc: any, curr) => {
    const existing = acc.find((item: any) => item.zone === curr.geopolitical_zone);
    if (existing) {
      existing.value += curr.total_ddd;
    } else {
      acc.push({ zone: curr.geopolitical_zone, value: curr.total_ddd });
    }
    return acc;
  }, []);

  return {
    raw: data,
    zones: zoneData,
    poultryTotal: data
      .filter(d => d.target_species === 'Poultry')
      .reduce((sum, d) => sum + d.total_ddd, 0)
  };
}