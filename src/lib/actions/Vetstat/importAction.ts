'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

export async function submitLedgerEntry(previousState: any, formData: FormData) {
  const supabase = await createClient();
  
  // 1. Explicitly extract and validate data
  const entryType = formData.get('entry_type') as string;
  const atcId = formData.get('atc_id') as string;
  const quantity = parseFloat(formData.get('quantity') as string);
  const concentration = parseFloat(formData.get('concentration') as string);
  const unit = formData.get('unit') as string;
  const density = parseFloat(formData.get('density') as string) || 1.0;
  const entityId = formData.get('entity_id') as string;
  const purity = parseFloat(formData.get('purity') as string) || 1.0;

  // 2. Fetch intelligence for DDD calculations
  const { data: registry } = await supabase
    .from('atc_codes')
    .select('ddd_mg, risk_priority')
    .eq('id', atcId)
    .single();

  // 3. Normalization Math
  const unitMultiplier = unit === 'kg' ? 1000000 : (unit === 'g' ? 1000 : 1);
  const apiMassMg = unit === 'ml' 
    ? quantity * density * concentration * purity 
    : quantity * unitMultiplier * concentration * purity;
    
  const dddConsumed = registry?.ddd_mg ? apiMassMg / registry.ddd_mg : 0;

  // 4. Strict Insert
  const { error } = await supabase.from('ledger_entries').insert({
    entry_type: entryType,
    atc_id: atcId,
    api_mass_mg: apiMassMg,
    entity_id: entityId,
    purity_factor: purity,
    ddd_consumed: dddConsumed, // Now a dedicated column for dashboards
    metadata: {
      risk_priority: registry?.risk_priority || 'UNKNOWN'
    }
  });

  if (error) {
    console.error("Supabase Error:", error);
    return { success: false, message: `Error: ${error.message}` };
  }

  revalidatePath('/Vetstat/Ledger');
  return { success: true, message: "Entry logged successfully." };
}