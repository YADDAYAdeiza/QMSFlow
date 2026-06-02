'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

/**
 * Normalized lookup/insertion for company entities.
 * Ensures deduplication across the registry (VMD/PAD/AFPD/IRSD).
 */
async function getOrCreateCompanyAmr(supabase: any, name: string) {
  if (!name) return null;
  const trimmedName = name.trim();

  // 1. Search for existing entry
  const { data: existing } = await supabase
    .from('companies_amr')
    .select('id')
    .ilike('company_name', trimmedName)
    .maybeSingle();

  if (existing) return existing.id;

  // 2. Insert if missing
  const { data: created, error } = await supabase
    .from('companies_amr')
    .insert([{ company_name: trimmedName }])
    .select('id')
    .single();

  if (error) {
    // Defensive fallback for race conditions
    const { data: retry } = await supabase
      .from('companies_amr')
      .select('id')
      .ilike('company_name', trimmedName)
      .maybeSingle();
    return retry?.id || null;
  }

  return created?.id || null;
}

/**
 * Registers master data for Finished Pharmaceutical Products (FPP).
 */
export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  const company_name = formData.get('company_name') as string;
  const companyId = await getOrCreateCompanyAmr(supabase, company_name);

  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: formData.get('nafdac_reg_no'),
      product_name: formData.get('product_name'),
      company_name: company_name,        // Legacy dual-write
      company_id: companyId,             // Normalized link
      country_of_origin: formData.get('country_of_origin'), // Legacy dual-write
      shipping_pack_size: formData.get('shipping_pack_size'),
      active_substance: formData.get('active_substance'),
      atc_id: formData.get('atc_id') || null,
      strength: formData.get('strength'),
      route_of_administration: formData.get('route_of_administration'),
      dosage_form: formData.get('dosage_form'),
      therapeutic_class: formData.get('therapeutic_class'),
      status: 'Original',
      dir_type: 'VMD'
    }])
    .select('id')
    .single();

  if (error) return { success: false, message: error.message };

  revalidatePath('/Vetstat/Ledger');
  return { success: true, permit_id: data.id };
}

/**
 * Registers infrastructure logistics nodes (Warehouses/Depots).
 */
export async function enrollDepotLocation(prevState: any, formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const company_name = formData.get('company_name') as string;
  const companyId = await getOrCreateCompanyAmr(supabase, company_name);

  const { error } = await supabase
    .from('importer_logistics_nodes')
    .insert([{
      company_name: company_name,        // Legacy dual-write
      company_id: companyId,             // Normalized link
      depot_name: formData.get('depot_name'),
      state: formData.get('state'),
      physical_address: formData.get('physical_address'),
      node_type: formData.get('node_type')
    }]);

  if (error) return { success: false, message: error.message, timestamp: Date.now() };

  revalidatePath('/Vetstat/Ledger');
  return { 
    success: true, 
    message: "Infrastructure node registered successfully.", 
    timestamp: Date.now() 
  };
}