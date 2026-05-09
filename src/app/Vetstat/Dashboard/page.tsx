import { getAMSRegionalAnalytics } from "@/lib/actions/Vetstat/fetchAnalytics";
import NigeriaMap from "@/components/Vetstat/NigeriaMap";
import { Activity, Bird, ShieldAlert } from 'lucide-react';

export default async function AMSDashboardPage() {
  // 1. Fetch the real aggregated data from the SQL View we created
  const analytics = await getAMSRegionalAnalytics();
console.log('This is analytics: ', analytics);
  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* HEADER */}
        <div className="flex justify-between items-end">
          <div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tighter">VMD Surveillance Hub</h1>
            <p className="text-slate-500 font-bold">National Antimicrobial Load (DDD Monitoring)</p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
             <div className="text-right">
                <p className="text-[10px] font-black text-slate-400 uppercase">Total National Volume</p>
                <p className="text-xl font-black text-blue-600">{analytics.totalDDD?.toFixed(2) || 0} DDD</p>
             </div>
             <Activity className="text-blue-500" />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* THE LIVE MAP (2/3 width) */}
          {/* THE LIVE MAP (2/3 width) */}
        <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10 flex flex-col h-full">
        
        {/* Move header out of absolute positioning to give it its own space */}
        <div className="mb-8">
            <h3 className="text-sm font-black text-slate-800 uppercase flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-500" /> Geopolitical Heatmap
            </h3>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
            National Aggregate Consumption (DDD)
            </p>
        </div>

        {/* Map container with a bit of top margin to ensure no overlap */}
        <div className="flex-1 w-full mt-4">
            <NigeriaMap zones={analytics.zones} />
        </div>
        </div>

          {/* SIDEBAR STATS (1/3 width) */}
          <div className="space-y-6">
             <div className="bg-emerald-600 p-8 rounded-[2.5rem] text-white shadow-lg">
                <Bird size={40} className="mb-4 opacity-50" />
                <p className="text-xs font-black text-emerald-100 uppercase tracking-widest">Poultry Sector Impact</p>
                <h2 className="text-4xl font-black">{analytics.poultryTotal?.toFixed(2) || 0} <span className="text-lg">DDD</span></h2>
                <p className="mt-2 text-sm text-emerald-100 opacity-80">Concentrated mainly in SW & NW zones.</p>
             </div>

             {/* DATA TABLE MINI */}
             <div className="bg-white p-6 rounded-[2.5rem] border border-slate-200 shadow-sm">
                <h4 className="text-[10px] font-black text-slate-400 uppercase mb-4">Regional Breakdown</h4>
                <div className="space-y-3">
                   {analytics.zones.sort((a:any, b:any) => b.value - a.value).map((z: any) => (
                     <div key={z.zone} className="flex justify-between items-center border-b border-slate-50 pb-2">
                        <span className="text-xs font-bold text-slate-700">{z.zone}</span>
                        <span className="text-xs font-black text-blue-600">{z.value.toFixed(2)}</span>
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