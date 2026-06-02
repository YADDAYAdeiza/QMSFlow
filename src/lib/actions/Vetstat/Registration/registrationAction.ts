'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

async function getOrCreateCompanyAmr(supabase: any, name: string, country: string | null) {
  console.log('This is company_name: ', name);
  if (!name) return null;
  const start = performance.now(); // QMS Compliance timing
  const trimmedName = name.trim();

  const { data: existing } = await supabase
    .from('companies_amr')
    .select('id')
    .ilike('company_name', trimmedName)
    .maybeSingle();

  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from('companies_amr')
    .insert([{ company_name: trimmedName, country_of_origin: country?.trim() || null }])
    .select('id')
    .single();

    console.log('Inserted');
  console.log('Inserted: ', created );

  if (error) {
    // Keep your defensive fallback
    const { data: retry } = await supabase
      .from('companies_amr')
      .select('id')
      .ilike('company_name', trimmedName)
      .maybeSingle();
    return retry?.id || null;
  }

  console.log(`QMS Audit: Company sync for '${trimmedName}' took ${performance.now() - start}ms`);
  return created?.id;
}

export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  const start = performance.now();

  const company_name = formData.get('company_name') as string;
  const companyId = await getOrCreateCompanyAmr(supabase, company_name, formData.get('country_of_origin') as string);

  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: formData.get('nafdac_reg_no'),
      product_name: formData.get('product_name'),
      shipping_pack_size: formData.get('shipping_pack_size'),
      dir_type: 'VMD', // Hardcoded as per current requirements
      active_substance: formData.get('active_substance'),
      route_of_administration: formData.get('route_of_administration'),
      strength: formData.get('strength'),
      dosage_form: formData.get('dosage_form'),
      therapeutic_class: formData.get('therapeutic_class'),
      atc_id: formData.get('atc_id'),
      company_id: companyId // Correctly using the UUID
    }])
    .select('id')
    .single();


  console.log(`QMS Audit: Enrollment '${formData.get('product_name')}' took ${performance.now() - start}ms`);

  if (error) return { success: false, message: error.code === '23505' ? "Conflict: Registration exists." : error.message };
  
  revalidatePath('/Vetstat/Ledger');
  return { success: true, permit_id: data.id };
}

/**
 * Updates an existing FPP Registration.
 * Handles the normalized company relationship update.
 */
/**
 * Updates an existing FPP Registration.
 * Handles the normalized company relationship update.
 */
export async function updateFPPRegistration(id: string, formData: FormData) {
  const supabase = await createClient();
  const start = performance.now();

  const company_name = formData.get('company_name') as string;
  // Resolve or create the company link if the user changes the manufacturer/company
  const companyId = await getOrCreateCompanyAmr(
    supabase, 
    company_name, 
    formData.get('country_of_origin') as string
  );

  const { error } = await supabase
    .from('permits')
    .update({
      permit_number: formData.get('nafdac_reg_no'),
      product_name: formData.get('product_name'),
      company_id: companyId,
      shipping_pack_size: formData.get('shipping_pack_size'),
      active_substance: formData.get('active_substance'),
      route_of_administration: formData.get('route_of_administration'),
      strength: formData.get('strength'),
      dosage_form: formData.get('dosage_form'),
      therapeutic_class: formData.get('therapeutic_class'),
      atc_id: formData.get('atc_id'),
      // Assuming country_of_origin is a column in your permits table:
    })
    .eq('id', id);

  console.log(`QMS Audit: Update for '${id}' took ${performance.now() - start}ms`);

  if (error) return { success: false, message: error.message };

  revalidatePath('/Vetstat/Ledger');
  return { success: true };
}