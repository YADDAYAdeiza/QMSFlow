'use server';

import { createClient } from '@/utils/supabase/server';

export async function createPermitHeader(data: { permit_number: string, company_name: string }) {
  const supabase = await createClient();
  return await supabase.from('permits').insert([data]).select().single();
}


export async function addPermitSubstance(data: {
  permit_id: string,
  substance_id: string,
  quantity_kg: number,
  type: 'ORIGINAL' | 'AMENDMENT',
  justification_id?: number
}) {
  const supabase = await createClient();
  
  // If it's an amendment, ensure a justification is provided
  if (data.type === 'AMENDMENT' && !data.justification_id) {
    throw new Error("Justification is required for amendments.");
  }

  return await supabase.from('permit_substances').insert([data]);
}

// lib/actions/Vetstat/permitAction.ts

export async function logWithdrawal(permitSubstanceId: string, requestedAmount: number) {
  const supabase = await createClient();

  // 1. Get the current user for the audit trail
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Unauthorized access.");

  // 2. Fetch all authorizations (Original + Amendments) for this substance
  const { data: items, error: itemError } = await supabase
    .from('permit_substances')
    .select('quantity_kg')
    .eq('id', permitSubstanceId);
  
  if (itemError) throw itemError;

  const totalAuthorized = items?.reduce((sum, i) => sum + Number(i.quantity_kg), 0) || 0;

  // 3. Get total previous withdrawals
  const { data: withdrawals, error: withdrawalError } = await supabase
    .from('withdrawal_logs')
    .select('quantity_withdrawn_kg')
    .eq('permit_substance_id', permitSubstanceId);
    
  if (withdrawalError) throw withdrawalError;

  const totalWithdrawn = withdrawals?.reduce((sum, w) => sum + Number(w.quantity_withdrawn_kg), 0) || 0;
  
  // 4. Validate
  const remainingBalance = totalAuthorized - totalWithdrawn;

  if (requestedAmount > remainingBalance) {
    return { 
      success: false, 
      message: `Insufficient balance! Authorized: ${totalAuthorized}kg, Withdrawn: ${totalWithdrawn}kg, Remaining: ${remainingBalance}kg` 
    };
  }

  // 5. Insert Log
  const { error } = await supabase.from('withdrawal_logs').insert([{
    permit_substance_id: permitSubstanceId,
    quantity_withdrawn_kg: requestedAmount,
    inspector_id: user.id
  }]);

  if (error) return { success: false, message: 'Database error: ' + error.message };
  
  return { success: true, message: 'Withdrawal logged successfully.' };
}
// Add these to permitAction.ts

export async function getPermitsWithUtilization() {
  const supabase = await createClient();
  
  // This query joins Permits -> Substances -> Withdrawals
  // This gives you the full view needed for the dashboard
  const { data, error } = await supabase
    .from('permits')
    .select(`
      *,
      permit_substances (
        *,
        justification_reasons (*),
        withdrawal_logs (*)
      )
    `);

  if (error) throw error;
  return data;
}

// lib/actions/Vetstat/permits/permitActions.ts

export async function enrollPermitHeader(formData: FormData) {
  const supabase = await createClient();
  
  // Extract data from the form
  const permit_number = formData.get('permit_number') as string;
  const company_name = formData.get('company_name') as string;

  // Insert permit with hard-coded 'Original' status as per QMS requirement
  const { data, error } = await supabase
    .from('permits')
    .insert([{
      permit_number,
      company_name,
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

// export async function addSubstancesToPermit(
//   permit_id: string, 
//   substances: { id: string, qty: number }[],
//   isAmendment: boolean = false,
//   justification_id?: number
// ) {
//   const supabase = await createClient();
  
//   const payload = substances.map(s => ({
//     permit_id,
//     substance_id: s.id,
//     quantity_kg: s.qty,
//     type: isAmendment ? 'AMENDMENT' : 'ORIGINAL',
//     justification_id: isAmendment ? justification_id : null // Only store if amendment
//   }));

//   const { error } = await supabase.from('permit_substances').insert(payload);
//   return { success: !error, message: error?.message || 'Update successful.' };
// }

export async function savePermitEdits(permit_id: string, substances: any[]) {
  const supabase = await createClient();

  // 1. Handle Deletions: 
  // Any item with an 'id' AND marked with '_delete: true'
  const toDelete = substances.filter(s => s.id && s._delete).map(s => s.id);

  console.log('This is to be deleted: ', toDelete)
  
  if (toDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from('permit_substances')
      .delete()
      .in('id', toDelete);
    
    if (deleteError) throw deleteError;
  }

  // 2. Handle Updates: 
  // Any item with an 'id' that is NOT marked for deletion
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

  // 3. Handle Inserts: 
  // Any item without an 'id' and NOT marked for deletion
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

export async function createAmendment(permitId: string, substances: any[]) {
  const supabase = await createClient();

  // 1. Calculate new totals and prepare amendment log
  // We only care about rows where additional_qty > 0
  const amendments = substances.filter(s => s.additional_qty > 0);

  // 2. Perform database updates (Additive logic)
  for (const sub of amendments) {
    const newTotal = Number(sub.quantity_kg) + Number(sub.additional_qty);
    
    // Update the existing permit substance record
    await supabase
      .from('permit_substances')
      .update({ quantity_kg: newTotal })
      .eq('id', sub.id);
      
    // Optional: Insert into an 'audit_logs' or 'permit_amendments' table 
    // to track the history of the extension
    await supabase.from('permit_amendments').insert({
      permit_id: permitId,
      substance_id: sub.substance_id,
      added_qty: sub.additional_qty,
      previous_qty: sub.quantity_kg
    });
  }
}