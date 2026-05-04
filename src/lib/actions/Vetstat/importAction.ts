"use server"

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * VMD Antimicrobial Ledger - Server Action
 * Standardizes inputs to MG and calculates the Defined Daily Dose (DDD) 
 * for regulatory oversight.
 */
export async function submitLedgerEntry(previousState: any, formData: FormData) {
  const supabase = await createClient();

  // 1. Extract values from LedgerForm JSX
  const atcId = formData.get('atc_id') as string;
  const entityId = formData.get('entity_id') as string;
  const entryType = formData.get('entry_type') as string; 
  const massUnit = formData.get('mass_unit') as string; // 'mg', 'g', or 'IU'
  
  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  const unitsPerPack = parseFloat(formData.get('units_per_pack') as string) || 1;
  const purity = 1.0; // Default factor per QMS requirements

  // 2. Fetch Reference Data (IU Factor and DDD Value)
  const { data: atcData, error: atcError } = await supabase
    .from('atc_codes')
    .select('substance, iu_to_mg_factor, ddd_mg')
    .eq('id', atcId)
    .single();

  if (atcError || !atcData) {
    return { success: false, message: 'Reference data for this substance not found.' };
  }

  // 3. Normalize Strength to Milligrams (MG)
  let normalizedStrength = strength;

  if (massUnit === 'g') {
    normalizedStrength = strength * 1000;
  } else if (massUnit === 'IU') {
    // Calculation: mg = IU / (iu_to_mg_factor)
    const factor = parseFloat(atcData.iu_to_mg_factor?.toString() || "1");
    normalizedStrength = strength / factor;
  }

  // 4. Calculate Total API Mass and DDD Consumed
  const totalItems = packQty * unitsPerPack;
  const apiMassMg = totalItems * normalizedStrength * purity;

  // DDD Calculation: Total Mass / Reference DDD
  const referenceDdd = parseFloat(atcData.ddd_mg?.toString() || "0");
  const dddConsumed = referenceDdd > 0 ? apiMassMg / referenceDdd : 0;

  // 5. Save to Supabase Ledger Table
  const { error: insertError } = await supabase
    .from('ledger_entries')
    .insert([
      {
        atc_id: atcId,
        entity_id: entityId,
        entry_type: entryType,
        api_mass_mg: apiMassMg,
        purity_factor: purity,
        ddd_consumed: dddConsumed, // This ensures your ledger data is no longer 0
        created_at: new Date().toISOString(),
      },
    ]);

  if (insertError) {
    console.error("VMD Ledger Save Error:", insertError.message);
    return { success: false, message: `Database error: ${insertError.message}` };
  }

  // 6. Revalidate cache to update UI
  revalidatePath('/Vetstat/Ledger');

  return { success: true, message: 'Ledger entry submitted successfully.' };
}