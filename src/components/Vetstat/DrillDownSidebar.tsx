'use client';

import { useState } from 'react';
import { ChevronRight, BarChart3, ArrowLeft, ShieldAlert, TrendingUp, TrendingDown } from 'lucide-react';

export default function DrillDownSidebar({ zones, totalDDD }: { zones: any[], totalDDD: number }) {
  const [selectedZone, setSelectedZone] = useState<any | null>(null);

  const sortedZones = [...zones].sort((a, b) => b.value - a.value);

  if (selectedZone) {
    return (
      <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm animate-in fade-in slide-in-from-right-4 duration-300">
        <button 
          onClick={() => setSelectedZone(null)}
          className="flex items-center gap-2 text-[10px] font-black text-blue-600 uppercase mb-6 hover:gap-3 transition-all"
        >
          <ArrowLeft size={14} /> Back to National
        </button>
        
        <div className="mb-6">
          <div className="flex justify-between items-start">
            <div>
              <h4 className="text-xl font-black text-slate-900 tracking-tight uppercase">{selectedZone.zone}</h4>
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">State-Level Breakdown</p>
            </div>
            {selectedZone.trend > 20 && (
              <span className="bg-rose-100 text-rose-600 p-2 rounded-xl animate-pulse">
                <ShieldAlert size={18} />
              </span>
            )}
          </div>
        </div>

        <div className="space-y-4">
          {selectedZone.states
            ?.sort((a: any, b: any) => b.value - a.value)
            .map((state: any) => (
              <div key={state.name} className="flex justify-between items-center group">
                <div className="flex flex-col flex-1">
                  <span className="text-xs font-black text-slate-700 uppercase">{state.name}</span>
                  <div className="w-full h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full" 
                      style={{ width: `${selectedZone.value > 0 ? (state.value / selectedZone.value) * 100 : 0}%` }}
                    />
                  </div>
                </div>
                <div className="text-right ml-4">
                  <span className="text-sm font-black text-slate-900">{state.value.toLocaleString()}</span>
                  <p className="text-[9px] font-bold text-slate-400 uppercase">DDD</p>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white p-8 rounded-[3.5rem] border border-slate-200 shadow-sm">
      <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest flex items-center gap-2">
        <BarChart3 size={14} /> Regional Load & Trends
      </h4>
      <div className="space-y-4">
        {sortedZones.map((z) => {
          const isHighAlert = z.trend > 20;
          return (
            <button 
              key={z.zone} 
              onClick={() => setSelectedZone(z)}
              className="w-full flex justify-between items-center group text-left hover:bg-slate-50 p-2 -m-2 rounded-xl transition-all"
            >
              <div className="flex flex-col">
                <span className={`text-xs font-black uppercase transition-colors ${isHighAlert ? 'text-rose-600' : 'text-slate-700 group-hover:text-blue-600'}`}>
                  {z.zone}
                </span>
                <div className="w-20 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                  <div 
                    className={`h-full transition-all ${isHighAlert ? 'bg-rose-500' : 'bg-slate-400 group-hover:bg-blue-500'}`} 
                    style={{ width: `${totalDDD > 0 ? (z.value / totalDDD) * 100 : 0}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <span className="text-sm font-black text-slate-900">{z.value.toLocaleString()}</span>
                  <div className={`text-[9px] font-bold uppercase flex items-center justify-end gap-0.5 ${
                    z.trend > 20 ? 'text-rose-500' : z.trend < 0 ? 'text-emerald-500' : 'text-slate-400'
                  }`}>
                    {z.trend > 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                    {z.trend > 0 ? `+${z.trend.toFixed(0)}%` : `${z.trend.toFixed(0)}%`}
                    {isHighAlert && <ShieldAlert size={10} className="ml-1 animate-pulse" />}
                  </div>
                </div>
                <ChevronRight size={14} className="text-slate-300 group-hover:text-blue-500 transition-all" />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}