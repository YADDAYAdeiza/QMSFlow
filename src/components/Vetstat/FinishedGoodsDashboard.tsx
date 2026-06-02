'use client';

import { useMemo } from 'react';
import { BarChart, LineChart, PieChart } from './Charts';
import { ClipboardList, TrendingUp, AlertCircle } from 'lucide-react';

interface LedgerEntry {
  id: string;
  entry_type: 'IMPORT' | 'CONSUMPTION';
  ddd_consumed?: number;
  created_at: string;
  atc_codes?: {
    class?: string;
    risk_priority?: string;
  };
}

interface FinishedGoodsDashboardProps {
  ledgerData: LedgerEntry[];
}

export default function FinishedGoodsDashboard({ ledgerData = [] }: FinishedGoodsDashboardProps) {
  
  // Wrap intensive analytical mutations in a useMemo hook to safeguard rendering pipelines
  const { totalImports, totalConsumption, consumptionByClass, uniqueDates, lineDatasets } = useMemo(() => {
    
    // 1. Filter and Calculate Core Aggregates
    const imports = ledgerData.filter(i => i.entry_type === 'IMPORT');
    const consumption = ledgerData.filter(i => i.entry_type === 'CONSUMPTION');

    const calculatedImports = imports.reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0);
    const calculatedConsumption = consumption.reduce((acc, curr) => acc + (curr.ddd_consumed || 0), 0);

    // 2. Aggregate Consumption by Active Class
    const derivedClassMap = consumption.reduce((acc: Record<string, number>, curr) => {
      const className = curr.atc_codes?.class || 'Unclassified';
      acc[className] = (acc[className] || 0) + (curr.ddd_consumed || 0);
      return acc;
    }, {});

    // 3. Chronological Resolution: Generate deterministic timestamps to ensure correct timeline sorting
    const sortedTimelineDates = Array.from(
      new Set(consumption.map(i => new Date(i.created_at).setHours(0, 0, 0, 0)))
    ).sort((a, b) => a - b); // Numerical calendar-day sort execution

    // Transform timestamps into localized date string tokens for Chart axis components
    const readableLabels = sortedTimelineDates.map(timestamp => 
      new Date(timestamp).toLocaleDateString()
    );

    // 4. Trace Consumption Trends mapped explicitly across Risk Priorities
    const trendDataByRisk = consumption.reduce((acc, curr) => {
      const risk = curr.atc_codes?.risk_priority || 'UNRATED';
      const dateString = new Date(curr.created_at).toLocaleDateString();
      
      if (!acc[risk]) acc[risk] = {};
      acc[risk][dateString] = (acc[risk][dateString] || 0) + (curr.ddd_consumed || 0);
      return acc;
    }, {} as Record<string, Record<string, number>>);

    const riskColors: Record<string, string> = {
      'CRITICAL': '#ef4444',       // Rose-Red
      'HIGHLY IMPORTANT': '#f59e0b', // Amber
      'IMPORTANT': '#2563eb',      // Blue
      'UNRATED': '#94a3b8'         // Slate
    };

    const datasets = Object.keys(trendDataByRisk).map((risk) => ({
      label: risk,
      data: readableLabels.map(date => trendDataByRisk[risk][date] || 0),
      borderColor: riskColors[risk] || '#64748b',
      backgroundColor: (riskColors[risk] || '#64748b') + '10', // Soft 6% opacity fill context
      tension: 0.3,
      fill: true,
    }));

    return {
      totalImports: calculatedImports,
      totalConsumption: calculatedConsumption,
      consumptionByClass: derivedClassMap,
      uniqueDates: readableLabels,
      lineDatasets: datasets
    };
  }, [ledgerData]);

  return (
    <section className="space-y-8 animate-in fade-in duration-300">
      <div className="flex justify-between items-center border-b border-slate-100 pb-4">
        <h2 className="text-xl font-black text-slate-900 flex items-center gap-2.5 uppercase tracking-tight">
          <ClipboardList className="text-blue-600" size={22} /> 
          <span>Finished Goods & Stewardship Hub</span>
        </h2>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-blue-50 border border-blue-100 rounded-full text-[10px] font-bold text-blue-700 uppercase tracking-wider">
          <TrendingUp size={12} />
          <span>Real-time Surveillance Analytics</span>
        </div>
      </div>
      
      {/* Metric Cards Grid Layout */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Monitored Imports</h3>
          <p className="text-4xl font-black mt-2 text-slate-900 tracking-tight">
            {totalImports.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5 uppercase font-mono">DDD</span>
          </p>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Total Aggregated Consumption</h3>
          <p className="text-4xl font-black mt-2 text-slate-900 tracking-tight">
            {totalConsumption.toLocaleString(undefined, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            <span className="text-xs font-bold text-slate-400 ml-1.5 uppercase font-mono">DDD</span>
          </p>
        </div>
      </div>

      {/* Visualizations Grid Layout Block */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Bar Chart: Mass Balance Representation */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Mass Balance Comparison</h3>
          <div className="flex-1 flex items-center">
            <BarChart labels={['Total Imports', 'Total Consumption']} values={[totalImports, totalConsumption]} />
          </div>
        </div>
        
        {/* Line Chart: Multi-Variant Temporal Stewardship Trends */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Consumption Trend by Risk Classification</h3>
          <div className="flex-1 flex items-center justify-center">
            {lineDatasets.length > 0 ? (
              <LineChart labels={uniqueDates} datasets={lineDatasets} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <AlertCircle size={20} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400 uppercase italic">No surveillance timeline vectors recorded</p>
              </div>
            )}
          </div>
        </div>
        
        {/* Pie Chart: Volumetric Shares of Active Drug Classes */}
        <div className="bg-white p-6 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between">
          <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-widest mb-6">Proportional Share by ATC Class</h3>
          <div className="flex-1 flex items-center justify-center">
            {Object.keys(consumptionByClass).length > 0 ? (
              <PieChart labels={Object.keys(consumptionByClass)} values={Object.values(consumptionByClass)} />
            ) : (
              <div className="flex flex-col items-center gap-2 text-center py-8">
                <AlertCircle size={20} className="text-slate-300" />
                <p className="text-xs font-bold text-slate-400 uppercase italic">No active category indices matched</p>
              </div>
            )}
          </div>
        </div>

      </div>
    </section>
  );
}