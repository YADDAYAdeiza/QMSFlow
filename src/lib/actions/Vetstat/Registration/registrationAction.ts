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
      permit_number: nafdac_reg_no,
      product_name,
      company_name,
      shipping_pack_size,
      country_of_origin,
      active_substance,
      atc_id,
      strength,
      route_of_administration,
      dosage_form,        
      therapeutic_class,  
      status: 'Original',
      dir_type: 'VMD' 
    }])
    .select('id')
    .single();


  console.log(`QMS Audit: Enrollment '${formData.get('product_name')}' took ${performance.now() - start}ms`);

  if (error) return { success: false, message: error.code === '23505' ? "Conflict: Registration exists." : error.message };
  
  revalidatePath('/Vetstat/Ledger');
  return { success: true, permit_id: data.id };
}

export async function updateFPPRegistration(id: string, formData: FormData) {
  const supabase = await createClient();
  
  // Fully tracking the complete entity map during data modification events
  const payload = {
    permit_number: formData.get('nafdac_reg_no'),
    product_name: formData.get('product_name'),
    company_name: formData.get('company_name'),
    shipping_pack_size: formData.get('shipping_pack_size'),
    active_substance: formData.get('active_substance'),
    strength: formData.get('strength'),
    route_of_administration: formData.get('route_of_administration'),
    dosage_form: formData.get('dosage_form'),        // Now safely retained on record updates
    therapeutic_class: formData.get('therapeutic_class'),  // Now safely retained on record updates
  };

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

  if (error) {
    console.error("FPP Modification Error:", error);
    return { success: false, message: error.message };
  }
  
  revalidatePath('/Vetstat/Ledger');
  revalidatePath('/Vetstat/Dashboard');
  
  return { success: true };
}
