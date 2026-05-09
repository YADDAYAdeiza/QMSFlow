import { getAMSRegionalAnalytics } from "@/lib/actions/Vetstat/fetchAnalytics";
import NigeriaMap from "@/components/Vetstat/NigeriaMap";
import { Activity, Bird, ShieldAlert, Info, Database } from 'lucide-react';

export default async function AMSDashboardPage() {
  // 1. Fetch real data from your Security Definer SQL function
  const realAnalytics = await getAMSRegionalAnalytics();
  
  // LOGGING: Useful for your debugging in the terminal
  console.log('Real Analytics Received:', realAnalytics);

  /**
   * 2. DATA PROCESSING
   * If realAnalytics returns zones but some have null keys, we filter them 
   * out for the map, but keep them for the total calculation.
   */
  const validZones = realAnalytics.zones?.filter((z: any) => z.zone !== null) || [];
  const hasRealData = validZones.length > 0;

  // Use real data if available, otherwise stay in DEMO MODE
  const analytics = hasRealData ? realAnalytics : { 
    zones: [
      { zone: "North-West", value: 1800 }, 
      { zone: "South-West", value: 500 },
      { zone: "North-Central", value: 300 },
      { zone: "South-East", value: 150 }
    ], 
    totalDDD: 2750, 
    poultryTotal: 1800 
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase">
              VMD Surveillance Hub
            </h1>
            <p className="text-slate-500 font-bold flex items-center gap-2">
              National Antimicrobial Load Monitoring 
              {hasRealData ? (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                  <Database size={10} /> LIVE DATA
                </span>
              ) : (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">
                  DEMO MODE
                </span>
              )}
            </p>
          </div>
          
          <div className="bg-white px-6 py-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
            <div className="text-right">
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Total National Volume</p>
              <p className="text-2xl font-black text-blue-600">
                {(analytics.totalDDD || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })} 
                <span className="text-xs ml-1 text-slate-400">DDD</span>
              </p>
            </div>
            <div className="p-3 bg-blue-50 rounded-xl">
              <Activity className="text-blue-500" size={24} />
            </div>
          </div>
        </div>

        {/* --- MAIN GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* THE LIVE MAP (2/3 width) */}
          <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8 relative overflow-hidden min-h-[600px]">
            <div className="absolute top-8 left-10 z-10 flex flex-col gap-1">
              <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
                <ShieldAlert size={16} className="text-rose-500" /> Geopolitical Heatmap
              </h3>
              <p className="text-[10px] text-slate-400 font-bold">Aggregated Zonal Consumption</p>
            </div>

            {/* Map component receiving the data */}
            <NigeriaMap zones={analytics.zones} />
          </div>

          {/* SIDEBAR STATS (1/3 width) */}
          <div className="space-y-6">
            
            {/* POULTRY CARD */}
            <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-lg relative overflow-hidden group">
              <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                <Bird size={120} />
              </div>
              <Bird size={32} className="mb-4 text-emerald-200" />
              <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Poultry Sector Impact</p>
              <h2 className="text-5xl font-black mt-1">
                {(analytics.poultryTotal || 0).toFixed(2)}
                <span className="text-lg ml-2 font-medium opacity-70">DDD</span>
              </h2>
              <div className="mt-6 flex items-center gap-2 text-xs text-emerald-100/80 bg-emerald-700/50 w-fit px-3 py-1.5 rounded-full">
                <span className="font-bold uppercase tracking-tighter">Target Species Focus</span>
              </div>
            </div>

            {/* REGIONAL BREAKDOWN TABLE */}
            <div className="bg-white p-8 rounded-[2.5rem] border border-slate-200 shadow-sm min-h-[300px]">
              <h4 className="text-[10px] font-black text-slate-400 uppercase mb-6 tracking-widest">Regional Breakdown</h4>
              
              <div className="space-y-4">
                {analytics.zones
                  .sort((a: any, b: any) => (b.value || 0) - (a.value || 0))
                  .map((z: any, index: number) => (
                    <div 
                      key={z.zone || `unassigned-${index}`} 
                      className="flex justify-between items-center group"
                    >
                      <div className="flex flex-col">
                        <span className="text-xs font-black text-slate-700 group-hover:text-blue-600 transition-colors uppercase">
                          {z.zone || "Unassigned"}
                        </span>
                        <div className="w-24 h-1 bg-slate-100 rounded-full mt-1 overflow-hidden">
                          <div 
                            className="h-full bg-blue-500 rounded-full transition-all duration-1000" 
                            style={{ 
                                width: `${analytics.totalDDD > 0 ? (z.value / analytics.totalDDD) * 100 : 0}%` 
                            }}
                          />
                        </div>
                      </div>
                      <div className="text-right">
                        <span className="text-sm font-black text-slate-900 tracking-tight">
                          {(z.value || 0).toLocaleString(undefined, { maximumFractionDigits: 0 })}
                        </span>
                        <p className="text-[9px] font-bold text-slate-400 uppercase">DDD</p>
                      </div>
                    </div>
                  ))}
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}