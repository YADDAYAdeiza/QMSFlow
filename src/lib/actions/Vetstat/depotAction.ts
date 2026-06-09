'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

/**
 * Registers master data for Finished Pharmaceutical Products (FPP).
 * Completely normalized to remove legacy permits text columns (company_name, country_of_origin)
 */
export async function enrollFPPHeader(formData: FormData) {
  const supabase = await createClient();
  const start = performance.now(); // QMS Compliance timing requirement

  const nafdac_reg_no = formData.get('nafdac_reg_no') as string;
  const product_name = formData.get('product_name') as string;
  const companyId = formData.get('company_id') as string; // Normalized structural UUID incoming from client dropdown list
  
  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number: nafdac_reg_no,
      product_name,
      company_id: companyId, // Safe relational key association mapping
      shipping_pack_size: formData.get('shipping_pack_size'),
      active_substance: formData.get('active_substance'),
      atc_id: formData.get('atc_id') || null,
      strength: formData.get('strength'),
      route_of_administration: formData.get('route_of_administration'),
      dosage_form: formData.get('dosage_form'),
      therapeutic_class: formData.get('therapeutic_class'),
      status: 'Original',
      dir_type: 'VMD' // Uniform Master Directorate Routing Code
    }])
    .select('id')
    .single();

  console.log(`QMS Audit: Enrollment registration process for '${product_name}' took ${performance.now() - start}ms`);

  if (error) {
    console.error("FPP Registration Error Details:", error);
    return { success: false, message: error.message };
  }

  revalidatePath('/Vetstat/Ledger');
  return { success: true, permit_id: data.id };
}

/**
 * Registers infrastructure logistics nodes (Warehouses/Depots).
 * Stripped of 'geopolitical_zone' to match actual schema fields exactly.
 */
export async function enrollDepotLocation(prevState: any, formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();
  const start = performance.now(); // QMS Compliance timing requirement

  const companyId = formData.get('company_id') as string;
  const depot_name = formData.get('depot_name') as string;
  const state = formData.get('state') as string;
  const physical_address = formData.get('physical_address') as string;
  const node_type = formData.get('node_type') as string;
  const duration = formData.get('qms_completion_duration_seconds');

  if (!companyId) {
    return { 
      success: false, 
      message: "Validation Exception: Marketing Authorization Holder is required.", 
      timestamp: Date.now() 
    };
  }

  // Look up master catalog plain text name to safely pass your table's NOT NULL column constraint
  const { data: companyRecord, error: companyFetchError } = await supabase
    .from('companies_amr')
    .select('company_name')
    .eq('id', companyId)
    .maybeSingle();

  if (companyFetchError || !companyRecord) {
    console.error("Relational Mapping Error Details:", companyFetchError);
    return { 
      success: false, 
      message: "Validation Exception: Failed to securely resolve structural company references.", 
      timestamp: Date.now() 
    };
  }

  // Database insert matches your actual column schema fields explicitly
  const { error } = await supabase
    .from('importer_logistics_nodes')
    .insert([{
      company_id: companyId,                    // Modern tracking primary key layout reference
      company_name: companyRecord.company_name, // Resolves the database's literal string constraint block
      depot_name,
      state,
      physical_address,
      node_type
    }]);

  console.log(`QMS Audit: Supply chain node registration took ${performance.now() - start}ms (Staff desk workflow time: ${duration}s)`);

  if (error) {
    console.error("Logistics Node Enrollment System Exception:", error);
    return { success: false, message: error.message, timestamp: Date.now() };
  }

  revalidatePath('/Vetstat/Ledger');
  return { 
    success: true, 
    message: "Infrastructure node registered successfully under VMD Oversight.", 
    timestamp: Date.now() 
  };
}