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

  // 1. Extract values from LedgerForm JSX
  const atcId = formData.get('atc_id') as string;
  const permitId = formData.get('entity_id') as string; // Linked to your 'permits' table
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string; // 'mg', 'g', or 'IU'
  
  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQtySubmitted = parseFloat(formData.get('pack_quantity') as string) || 0;
  const purity = 1.0; // Default factor per QMS requirements

  // 2. Fetch Reference Data & Permit Details
  // We fetch atc_codes for the science and permits for the Shipping Pack Size master data.
  const [atcRes, permitRes] = await Promise.all([
    supabase
      .from('atc_codes')
      .select('substance, iu_to_mg_factor, ddd_mg')
      .eq('id', atcId)
      .single(),
    supabase
      .from('permits')
      .select('shipping_pack_size')
      .eq('id', permitId)
      .single()
  ]);

  if (atcRes.error || !atcRes.data) {
    return { success: false, message: 'Reference data for this substance not found.' };
  }

  // 3. Calculate Internal Multipliers
  // We parse the Shipping Pack Size (Master Data) to know how many units are in one "Pack"
  const unitsPerPackMultiplier = parsePackMultiplier(permitRes.data?.shipping_pack_size || "1");

  // 4. Normalize Strength to Milligrams (MG)
  let normalizedStrength = strength;

  if (massUnit === 'g') {
    normalizedStrength = strength * 1000;
  } else if (massUnit === 'IU') {
    const factor = parseFloat(atcRes.data.iu_to_mg_factor?.toString() || "1");
    normalizedStrength = strength / factor;
  }

  // 5. Calculate Total API Mass and DDD Consumed
  // Formula: (Quantity of Packs) * (Units per Pack) * (Strength) * (Purity)
  const totalItems = packQtySubmitted * unitsPerPackMultiplier;
  const apiMassMg = totalItems * normalizedStrength * purity;

  // DDD Calculation: Total Mass / Reference DDD mg
  const referenceDdd = parseFloat(atcRes.data.ddd_mg?.toString() || "0");
  const dddConsumed = referenceDdd > 0 ? apiMassMg / referenceDdd : 0;

  // 6. Save to Supabase Ledger Table
  const { error: insertError } = await supabase
    .from('ledger_entries')
    .insert([
      {
        atc_id: atcId,
        entity_id: permitId,
        entry_type: entryType,
        api_mass_mg: apiMassMg,
        purity_factor: purity,
        ddd_consumed: dddConsumed,
        created_at: new Date().toISOString(),
      },
    ]);

  if (insertError) {
    console.error("VMD Ledger Save Error:", insertError.message);
    return { success: false, message: `Database error: ${insertError.message}` };
  }

  // 7. Revalidate cache to update UI for the Divisional Deputy Director oversight
  revalidatePath('/Vetstat/Ledger');

  return { 
    success: true, 
    message: `Entry logged: Total API Mass ${apiMassMg.toFixed(2)}mg (${dddConsumed.toFixed(4)} DDD).` 
  };
}