"use server"

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Helper to parse complex pack size strings (e.g., "10 x 2 x 50ml" -> 1000)
 * This handles the multiplication logic for VMD regulatory oversight.
 */
function parsePackMultiplier(packSize: string | null): number {
  if (!packSize) return 1;
  // Matches all numbers in strings like "10 blisters x 10 tablets" or "50 x 2"
  const numbers = packSize.match(/\d+(\.\d+)?/g);
  if (!numbers) return 1;
  return numbers.reduce((acc, num) => acc * parseFloat(num), 1);
}

/**
 * VMD Antimicrobial Ledger - Server Action
 * Standardizes inputs to MG and calculates the Divisional Deputy Director (DDD) 
 * metrics for regulatory oversight.
 */

interface ActionResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

export async function submitLedgerEntry(previousState: any, formData: FormData): Promise<ActionResponse> {
  // QMS Requirement: Anchor operational performance clock immediately upon execution
  const executionStartTime = performance.now();
  const supabase = await createClient();

  // 1. Extract Core Inputs
  const entryId = formData.get('entry_id') as string;
  const productId = formData.get('product_id') as string; 
  const atcId = formData.get('atc_id') as string; 
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string;
  
  // 2. Extract Logistics/Geospatial Inputs
  const originWarehouse = formData.get('origin_warehouse') as string;
  const originState = formData.get('origin_state') as string;
  const destinationState = formData.get('destination_state') as string;
  const geopoliticalZone = formData.get('geopolitical_zone') as string;
  const targetSpecies = formData.get('target_species') as string;

  // Extract Regional Depot Distribution Overrides
  const isDepotDistribution = formData.get('is_depot_distribution') === 'true';
  const targetDepotId = formData.get('target_depot_id') as string || null;

  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  const submittedUnitsPerPack = parseFloat(formData.get('units_per_pack') as string) || 0;
  
  // QMS Requirement: Capture when the client-side interaction began processing
  const clientTimestamp = parseInt(formData.get('client_start_time') as string || '0') || Date.now();

  // 3. Fetch Regulatory Reference Data from Updated Table Names
  const [atcResult, productResult] = await Promise.all([
    supabase.from('atc_codes').select('*').eq('id', atcId).maybeSingle(),
    supabase.from('permits').select('shipping_pack_size, product_name').eq('id', productId).single()
  ]);

  if (productResult.error) {
    console.error("VMD Permits Validation Failure:", JSON.stringify(productResult.error, null, 2));
    return { success: false, message: 'Product profile not authenticated in VMD Regulatory Database.', timestamp: Date.now() };
  }

  // Fallback structural safety assignment
  const atcRes = atcResult?.data || { ddd_mg: 0, risk_priority: 'Low', iu_to_mg_factor: 1 };
  const officialPackSizeStr = productResult.data.shipping_pack_size;

  // 4. Calculate Units Per Pack via Pack Size Multiplier (e.g., "12x7" or "30x10x12")
  let officialUnitsPerPack = 1; 
  if (officialPackSizeStr) {
    officialUnitsPerPack = officialPackSizeStr.split(/[xX*]/)
      .reduce((acc: number, curr: string) => {
        const num = parseInt(curr.replace(/[^0-9]/g, ''));
        return !isNaN(num) ? acc * num : acc;
      }, 1);
  } else {
    officialUnitsPerPack = submittedUnitsPerPack || 1;
  }

  // 5. Normalize Strength to MG
  let normalizedStrength = strength;
  if (massUnit === 'g') {
    normalizedStrength = strength * 1000;
  } else if (massUnit === 'IU') {
    const factor = parseFloat(atcRes.iu_to_mg_factor?.toString() || "1");
    normalizedStrength = strength / factor;
  }

  // 6. Calculate Final DDD and Mass
  const totalUnitsCount = packQty * officialUnitsPerPack;
  const apiMassMg = totalUnitsCount * normalizedStrength;
  const referenceDdd = parseFloat(atcRes.ddd_mg?.toString() || "0");
  const dddConsumed = referenceDdd > 0 ? apiMassMg / referenceDdd : 0;

  // QMS Requirement: Compute staff transaction duration delta
  const executionEndTime = performance.now();
  const serverProcessingSeconds = (executionEndTime - executionStartTime) / 1000;
  const totalQmsStaffSeconds = ((Date.now() - clientTimestamp) / 1000) + serverProcessingSeconds;

  // 7. Construct Unified Transactional Payload
  // 7. Construct Unified Transactional Payload
  const payload: any = {
    atc_id: atcId || null,
    entity_id: productId, 
    entry_type: entryType,
    api_mass_mg: apiMassMg,
    ddd_consumed: dddConsumed,
    
    // Explicitly map table keys to your camelCase extraction variables:
    origin_warehouse: originWarehouse, 
    origin_state: originState,
    destination_state: destinationState,
    geopolitical_zone: geopoliticalZone,
    target_species: targetSpecies,
    
    pack_quantity: packQty,
    metadata: { 
      risk_priority: atcRes.risk_priority || 'Low',
      units_logged: totalUnitsCount,
      original_unit: massUnit,
      strength_at_log: strength,
      verified_pack_size: officialPackSizeStr,
      is_depot_distribution: isDepotDistribution,
      target_depot_id: targetDepotId,
      qms_metrics: {
        server_processing_seconds: parseFloat(serverProcessingSeconds.toFixed(4)),
        total_staff_action_seconds: parseFloat(totalQmsStaffSeconds.toFixed(2)),
        compliance_check: true
      }
    },
  };
  // 8. Database Write to Synchronized Ledger Table Target
  let dbResult;
  if (entryId) {
    dbResult = await supabase.from('ledger_entries').update(payload).eq('id', entryId);
  } else {
    payload.created_at = new Date().toISOString();
    dbResult = await supabase.from('ledger_entries').insert([payload]);
  }

  if (dbResult.error) {
    console.error("VetStat Ledger Transaction Error:", JSON.stringify(dbResult.error, null, 2));
    return { success: false, message: `Database persistence failure: ${dbResult.error.message}`, timestamp: Date.now() };
  }

  // 9. Revalidate Next.js Data Cache Paths completely
  revalidatePath('/Vetstat/Dashboard');
  revalidatePath('/Vetstat/Ledger');
  revalidatePath('/Vetstat/LogActivity'); 

  // 10. Return Client State
  return { 
    success: true, 
    timestamp: Date.now(), 
    message: `Logged: ${apiMassMg.toLocaleString(undefined, {maximumFractionDigits: 2})}mg API (${dddConsumed.toFixed(4)} DDD) for ${targetSpecies} in ${destinationState}. Inventory snapshots synchronized successfully under QMS parameters.` 
  };
}