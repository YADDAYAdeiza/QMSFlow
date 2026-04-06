// components/management/AnalyticsView.tsx
import React from 'react';
import AnalyticsClient from "@/components/AnalyticsClient";
import { Activity, ShieldAlert, Search, BarChart3 } from "lucide-react";

interface SystemMetrics {
  critical: number;
  major: number;
  other: number;
  total: number;
}

interface AnalyticsViewProps {
  stats: Record<string, SystemMetrics>;
}

export default function AnalyticsView({ stats }: AnalyticsViewProps) {
  // 1. Transform the record into an array for Recharts (Radar/Bar Chart)
  const chartData = Object.entries(stats).map(([name, data]) => ({
    subject: name.replace(" System", ""), // Shortens "Materials System" to "Materials"
    total: data.total,
    critical: data.critical,
    // Provide a buffer for the chart scale
    fullMark: Math.max(...Object.values(stats).map(s => s.total)) + 2,
  }));

  // 2. Calculate Aggregate Totals for Top Cards
  const totalDeficiencies = Object.values(stats).reduce((acc, s) => acc + s.total, 0);
  const totalCritical = Object.values(stats).reduce((acc, s) => acc + s.critical, 0);
  const highRiskSystems = Object.values(stats).filter(s => s.critical > 0).length;

  return (
    <div className="space-y-10 font-sans">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
        <div>
          <h1 className="text-4xl font-black tracking-tighter text-slate-900 uppercase">
            National GMP Health
          </h1>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
            Regulatory Intelligence • VMAP Findings Ledger
          </p>
        </div>
        
        <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
           <div className="text-right">
              <p className="text-[9px] font-black text-slate-400 uppercase leading-none mb-1">QMS Status</p>
              <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest leading-none">Live Data Feed</p>
           </div>
           <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        </div>
      </div>

      {/* AGGREGATE STATS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Total Citations" 
          value={totalDeficiencies} 
          icon={<Search className="w-5 h-5" />}
          color="text-blue-600"
          subtitle="All findings across ledger"
        />
        <StatCard 
          title="Critical Failures" 
          value={totalCritical} 
          icon={<ShieldAlert className="w-5 h-5" />}
          color="text-rose-600"
          subtitle="Immediate remediation required"
        />
        <StatCard 
          title="Affected Systems" 
          value={`${highRiskSystems}/6`} 
          icon={<Activity className="w-5 h-5" />}
          color="text-amber-600"
          subtitle="Systems with critical risks"
        />
      </div>

      {/* VISUAL ANALYTICS & BREAKDOWN */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* RADAR/CHART PANEL */}
        <div className="lg:col-span-7 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px] flex flex-col">
           <div className="mb-10">
             <div className="flex items-center gap-2 mb-1">
                <BarChart3 className="w-4 h-4 text-blue-600" />
                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">
                    System Density Map
                </h3>
             </div>
             <p className="text-[11px] text-slate-400 font-medium italic">
                Cross-sectional view of deficiencies by PIC/S System category.
             </p>
           </div>
           
           <div className="flex-1 w-full h-full min-h-[350px]">
                <AnalyticsClient data={chartData} />
           </div>
        </div>

        {/* SYSTEM LISTING & RANKING */}
        <div className="lg:col-span-5 space-y-4">
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">
            Detailed System Breakdown
          </h3>
          
          {Object.entries(stats)
            .sort((a, b) => b[1].total - a[1].total) // Rank by most deficiencies
            .map(([name, data]) => (
            <div 
                key={name} 
                className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-300 hover:shadow-md transition-all flex items-center justify-between group"
            >
              <div className="max-w-[60%]">
                <p className="text-[11px] font-black text-slate-800 group-hover:text-blue-700 transition-colors truncate">
                    {name}
                </p>
                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">
                    {data.total} Total recorded findings
                </p>
              </div>
              
              <div className="flex gap-2">
                 <div className={`px-3 py-1 rounded-full border ${data.critical > 0 ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-slate-50 border-slate-100 text-slate-300'}`}>
                    <p className="text-[9px] font-black">{data.critical} CRIT</p>
                 </div>
                 <div className="px-3 py-1 bg-slate-50 border border-slate-100 rounded-full text-slate-500">
                    <p className="text-[9px] font-black">{data.major} MAJ</p>
                 </div>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}

/**
 * Internal Helper: StatCard
 */
function StatCard({ title, value, icon, color, subtitle }: any) {
  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 flex items-center justify-between group hover:border-blue-100 transition-colors">
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">
            {title}
        </p>
        <p className={`text-4xl font-black tracking-tighter ${color}`}>
            {value}
        </p>
        <p className="text-[9px] font-bold text-slate-300 uppercase mt-1">
            {subtitle}
        </p>
      </div>
      <div className="p-4 bg-slate-50 rounded-3xl text-slate-300 group-hover:bg-blue-50 group-hover:text-blue-400 transition-colors">
        {icon}
      </div>
    </div>
  );
}