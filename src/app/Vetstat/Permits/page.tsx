import PermitPageClient from '@/components/Vetstat/Permits/PermitPageClient';
import { createClient } from '@/utils/supabase/server';

export default async function PermitsPage() {
  const supabase = await createClient();
  
  // Parallel fetch: Grabbing permits with joined companies, ATC reference codes, 
  // and the entire company master registry in a single pass.
  const [permitsResult, atcResult, companiesResult] = await Promise.all([
    // >>> CHANGED: Relational join to pull the company data directly from companies_amr
    supabase.from('permits').select(`
      *, 
      companies_amr(*),
      permit_substances(id, substance_id, quantity_kg)
    `),
    supabase.from('atc_codes').select('id, substance'),
    // >>> ADDED: Fetch the active company catalog for searchable comboboxes/dropdowns
    supabase.from('companies_amr').select('*').order('company_name', { ascending: true })
  ]);

  console.log('This is companies Result: ', companiesResult);

  return (
    <PermitPageClient 
      initialPermits={permitsResult.data || []} 
      atcCodes={atcResult.data || []} 
      // >>> ADDED: Supplying the master company collection down into client view sub-states
      companiesCatalog={companiesResult.data || []}
    />
  );
}