'use client';
import { BarChart, LineChart, PieChart } from './Charts';
import { ClipboardList } from 'lucide-react';

export default function FinishedGoodsDashboard({ ledgerData }: { ledgerData: any[] }) {
  // 1. Calculate Aggregates
  const imports = ledgerData?.filter(i => i.entry_type === 'IMPORT') || [];
  const consumption = ledgerData?.filter(i => i.entry_type === 'CONSUMPTION') || [];

  const totalImports = imports.reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0);
  const totalConsumption = consumption.reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0);

  // 2. Pie Chart: Consumption by Class
  const consumptionByClass = consumption.reduce((acc: any, curr) => {
    const className = curr.atc_codes?.class || 'Unclassified';
    acc[className] = (acc[className] || 0) + (curr.ddd_consumed || 0);
    return acc;
  }, {});

  // 3. Line Chart: Consumption Trends by Risk Priority
  const uniqueDates = Array.from(new Set(consumption.map(i => new Date(i.created_at).toLocaleDateString()))).sort();
  
  const trendDataByRisk = consumption.reduce((acc, curr) => {
    const risk = curr.atc_codes?.risk_priority || 'UNRATED';
    const date = new Date(curr.created_at).toLocaleDateString();
    
    if (!acc[risk]) acc[risk] = {};
    acc[risk][date] = (acc[risk][date] || 0) + (curr.ddd_consumed || 0);
    return acc;
  }, {} as Record<string, Record<string, number>>);

  const riskColors: Record<string, string> = {
    'CRITICAL': '#ef4444',
    'HIGHLY IMPORTANT': '#f59e0b',
    'IMPORTANT': '#2563eb',
    'UNRATED': '#94a3b8'
  };

  const lineDatasets = Object.keys(trendDataByRisk).map((risk) => ({
    label: risk,
    data: uniqueDates.map(date => trendDataByRisk[risk][date] || 0),
    borderColor: riskColors[risk] || '#64748b',
    backgroundColor: (riskColors[risk] || '#64748b') + '20',
    tension: 0.3,
    fill: true,
  }));

  return (
    <section className="space-y-8">
      <h2 className="text-2xl font-bold text-blue-950 flex items-center gap-2">
        <ClipboardList className="text-blue-600" /> Finished Goods & Stewardship Hub
      </h2>
      
      {/* Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-500">Total Imports (DDD)</h3>
          <p className="text-4xl font-black mt-2 text-blue-800">{totalImports.toFixed(1)}</p>
        </div>
        <div className="bg-white p-6 rounded-xl border border-blue-100 shadow-sm">
          <h3 className="text-sm font-bold uppercase text-blue-500">Total Consumption (DDD)</h3>
          <p className="text-4xl font-black mt-2 text-blue-800">{totalConsumption.toFixed(1)}</p>
        </div>
      </div>

      {/* Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Mass Balance</h3>
          <BarChart labels={['Imports', 'Consumption']} values={[totalImports, totalConsumption]} />
        </div>
        <div className="bg-white p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Consumption Trend by Risk Priority</h3>
          {lineDatasets.length > 0 ? (
            <LineChart labels={uniqueDates} datasets={lineDatasets} />
          ) : (
            <p className="text-sm text-slate-400 italic">No consumption trend data available.</p>
          )}
        </div>
        <div className="bg-white p-6 rounded-xl border border-blue-100">
          <h3 className="text-sm font-bold uppercase text-blue-500 mb-6">Consumption by Class</h3>
          <PieChart labels={Object.keys(consumptionByClass)} values={Object.values(consumptionByClass)} />
        </div>
      </div>
    </section>
  );
}