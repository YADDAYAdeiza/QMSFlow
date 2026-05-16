'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * enrollFPPHeader: Registers the master data for a Finished Pharmaceutical Product.
 * Captures the NAFDAC Registration Number and the Shipping Pack Size multiplier.
 */
/**
 * Enrolls a Finished Pharmaceutical Product (FPP) header into the registry.
 * This function maps the product to its active substance (API) and MAH.
 */
export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  
  // Extracting all relevant regulatory data
  const nafdac_reg_no = formData.get('nafdac_reg_no') as string;
  const product_name = formData.get('product_name') as string;
  const company_name = formData.get('company_name') as string;
  const shipping_pack_size = formData.get('shipping_pack_size') as string;
  const active_substance = formData.get('active_substance') as string; 
  
  // FIXED: Capturing the missing strength and route data
  const strength = formData.get('strength') as string;
  const route_of_administration = formData.get('route_of_administration') as string;

  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: nafdac_reg_no,
      product_name,
      company_name,
      shipping_pack_size,
      active_substance,
      strength,                // Now being saved!
      route_of_administration, // Now being saved!
      status: 'Original',
      dir_type: 'VMD' 
    }])
    .select('id')
    .single();

  if (error) {
    console.error("FPP Enrollment Error:", error);
    return { 
      success: false, 
      message: error.code === '23505' 
        ? "Conflict: This Registration Number already exists in the registry." 
        : error.message 
    };
  }

  revalidatePath('/Vetstat/Ledger');
  revalidatePath('/Vetstat/Dashboard');
  
  return { success: true, permit_id: data.id };
}

// Ensure your updateFPPRegistration matches this as well
export async function updateFPPRegistration(id: string, formData: FormData) {
  const supabase = await createClient();
  
  const payload = {
    permit_number: formData.get('nafdac_reg_no'),
    product_name: formData.get('product_name'),
    company_name: formData.get('company_name'),
    shipping_pack_size: formData.get('shipping_pack_size'),
    active_substance: formData.get('active_substance'),
    strength: formData.get('strength'),
    route_of_administration: formData.get('route_of_administration'),
  };

  const { error } = await supabase
    .from('permits')
    .update(payload)
    .eq('id', id);

  if (error) return { success: false, message: error.message };
  
  revalidatePath('/Vetstat/Ledger');
  return { success: true };
}

// export async function updateFPPRegistration(id: string, formData: FormData) {
//   const supabase = await createClient();
  
//   const updates = {
//     permit_number: formData.get('nafdac_reg_no') as string,
//     product_name: formData.get('product_name') as string,
//     company_name: formData.get('company_name') as string,
//     shipping_pack_size: formData.get('shipping_pack_size') as string,
//     active_substance: formData.get('active_substance') as string,
//   };

//   const { error } = await supabase
//     .from('permits')
//     .update(updates)
//     .eq('id', id);

//   if (error) return { success: false, message: error.message };
  
//   revalidatePath('/Vetstat/Ledger');
//   return { success: true };
// }