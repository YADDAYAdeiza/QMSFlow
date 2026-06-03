import { createClient } from '@/utils/supabase/server';
import PermitAuthDashboard from '@/components/Vetstat/Permits/PermitAuthDashboard';
import FinishedGoodsDashboard from '@/components/Vetstat/FinishedGoodsDashboard';
import DownloadMenu from '@/components/Vetstat/DownloadMenu'; 

export default async function ConsolePage() {
  const supabase = await createClient();
  
  // Parallel fetch: We now pull ledger entries, permits with their joined companies, 
  // and the entire company directory for enrollment dropdown forms.
  const [ledger, permits, companies] = await Promise.all([
    supabase.from('ledger_entries').select('*, atc_codes(*)'),
    
    // >>> CHANGED: Relational join to pull the company data directly from companies_amr
    supabase.from('permits').select('*, companies_amr(*)'),
    
    // >>> ADDED: Fetch the active company catalog for searchable comboboxes/dropdowns
    supabase.from('companies_amr').select('*').order('company_name', { ascending: true })
  ]);

  return (
    <div className="p-8 space-y-12 bg-slate-50 min-h-screen">
      <header className="flex justify-between items-center mb-10 border-b pb-6 border-slate-200">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-950">AMR Dashboard</h1>
          <p className="text-slate-600">Regulatory Oversight & Antimicrobial Stewardship</p>
        </div>
        
        {/* Export capability is placed here in the unified header */}
        <div className="flex gap-4">
          <DownloadMenu data={ledger.data || []} />
        </div>
      </header>

      <FinishedGoodsDashboard 
        ledgerData={ledger.data || []} 
        historicalData={ledger.data?.filter(i => i.entry_type === 'CONSUMPTION') || []} 
      />
      
      {/* >>> OPTIMIZED: Passing down both the normalized permits and the company master list */}
      <PermitAuthDashboard 
        permits={permits.data || []} 
        companiesCatalog={companies.data || []}
      />
    </div>
  );
}