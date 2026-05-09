// components/Vetstat/AMSDashboard.tsx
'use client'

import { useMemo } from 'react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer, 
  Cell 
} from 'recharts';
import { MapIcon, Activity, Bird, Table as TableIcon } from 'lucide-react';

export default function AMSDashboard({ data }: { data: any[] }) {
  
  // Aggregate data by Geopolitical Zone
  const zoneStats = useMemo(() => {
    const stats: Record<string, number> = {
      "North-Central": 0, "North-East": 0, "North-West": 0,
      "South-East": 0, "South-South": 0, "South-West": 0
    };
    
    data.forEach(entry => {
      if (entry.geopolitical_zone && stats[entry.geopolitical_zone] !== undefined) {
        stats[entry.geopolitical_zone] += entry.ddd_consumed || 0;
      }
    });
    
    return Object.entries(stats).map(([name, ddd]) => ({ name, ddd }));
  }, [data]);

  // Aggregate data by Species (to see the Poultry vs Livestock split)
  const speciesStats = useMemo(() => {
    const stats: Record<string, number> = {};
    data.forEach(entry => {
      const s = entry.target_species || "Unknown";
      stats[s] = (stats[s] || 0) + (entry.ddd_consumed || 0);
    });
    return Object.entries(stats).map(([name, ddd]) => ({ name, ddd }));
  }, [data]);

  return (
    <div className="space-y-6 p-6 bg-slate-50 min-h-screen">
      {/* HEADER STATS */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total National DDD</p>
          <h2 className="text-3xl font-black text-blue-600">
            {zoneStats.reduce((a, b) => a + b.ddd, 0).toFixed(2)}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Highest Pressure Zone</p>
          <h2 className="text-3xl font-black text-rose-600">
            {zoneStats.sort((a,b) => b.ddd - a.ddd)[0]?.name || 'N/A'}
          </h2>
        </div>
        <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Sector</p>
          <h2 className="text-3xl font-black text-emerald-600 flex items-center gap-2">
            <Bird size={28}/> {speciesStats.sort((a,b) => b.ddd - a.ddd)[0]?.name || 'N/A'}
          </h2>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* MAP PLACEHOLDER - In a real app, you'd insert the SVG Map here */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200 min-h-[400px] flex flex-col items-center justify-center relative overflow-hidden">
          <div className="absolute top-6 left-8">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2">
              <MapIcon size={16} className="text-blue-500" /> Geopolitical Heatmap
            </h3>
            <p className="text-[10px] text-slate-400 font-bold">DDD Concentration by Zone</p>
          </div>
          
          {/* Visual Placeholder for the Nigeria SVG */}
          <div className="w-64 h-64 bg-blue-50 rounded-full flex items-center justify-center border-4 border-dashed border-blue-100 italic text-blue-300 text-xs text-center p-8">
            [Nigeria SVG Map Component Loads Here - Zones color-coded by DDD value]
          </div>
        </div>

        {/* SPECIES BREAKDOWN */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-200">
           <h3 className="text-sm font-black text-slate-800 uppercase tracking-tighter flex items-center gap-2 mb-6">
              <Activity size={16} className="text-emerald-500" /> Species Utilization
           </h3>
           <div className="h-[300px]">
             <ResponsiveContainer width="100%" height="100%">
               <BarChart data={speciesStats} layout="vertical">
                 <XAxis type="number" hide />
                 <YAxis dataKey="name" type="category" width={150} tick={{fontSize: 10, fontWeight: 'bold'}} />
                 <Tooltip 
                    contentStyle={{borderRadius: '15px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)'}}
                 />
                 <Bar dataKey="ddd" radius={[0, 10, 10, 0]}>
                   {speciesStats.map((entry, index) => (
                     <Cell key={`cell-${index}`} fill={index === 0 ? '#10b981' : '#3b82f6'} />
                   ))}
                 </Bar>
               </BarChart>
             </ResponsiveContainer>
           </div>
        </div>
      </div>
    </div>
  );
}