// lib/actions/Vetstat/fetchAnalytics.ts
'use server'

import { createClient } from '@/utils/supabase/server';

// lib/actions/Vetstat/fetchAnalytics.ts
export async function getAMSRegionalAnalytics() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('get_ams_stats');

  if (error || !data) {
    console.error("RPC Error:", error);
    return { zones: [], totalDDD: 0, poultryTotal: 0 };
  }

  // Debug: Check this in your terminal to see if poultry_ddd is coming through
  console.log("RPC Data Raw:", data);

  const zones = data.map((row: any) => ({
    zone: row.geopolitical_zone,
    value: parseFloat(row.total_ddd) || 0
  }));

  const totalDDD = zones.reduce((sum, z) => sum + z.value, 0);

  // This matches the column name in our SQL function above
  const poultryTotal = data.reduce((sum: number, row: any) => 
    sum + (parseFloat(row.poultry_ddd) || 0), 0
  );

  return { zones, totalDDD, poultryTotal };
}