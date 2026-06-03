'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Helper to parse complex pack size strings (e.g., "10 x 2 x 50ml" -> 1000)
 * This handles the multiplication logic for VMD regulatory oversight.
 */
function parsePackMultiplier(packSize: string | null): number {
  if (!packSize) return 1;
  const numbers = packSize.match(/\d+(\.\d+)?/g);
  if (!numbers) return 1;
  return numbers.reduce((acc, num) => acc * parseFloat(num), 1);
}

interface ActionResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

export async function submitLedgerEntry(previousState: any, formData: FormData): Promise<any> {
  const executionStartTime = performance.now();
  const supabase = await createClient();

  // 1. Extract Core & Meta Inputs
  const isEdit = formData.get('is_edit') === 'true';
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

  const isDepotDistribution = formData.get('is_depot_distribution') === 'true';
  const targetDepotId = formData.get('target_depot_id') as string || null;

  const strength = parseFloat(formData.get('strength') as string) || 0;
  const packQty = parseFloat(formData.get('pack_quantity') as string) || 0;
  const clientTimestamp = parseInt(formData.get('client_start_time') as string || '0') || Date.now();

  // 3. Regulatory Balance Check (Only for New entries or if quantity changed in Edit)
  // Logic: In a professional audit, even edits should be checked against current ceilings.
  if (entryType === 'CONSUMPTION' || entryType === 'DESTRUCTION') {
    const { data: historicalRecords, error: historyError } = await supabase
      .from('ledger_entries')
      .select('entry_type, pack_quantity, id')
      .eq('entity_id', productId);

    if (historicalRecords) {
      // Exclude the current record from the "Available" calculation if we are editing
      const totalImported = historicalRecords
        .filter(r => r.entry_type === 'IMPORT')
        .reduce((sum, r) => sum + (parseFloat(r.pack_quantity) || 0), 0);
      
      const totalDeducted = historicalRecords
        .filter(r => (r.entry_type === 'CONSUMPTION' || r.entry_type === 'DESTRUCTION') && r.id !== entryId)
        .reduce((sum, r) => sum + (parseFloat(r.pack_quantity) || 0), 0);

      const availableBalance = totalImported - totalDeducted;

      if (packQty > availableBalance) {
        return { success: false, message: `Regulatory Deficit: Only ${availableBalance} packs available.`, timestamp: Date.now() };
      }
    }
  }

  // 4. Fetch Regulatory Reference Data
  const [atcResult, productResult] = await Promise.all([
    supabase.from('atc_codes').select('*').eq('id', atcId).maybeSingle(),
    supabase.from('permits').select(`shipping_pack_size, product_name, company_id, companies_amr(company_name)`).eq('id', productId).single()
  ]);

  if (productResult.error) return { success: false, message: 'Product profile not authenticated.', timestamp: Date.now() };

  const atcRes = atcResult?.data || { ddd_mg: 0, risk_priority: 'Low', iu_to_mg_factor: 1 };
  const officialPackSizeStr = productResult.data.shipping_pack_size;
  const trackingCompanyId = productResult.data.company_id;
  const trackingCompanyName = (productResult.data.companies_amr as any)?.company_name || 'N/A';

  // 5. Normalization & Calculations
  const officialUnitsPerPack = officialPackSizeStr?.split(/[xX*]/).reduce((acc: number, curr: string) => acc * (parseInt(curr.replace(/[^0-9]/g, '')) || 1), 1) || 1;
  let normalizedStrength = massUnit === 'g' ? strength * 1000 : massUnit === 'IU' ? strength / parseFloat(atcRes.iu_to_mg_factor || "1") : strength;
  const apiMassMg = (packQty * officialUnitsPerPack) * normalizedStrength;
  const dddConsumed = parseFloat(atcRes.ddd_mg || "0") > 0 ? apiMassMg / parseFloat(atcRes.ddd_mg) : 0;

  // 6. Final Payload Construction
  const payload = {
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
      original_unit: massUnit,
      strength_at_log: strength,
      is_depot_distribution: isDepotDistribution,
      target_depot_id: targetDepotId,
      company_id: trackingCompanyId,
      company_name: trackingCompanyName,
      qms_metrics: {
        server_processing_seconds: parseFloat(((performance.now() - executionStartTime) / 1000).toFixed(4)),
        compliance_check: true
      }
    }
  };

  // 7. Database Persistence (The Switch)
  const dbResult = isEdit 
    ? await supabase.from('ledger_entries').update(payload).eq('id', entryId)
    : await supabase.from('ledger_entries').insert([{ ...payload, created_at: new Date().toISOString() }]);

  if (dbResult.error) return { success: false, message: `Persistence Error: ${dbResult.error.message}`, timestamp: Date.now() };

  revalidatePath('/Vetstat/Dashboard');
  return { success: true, timestamp: Date.now(), message: `Successfully ${isEdit ? 'updated' : 'logged'} transaction.` };
}