import { createClient } from '@/utils/supabase/server';
import { BarChart, LineChart, PieChart } from '@/components/Vetstat/Charts';
import DownloadMenu from '@/components/Vetstat/DownloadMenu';

export default async function VetstatDashboard() {
  const supabase = await createClient();
  
  // 1. Fetch data with explicit error handling
  const [{ data: fullLedger, error: ledgerError }, { data: historical, error: histError }] = await Promise.all([
    supabase.from('ledger_entries').select(`
      *,
      atc_codes (class, risk_priority, substance)
    `),
    supabase.from('ledger_entries')
      .select('ddd_consumed, created_at')
      .eq('entry_type', 'CONSUMPTION')
      .order('created_at', { ascending: true })
  ]);

  // 2. Graceful Error Handling: Prevent crashes if DB access is denied
  if (ledgerError || histError) {
    return (
      <div className="p-8 text-red-700 bg-red-50 border border-red-200 rounded-lg">
        <h2 className="text-xl font-bold">Database Access Issue</h2>
        <p>We could not retrieve the ledger data. Please check your SQL permissions (GRANT SELECT) in Supabase.</p>
        <pre className="mt-4 text-xs bg-white p-2 border">{ledgerError?.message || histError?.message}</pre>
      </div>
    );
  }

  // 3. Safe calculations (Only executed if data fetch succeeded)
  const totalImports = fullLedger?.filter(i => i.entry_type === 'IMPORT').reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0) || 0;
  const totalConsumption = fullLedger?.filter(i => i.entry_type === 'CONSUMPTION').reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0) || 0;

  const consumptionByClass = fullLedger
    ?.filter(i => i.entry_type === 'CONSUMPTION')
    .reduce((acc: any, curr) => {
      const className = curr.atc_codes?.class || 'Unclassified';
      acc[className] = (acc[className] || 0) + (curr.ddd_consumed || 0);
      return acc;
    }, {});

  const lineLabels = historical?.map(item => new Date(item.created_at).toLocaleDateString()) || [];
  const lineValues = historical?.map(item => item.ddd_consumed || 0) || [];

  return (
    <div className="p-8 bg-slate-50 min-h-screen text-blue-900">
      <header className="flex justify-between items-center mb-10 border-b pb-6 border-blue-200">
        <h1 className="text-3xl font-extrabold text-blue-950">Antimicrobial Stewardship Hub</h1>
        <div className="flex gap-4">
          <DownloadMenu data={fullLedger || []} />
          <a href="/Vetstat/Ledger" className="bg-blue-600 text-white px-6 py-2 rounded-lg font-semibold hover:bg-blue-700 transition">
            Log Entry
          </a>
        </div>
      </header>

      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500">Total Imports (DDD)</h3>
          <p className="text-4xl font-black mt-2 text-blue-800">{totalImports.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500">Total Consumption (DDD)</h3>
          <p className="text-4xl font-black mt-2 text-blue-800">{totalConsumption.toFixed(1)}</p>
        </div>
      </div>
      
      {/* Visualizations Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Mass Balance</h3>
          <BarChart labels={['Imports', 'Consumption']} values={[totalImports, totalConsumption]} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Consumption Velocity</h3>
          <LineChart labels={lineLabels} values={lineValues} />
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Market Composition</h3>
          <PieChart 
            labels={Object.keys(consumptionByClass || {})} 
            values={Object.values(consumptionByClass || {})} 
          />
        </div>
      </div>
    </div>
  );
}