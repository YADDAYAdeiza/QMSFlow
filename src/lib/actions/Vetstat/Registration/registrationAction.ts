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

  if (existing) {
    console.log(`QMS Audit: Company cached hit for '${trimmedName}' took ${performance.now() - start}ms`);
    return existing.id;
  }

  // Explicitly mapping country_of_origin here inside the companies catalog table layout
  const { data: created, error } = await supabase
    .from('companies_amr')
    .insert([{ company_name: trimmedName, country_of_origin: country?.trim() || null }])
    .select('id')
    .single();

  if (error) {
    // Defensive parallel conflict fallback execution
    const { data: retry } = await supabase
      .from('companies_amr')
      .select('id')
      .ilike('company_name', trimmedName)
      .maybeSingle();
      
    console.log(`QMS Audit: Company fallback retry for '${trimmedName}' took ${performance.now() - start}ms`);
    return retry?.id || null;
  }

  console.log(`QMS Audit: Company new record sync for '${trimmedName}' took ${performance.now() - start}ms`);
  return created?.id;
}

export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  const start = performance.now(); // QMS Compliance timing

  // Extract variables securely from incoming client layout payload
  const nafdac_reg_no = formData.get('nafdac_reg_no') as string;
  const product_name = formData.get('product_name') as string;
  const company_name = formData.get('company_name') as string;
  const shipping_pack_size = formData.get('shipping_pack_size') as string;
  const country_of_origin = formData.get('country_of_origin') as string;
  const active_substance = formData.get('active_substance') as string;
  const strength = formData.get('strength') as string;
  const route_of_administration = formData.get('route_of_administration') as string;
  const dosage_form = formData.get('dosage_form') as string;
  const therapeutic_class = formData.get('therapeutic_class') as string;
  
  // Handle structural IDs (safely check for empty string pass-throughs)
  const atc_id = formData.get('atc_id') ? (formData.get('atc_id') as string) : null;
  const structuralCompanyId = formData.get('company_id') ? (formData.get('company_id') as string) : null;

  // Resolve structural ID: Pass country_of_origin to handle new company records cleanly
  let resolvedCompanyId = structuralCompanyId;
  if (!resolvedCompanyId && company_name) {
    resolvedCompanyId = await getOrCreateCompanyAmr(supabase, company_name, country_of_origin);
  }

  // Removed "country_of_origin" column from permits context entirely
  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: nafdac_reg_no,
      product_name,
      company_id: resolvedCompanyId, // Linked relational structural reference identifier
      shipping_pack_size,
      active_substance,
      atc_id,
      strength,
      route_of_administration,
      dosage_form,        
      therapeutic_class,  
      status: 'Original',
      dir_type: 'VMD' // Uniform Master Directorate Routing Code
    }])
    .select('id')
    .single();

  console.log(`QMS Audit: Enrollment registration process for '${product_name}' took ${performance.now() - start}ms`);

  if (error) {
    console.error("FPP Registration Error Details:", error);
    return { 
      success: false, 
      message: error.code === '23505' ? "Conflict: Registration number already exists." : error.message 
    };
  }
  
  revalidatePath('/Vetstat/Ledger');
  return { success: true, permit_id: data.id };
}

export async function updateFPPRegistration(id: string, formData: FormData) {
  const supabase = await createClient();
  const start = performance.now(); // QMS Compliance timing
  
  const company_name = formData.get('company_name') as string;
  const country_of_origin = formData.get('country_of_origin') as string;
  const structuralCompanyId = formData.get('company_id') ? (formData.get('company_id') as string) : null;

  // Resolve structural ID: Secure origin assignment during dynamic update additions
  let resolvedCompanyId = structuralCompanyId;
  if (!resolvedCompanyId && company_name) {
    resolvedCompanyId = await getOrCreateCompanyAmr(supabase, company_name, country_of_origin);
  }

  // Removed "country_of_origin" column from permits context entirely
  const { error } = await supabase
    .from('permits')
    .update({
      permit_number: formData.get('nafdac_reg_no'),
      product_name: formData.get('product_name'),
      company_id: resolvedCompanyId, // Correctly references relational ID mapping
      shipping_pack_size: formData.get('shipping_pack_size'),
      active_substance: formData.get('active_substance'),
      route_of_administration: formData.get('route_of_administration'),
      strength: formData.get('strength'),
      dosage_form: formData.get('dosage_form'),
      therapeutic_class: formData.get('therapeutic_class'),
      atc_id: formData.get('atc_id') ? (formData.get('atc_id') as string) : null,
    })
    .eq('id', id);

  console.log(`QMS Audit: Modification execution trace for item ID ${id} took ${performance.now() - start}ms`);

  if (error) {
    console.error("FPP Modification System Error:", error);
    return { success: false, message: error.message };
  }
  
  revalidatePath('/Vetstat/Ledger');
  revalidatePath('/Vetstat/Dashboard');
  
  return { success: true };
}