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

  // 1. Extract IDs and Core Inputs
  const entryId = formData.get('entry_id') as string;
  const productId = formData.get('product_id') as string; 
  const atcId = formData.get('atc_id') as string;
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string;
  
  // 2. Extract AMS/Geospatial Inputs (Updated for Pinpoint Accuracy)
  const originWarehouse = formData.get('origin_warehouse') as string;
  const originState = formData.get('origin_state') as string;
  const destinationState = formData.get('destination_state') as string;
  const geopoliticalZone = formData.get('geopolitical_zone') as string;
  const targetSpecies = formData.get('target_species') as string;

  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  const submittedUnitsPerPack = parseFloat(formData.get('units_per_pack') as string) || 0;
  const purity = 1.0; 

  // 3. Fetch Regulatory Reference Data (Verification)
  const [atcResult, productResult] = await Promise.all([
    supabase.from('atc_codes').select('*').eq('id', atcId).single(),
    supabase.from('permits').select('shipping_pack_size, product_name').eq('id', productId).single()
  ]);

  if (atcResult.error || productResult.error) {
    return { success: false, message: 'Regulatory reference data not found.' };
  }

  const atcRes = atcResult.data;
  const officialPackSizeStr = productResult.data.shipping_pack_size;

  // 4. Server-Side Extraction (Verification of Pack Multiplier)
  let officialUnitsPerPack = 1; 
  if (officialPackSizeStr) {
    officialUnitsPerPack = officialPackSizeStr.split(/[xX*]/)
      .reduce((acc: number, curr: string) => {
        const num = parseInt(curr.replace(/[^0-9]/g, ''));
        return !isNaN(num) ? acc * num : acc;
      }, 1);
  } else {
    officialUnitsPerPack = submittedUnitsPerPack;
  }

  // 5. Normalize Strength to MG
  let normalizedStrength = strength;
  if (massUnit === 'g') {
    normalizedStrength = strength * 1000;
  } else if (massUnit === 'IU') {
    const factor = parseFloat(atcRes.iu_to_mg_factor?.toString() || "1");
    normalizedStrength = strength / factor;
  }

  // 6. Final Calculations (DDD and Mass)
  const totalUnitsCount = packQty * officialUnitsPerPack;
  const apiMassMg = totalUnitsCount * normalizedStrength * purity;
  const referenceDdd = parseFloat(atcRes.ddd_mg?.toString() || "0");
  const dddConsumed = referenceDdd > 0 ? apiMassMg / referenceDdd : 0;

  // 7. Construct Payload (Mapping-Ready & Pinpoint Accurate)
  const payload: any = {
    atc_id: atcId,
    entity_id: productId, 
    entry_type: entryType,
    api_mass_mg: apiMassMg,
    ddd_consumed: dddConsumed,
    
    // Explicit columns for Map/Dashboard filtering
    origin_warehouse: originWarehouse,
    origin_state: originState,
    destination_state: destinationState,
    geopolitical_zone: geopoliticalZone,
    target_species: targetSpecies,

    metadata: { 
      risk_priority: atcRes.risk_priority,
      units_logged: totalUnitsCount,
      original_unit: massUnit,
      strength_at_log: strength,
      verified_pack_size: officialPackSizeStr,
      is_edited: !!entryId,
      edit_timestamp: entryId ? new Date().toISOString() : null
    },
  };

  // 8. Database Operation
  let dbResult;
  if (entryId) {
    dbResult = await supabase
      .from('ledger_entries')
      .update(payload)
      .eq('id', entryId);
  } else {
    // Adding created_at for new entries
    payload.created_at = new Date().toISOString();
    dbResult = await supabase
      .from('ledger_entries')
      .insert([payload]);
  }

  if (dbResult.error) {
    console.error("Database Error:", dbResult.error);
    return { success: false, message: `Database error: ${dbResult.error.message}` };
  }

  revalidatePath('/Vetstat/Ledger');

  // 9. Informative Success Message
  const actionType = entryId ? 'Updated' : 'Logged';
  const speciesContext = targetSpecies ? ` for ${targetSpecies}` : '';
  const locationContext = destinationState ? ` in ${destinationState}` : '';

  return { 
    success: true, 
    message: `${actionType}: ${apiMassMg.toFixed(2)}mg API (${dddConsumed.toFixed(4)} DDD)${speciesContext}${locationContext}.` 
  };
}