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

export async function submitLedgerEntry(previousState: any, formData: FormData) {
  const supabase = await createClient();

  // 1. Extract Core Inputs
  const entryId = formData.get('entry_id') as string;
  const productId = formData.get('product_id') as string; 
  const atcId = formData.get('atc_id') as string; // The ID we just added to the form
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string;
  
  // 2. Extract Logistics/Geospatial Inputs
  const originWarehouse = formData.get('origin_warehouse') as string;
  const originState = formData.get('origin_state') as string;
  const destinationState = formData.get('destination_state') as string;
  const geopoliticalZone = formData.get('geopolitical_zone') as string;
  const targetSpecies = formData.get('target_species') as string;

  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  const submittedUnitsPerPack = parseFloat(formData.get('units_per_pack') as string) || 0;

  // 3. Fetch Regulatory Reference Data
  // We use .maybeSingle() to prevent crashing if the ATC is missing
  const [atcResult, productResult] = await Promise.all([
    supabase.from('atc_codes').select('*').eq('id', atcId).maybeSingle(),
    supabase.from('permits').select('shipping_pack_size, product_name').eq('id', productId).single()
  ]);

  if (productResult.error) {
    return { success: false, message: 'Product not found in Regulatory Database.' };
  }

  // Fallback data if ATC isn't found
  const atcRes = atcResult?.data || { ddd_mg: 0, risk_priority: 'Low', iu_to_mg_factor: 1 };
  const officialPackSizeStr = productResult.data.shipping_pack_size;

  // 4. Calculate Units Per Pack
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

  // 7. Construct Payload
  const payload: any = {
    atc_id: atcId || null,
    entity_id: productId, 
    entry_type: entryType,
    api_mass_mg: apiMassMg,
    ddd_consumed: dddConsumed,
    origin_warehouse: originWarehouse,
    origin_state: originState,
    destination_state: destinationState,
    geopolitical_zone: geopoliticalZone,
    target_species: targetSpecies,
    pack_quantity: packQty,
    metadata: { 
      risk_priority: atcRes.risk_priority,
      units_logged: totalUnitsCount,
      original_unit: massUnit,
      strength_at_log: strength,
      verified_pack_size: officialPackSizeStr,
    },
  };

  // 8. Database Write
  let dbResult;
  if (entryId) {
    dbResult = await supabase.from('ledger_entries').update(payload).eq('id', entryId);
  } else {
    payload.created_at = new Date().toISOString();
    dbResult = await supabase.from('ledger_entries').insert([payload]);
  }

  if (dbResult.error) {
    console.error("DB Error:", dbResult.error);
    return { success: false, message: `Database error: ${dbResult.error.message}` };
  }

  revalidatePath('/Vetstat/Dashboard');
  revalidatePath('/Vetstat/Ledger');

  // At the very end of your submitLedgerEntry function:
  return { 
    success: true, 
    timestamp: Date.now(), // Add this line
    message: `Logged: ${apiMassMg.toFixed(2)}mg API (${dddConsumed.toFixed(4)} DDD) for ${targetSpecies} in ${destinationState}.` 
  };
}