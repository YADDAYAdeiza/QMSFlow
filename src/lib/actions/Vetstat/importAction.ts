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

  // 1. Extract IDs and Inputs
  const productId = formData.get('product_id') as string; 
  const atcId = formData.get('atc_id') as string;
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string;
  
  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  // User might have edited this, so we'll fetch the 'official' one below
  const submittedUnitsPerPack = parseFloat(formData.get('units_per_pack') as string) || 0;
  const purity = 1.0; 

  // 2. Fetch both ATC info AND the official Product Registration data
  // We need 'shipping_pack_size' from the permits/products table
  const [atcResult, productResult] = await Promise.all([
    supabase.from('atc_codes').select('*').eq('id', atcId).single(),
    supabase.from('permits').select('shipping_pack_size, product_name').eq('id', productId).single()
  ]);

  if (atcResult.error || productResult.error) {
    return { success: false, message: 'Regulatory reference data not found.' };
  }

  const atcRes = atcResult.data;
  const officialPackSizeStr = productResult.data.shipping_pack_size;


  console.log('This is shipping_pack_size: ', officialPackSizeStr);

  // 3. Server-Side Extraction (Verification)
  // We repeat the logic here to ensure the calculation uses the registered value
  // 3. Server-Side Extraction (Verification) - Updated to Multiplier Logic
let officialUnitsPerPack = 1; 

  if (officialPackSizeStr) {
    // Matches the Client Logic: Multiply all segments (10x2x50 -> 1000)
    officialUnitsPerPack = officialPackSizeStr.split(/[xX*]/)
      .reduce((acc, curr) => {
        const num = parseInt(curr.replace(/[^0-9]/g, ''));
        return !isNaN(num) ? acc * num : acc;
      }, 1);
  } else {
    // Fallback to what was submitted if the official string is missing
    officialUnitsPerPack = submittedUnitsPerPack;
  }
  // 4. Normalize Strength to Milligrams (MG)
  let normalizedStrength = strength;
  if (massUnit === 'g') {
    normalizedStrength = strength * 1000;
  } else if (massUnit === 'IU') {
    const factor = parseFloat(atcRes.iu_to_mg_factor?.toString() || "1");
    normalizedStrength = strength / factor;
  }

  // 5. Final Calculations
  const totalUnitsCount = packQty * officialUnitsPerPack;
  const apiMassMg = totalUnitsCount * normalizedStrength * purity;

  // DDD Calculation
  const referenceDdd = parseFloat(atcRes.ddd_mg?.toString() || "0");
  const dddConsumed = referenceDdd > 0 ? apiMassMg / referenceDdd : 0;

  // 6. Save to Ledger
  const { error: insertError } = await supabase
    .from('ledger_entries')
    .insert([
      {
        atc_id: atcId,
        entity_id: productId, 
        entry_type: entryType,
        api_mass_mg: apiMassMg,
        purity_factor: purity,
        ddd_consumed: dddConsumed,
        metadata: { 
          risk_priority: atcRes.risk_priority,
          units_logged: totalUnitsCount,
          original_unit: massUnit,
          verified_pack_size: officialPackSizeStr // Store for audit trails
        },
        created_at: new Date().toISOString(),
      },
    ]);

  if (insertError) return { success: false, message: `Database error: ${insertError.message}` };

  revalidatePath('/Vetstat/Ledger');

  return { 
    success: true, 
    message: `Logged: ${apiMassMg.toFixed(2)}mg API (${dddConsumed.toFixed(4)} DDD) for ${productResult.data.product_name}.` 
  };
}