'use server';

import { createClient } from '@/utils/supabase/server';
import { revalidatePath } from 'next/cache';

/**
 * Helper function to handle the safe UPSERT/Retrieval of a company entity
 * in our isolated companies_amr table.
 */
async function getOrCreateCompanyAmr(supabase: any, name: string) {
  if (!name) return null;
  const trimmedName = name.trim();

  // Check if company exists
  const { data: existingCompany } = await supabase
    .from('companies_amr')
    .select('id')
    .ilike('company_name', trimmedName)
    .maybeSingle();

  if (existingCompany) return existingCompany.id;

  // Create fresh if missing
  const { data: newCompany, error } = await supabase
    .from('companies_amr')
    .insert([{ company_name: trimmedName }])
    .select('id')
    .single();

  if (error) {
    const { data: retryCompany } = await supabase
      .from('companies_amr')
      .select('id')
      .ilike('company_name', trimmedName)
      .maybeSingle();
    return retryCompany ? retryCompany.id : null;
  }

  return newCompany?.id || null;
}

export async function createPermitHeader(data: { permit_number: string, company_name: string }) {
  const supabase = await createClient();
  
  // >>> ADDED: Resolve the dynamic structural company UUID relation
  const companyId = await getOrCreateCompanyAmr(supabase, data.company_name);

  return await supabase
    .from('permits')
    .insert([{
      permit_number: data.permit_number,
      company_name: data.company_name, // Legacy dual-write support
      company_id: companyId,           // Normalized link
    }])
    .select()
    .single();
}

export async function enrollPermitHeader(formData: FormData) {
  const supabase = await createClient();
  
  // Extract data from the form
  const permit_number = formData.get('permit_number') as string;
  const company_name = formData.get('company_name') as string;

  // >>> ADDED: Resolve the dynamic structural company UUID relation
  const companyId = await getOrCreateCompanyAmr(supabase, company_name);

  // Insert permit with hard-coded 'Original' status as per QMS requirement
  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number,
      company_name,          // Legacy dual-write support
      company_id: companyId, // Normalized link
      status: 'Original' 
    }])
    .select('id')
    .single();

  if (error) {
    console.error("Enrollment Error:", error);
    return { success: false, message: error.message };
  }

  return { success: true, permit_id: data.id };
}

export async function getPermitsWithUtilization() {
  const supabase = await createClient();
  
  // >>> OPTIMIZED: We now pull companies_amr properties right through the query block 
  // to ensure dashboard views can access fields cleanly.
  const { data, error } = await supabase
    .from('permits')
    .select(`
      *,
      companies_amr (*),
      permit_substances (
        *,
        justification_reasons (*),
        withdrawal_logs (*)
      )
    `);

  if (error) throw error;
  return data;
}

export async function addPermitSubstance(data: {
  permit_id: string,
  substance_id: string,
  quantity_kg: number,
  type: 'ORIGINAL' | 'AMENDMENT',
  justification_id?: number
}) {
  const supabase = await createClient();
  
  if (data.type === 'AMENDMENT' && !data.justification_id) {
    throw new Error("Justification is required for amendments.");
  }

  return await supabase.from('permit_substances').insert([data]);
}

export async function logWithdrawal(permitSubstanceId: string, requestedAmount: number) {
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized access.");

  const { data: items, error: itemError } = await supabase
    .from('permit_substances')
    .select('quantity_kg')
    .eq('id', permitSubstanceId);
  
  if (itemError) throw itemError;

  const totalAuthorized = items?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) || 0;

  const { data: withdrawals, error: withdrawalError } = await supabase
    .from('withdrawal_logs')
    .select('quantity_withdrawn_kg')
    .eq('permit_substance_id', permitSubstanceId);
    
  if (withdrawalError) throw withdrawalError;

  const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + Number(w.quantity_withdrawn_kg), 0) || 0;
  
  const remainingBalance = totalAuthorized - totalWithdrawn;

  if (requestedAmount > remainingBalance) {
    return { 
      success: false, 
      message: `Insufficient balance! Authorized: ${totalAuthorized}kg, Withdrawn: ${totalWithdrawn}kg, Remaining: ${remainingBalance}kg` 
    };
  }

  const { error } = await supabase.from('withdrawal_logs').insert([{
    permit_substance_id: permitSubstanceId,
    quantity_withdrawn_kg: requestedAmount,
    inspector_id: user.id
  }]);

  if (error) return { success: false, message: 'Database error: ' + error.message };
  
  return { success: true, message: 'Withdrawal logged successfully.' };
}

export async function savePermitEdits(permit_id: string, substances: any[]) {
  const supabase = await createClient();

  // 1. Handle Deletions
  const toDelete = substances.filter(s => s.id && s._delete).map(s => s.id);
  console.log('This is to be deleted: ', toDelete);
  
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('permit_substances')
      .delete()
      .in('id', toDelete);
    
    if (deleteError) throw deleteError;
  }

  // 2. Handle Updates
  const toUpdate = substances
    .filter(s => s.id && !s._delete)
    .map(s => ({
      id: s.id,
      permit_id,
      substance_id: s.substance_id,
      quantity_kg: s.quantity_kg,
      type: 'ORIGINAL'
    }));

  if (toUpdate.length > 0) {
    const { error: updateError } = await supabase
      .from('permit_substances')
      .upsert(toUpdate);
    
    if (updateError) throw updateError;
  }

  // 3. Handle Inserts
  const toInsert = substances
    .filter(s => !s.id && !s._delete)
    .map(s => ({ 
      permit_id, 
      substance_id: s.substance_id, 
      quantity_kg: s.quantity_kg, 
      type: 'ORIGINAL' 
    }));

  if (toInsert.length > 0) {
    const { error: insertError } = await supabase
      .from('permit_substances')
      .insert(toInsert);
    
    if (insertError) throw insertError;
  }
  
  return { success: true };
}

export async function createAmendment(permitId: string, substances: any[], justification: string | null = null) {
  const supabase = await createClient();
  const amendments = substances.filter(s => s.additional_qty > 0);

  if (amendments.length === 0) return { success: true };

  try {
    // Run updates concurrently to minimize connection overhead
    await Promise.all(
      amendments.map(async (sub) => {
        const newTotal = Number(sub.quantity_kg) + Number(sub.additional_qty);
        
        // 1. Update the base authorized volume tracking layer
        const { error: updateError } = await supabase
          .from('permit_substances')
          .update({ quantity_kg: newTotal })
          .eq('id', sub.id);
          
        if (updateError) throw updateError;
          
        // 2. Insert into the historical audit ledger
        const { error: insertError } = await supabase
          .from('permit_amendments')
          .insert({
            permit_id: permitId,
            substance_id: sub.substance_id,
            added_qty: sub.additional_qty,
            previous_qty: sub.quantity_kg,
            justification_notes: justification // Track the validation ID string safely
          });

        if (insertError) throw insertError;
      })
    );

    return { success: true };
  } catch (error: any) {
    console.error("Critical Amendment Failure:", error);
    throw new Error(error.message || "Failed to commit quantity amendment to database.");
  }
}

/**
 * Add this to your server actions file to handle the secure, 
 * server-side lookup for the Manual Mapping Modal
 */
export async function fetchCompanyActiveAuthorizations(companyName: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('permit_substances')
      .select(`
        quantity_kg,
        substance_id,
        atc_codes!fk_atc_codes (
          substance
        ),
        permits!inner (
          permit_number,
          company_name,
          validity
        )
      `)
      .ilike('permits.company_name', `%${companyName}%`)
      .eq('permits.validity', 'Active');

    if (error) throw error;

    const formatted = (data as any[] || []).map(item => ({
      substance: item.atc_codes?.substance || 'Unknown Substance',
      permit_number: item.permits?.permit_number || 'N/A'
    }));

    return { success: true, data: formatted };
  } catch (err: any) {
    console.error("Database Authorization Query Failure:", err);
    return { success: false, error: err.message || 'Internal database linkage failure.' };
  }
}

/**
 * Safely fetches historical audit trails for a single permit asset from the server side.
 */
export async function fetchPermitLedgerLogs(permitId: string) {
  const supabase = await createClient();
  
  try {
    const { data, error } = await supabase
      .from('permit_ledger_logs')
      .select('*')
      .eq('permit_id', permitId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { success: true, data: data || [] };
  } catch (err: any) {
    console.error("Failed to compile historical ledger logs:", err);
    return { success: false, error: err.message || "Internal transaction history fetch error." };
  }
}

'use server';

import { createClient } from '@/lib/supabase/server'; // Path to your server-side client config

/**
 * Executes a replacement log configuration for intake permits
 */
export async function replacePermitSubstancesAction({
  permitId,
  filePath,
  items
}: {
  permitId: string;
  filePath: string;
  items: Array<{ substance_id: string; qty: number }>;
}) {
  const supabase = await createClient();
  
  const { error } = await supabase.rpc('replace_permit_substances', {
    p_permit_id: permitId,
    p_file_path: filePath,
    p_items: items
  });

  if (error) throw new Error(error.message);
  return { success: true };
}

/**
 * Cycles ledger deductions across active substance rows sequentially
 */
export async function deductPermitBalancesAction({
  permitId,
  filePath,
  items
}: {
  permitId: string;
  filePath: string;
  items: Array<{ substanceId: string; confirmed: string; qty: number }>;
}) {
  const supabase = await createClient();

  for (const item of items) {
    const { error } = await supabase.rpc('deduct_permit_balance', {
      p_permit_id: permitId,
      p_substance_id: item.substanceId,
      p_amount: item.qty,
      p_file_path: filePath
    });

    if (error) {
      throw new Error(`Failed to deduct ${item.confirmed}: ${error.message}`);
    }
  }

  return { success: true };
}