import { createClient } from '@/utils/supabase/server';
import PermitAuthDashboard from '@/components/Vetstat/Permits/PermitAuthDashboard';
import FinishedGoodsDashboard from '@/components/Vetstat/FinishedGoodsDashboard';
import DownloadMenu from '@/components/Vetstat/DownloadMenu'; // Re-importing your export tool

export default async function ConsolePage() {
  const supabase = await createClient();
  
  // Parallel fetch
  const [ledger, permits] = await Promise.all([
    supabase.from('ledger_entries').select('*, atc_codes(*)'),
    supabase.from('permits').select('*')
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
      
      <PermitAuthDashboard permits={permits.data || []} />
    </div>
  );
}