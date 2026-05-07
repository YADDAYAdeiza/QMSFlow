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
  
  // Extracting data from FormData
  const nafdac_reg_no = formData.get('nafdac_reg_no') as string;
  const product_name = formData.get('product_name') as string;
  const company_name = formData.get('company_name') as string;
  const shipping_pack_size = formData.get('shipping_pack_size') as string;
  
  // NEW: Capturing the active substance from the searchable dropdown logic
  const active_substance = formData.get('active_substance') as string; 

  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: nafdac_reg_no,
      product_name,
      company_name,
      shipping_pack_size,
      active_substance, // Links the FPP to its API for antimicrobial surveillance
      status: 'Original',
      dir_type: 'VMD' // Standardized Veterinary Medicines Division identifier
    }])
    .select('id')
    .single();

  if (error) {
    console.error("FPP Enrollment Error:", error);
    
    // Handling common Postgres errors for the UI
    return { 
      success: false, 
      message: error.code === '23505' 
        ? "Conflict: This Registration Number already exists in the registry." 
        : error.message 
    };
  }

  // Triggering Next.js cache revalidation to update the Ledger and Dashboard
  revalidatePath('/Vetstat/Ledger');
  
  return { 
    success: true, 
    permit_id: data.id 
  };
}