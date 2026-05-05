'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * enrollFPPHeader: Registers the master data for a Finished Pharmaceutical Product.
 * Captures the NAFDAC Registration Number and the Shipping Pack Size multiplier.
 */
export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  
  // 1. Extract Master Data from the form using the updated naming convention
  const nafdac_reg_no = formData.get('nafdac_reg_no') as string;
  const product_name = formData.get('product_name') as string;
  const company_name = formData.get('company_name') as string;
  const shipping_pack_size = formData.get('shipping_pack_size') as string;

  // 2. Perform the Insert into the permits table
  // Using nafdac_reg_no for the permit_number column to maintain backward compatibility 
  // with existing ledger logic while reflecting the new UI terminology.
  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: nafdac_reg_no, // Stored as the primary regulatory identifier
      product_name,                // Master data: Trade Name
      company_name,                // Master data: Marketing Authorization Holder (MAH)
      shipping_pack_size,          // Master data: Multiplier (e.g., 40x2x10)
      status: 'Original',          // Hard-coded as per QMS requirement
      dir_type: 'VMD'              // Explicit Directorate tagging
    }])
    .select('id')
    .single();

  if (error) {
    console.error("FPP Enrollment Error:", error);
    return { 
      success: false, 
      message: error.code === '23505' 
        ? "This NAFDAC Registration Number already exists in the system." 
        : error.message 
    };
  }

  // 3. Revalidate the ledger hub to update dropdowns and record lists
  revalidatePath('/Vetstat/Ledger');

  return { success: true, permit_id: data.id };
}