'use server'

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

interface ActionResponse {
  success: boolean;
  message: string;
  timestamp: number;
}

export async function enrollDepotLocation(prevState: any, formData: FormData): Promise<ActionResponse> {
  const supabase = await createClient();

  const company_name = formData.get('company_name') as string;
  const depot_name = formData.get('depot_name') as string;
  const state = formData.get('state') as string;
  const physical_address = formData.get('physical_address') as string;
  const node_type = formData.get('node_type') as string; // WAREHOUSE or DEPOT separation parsing

  if (!company_name || !depot_name || !state) {
    return {
      success: false,
      message: 'Failed to process authorization. Missing critical infrastructure metrics.',
      timestamp: Date.now()
    };
  }

  const { error } = await supabase
    .from('importer_logistics_nodes')
    .insert([{
      company_name,
      depot_name,
      state,
      physical_address,
      node_type
    }]);

  if (error) {
    console.error("Supabase Storage Error Details:", JSON.stringify(error, null, 2));
    return {
      success: false,
      message: `Database failure: ${error.message || 'Check database constraint layers'}`,
      timestamp: Date.now()
    };
  }

  revalidatePath('/Vetstat/Ledger');
  return {
    success: true,
    message: `Successfully registered ${node_type === 'WAREHOUSE' ? 'Strategic Central Warehouse' : 'Regional Distribution Depot'} inside tracking networks.`,
    timestamp: Date.now()
  };
}