// app/Vetstat/Dashboard/page.tsx
import { getAMSRegionalAnalytics } from "@/lib/actions/Vetstat/fetchAnalytics";
import StructuralAnalyticsEngine from "@/components/Vetstat/NigeriaMap";
import DateRangePicker from "@/components/Vetstat/DateRangePicker";
import SectorToggle from "@/components/Vetstat/SectorToggle";
import RiskToggle from "@/components/Vetstat/RiskToggle";
import DrillDownSidebar from "@/components/Vetstat/DrillDownSidebar";
import ExportButton from "@/components/Vetstat/ExportButton"; 
import { 
  Activity, 
  Bird, 
  ShieldAlert, 
  Calendar, 
  Database, 
  TrendingUp, 
  TrendingDown, 
  Zap,
  Drama
} from 'lucide-react';

export default async function AMSDashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const start = params.start as string;
  const end = params.end as string;
  const species = (params.species as string) || 'All';
  const risk = (params.risk as string) || 'All';
  const filterLabel = (params.label as string) || "All Time";

  // Destructured the rawRows alongside analytical aggregates
  const { zones, topSubstances, rawRows, totalDDD, globalTrend } = await getAMSRegionalAnalytics(start, end, species, risk);
  
  const hasRealData = totalDDD > 0;
  const isAnomaly = (globalTrend ?? 0) > 15;
  const isHighRiskMode = risk === 'HPCIA';

  // Dynamic Theme Utility for the Hero Highlight Card
  const getCardTheme = () => {
    if (isHighRiskMode) return 'bg-slate-900 ring-4 ring-rose-500/20 text-white';
    if (species === 'Poultry') return 'bg-emerald-600 text-white';
    if (species === 'Swine') return 'bg-orange-600 text-white'; 
    return 'bg-blue-600 text-white';
  };

  return (
    <div className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* --- HEADER --- */}
        <div className="flex flex-col gap-6">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase leading-none">
                VMD Surveillance Hub
              </h1>
              <div className="flex items-center gap-2 mt-2">
                <p className="text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">
                  National Antimicrobial Load Monitoring
                </p>
                {hasRealData ? (
                  <span className="text-[10px] bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-black flex items-center gap-1">
                    <Database size={10} /> LIVE
                  </span>
                ) : (
                  <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black">
                    DEMO
                  </span>
                )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <ExportButton /> 
              <RiskToggle />
              <SectorToggle />
              <DateRangePicker />
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Active Sector</p>
                  <p className="text-lg font-black text-slate-900 uppercase">{species}</p>
               </div>
               <div className="p-2 bg-slate-50 rounded-lg"><Activity size={20} className="text-slate-400" /></div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest text-nowrap">
                    {isHighRiskMode ? 'Critical Volume' : 'Total Volume'} ({species})
                  </p>
                  <div className="flex items-baseline gap-2">
                    <p className={`text-lg font-black ${isHighRiskMode ? 'text-rose-600' : 'text-blue-600'}`}>
                      {totalDDD?.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                    </p>
                    <span className={`text-[10px] font-black flex items-center ${globalTrend > 0 ? 'text-rose-500' : 'text-emerald-500'}`}>
                       {globalTrend > 0 ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                       {Math.abs(globalTrend ?? 0).toFixed(1)}%
                    </span>
                  </div>
               </div>
               <div className={`p-2 rounded-lg ${isAnomaly ? 'bg-rose-50 text-rose-500 animate-bounce' : 'bg-blue-50 text-blue-500'}`}>
                  {isHighRiskMode ? <ShieldAlert size={20} /> : <Activity size={20} />}
               </div>
            </div>

            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between">
               <div>
                  <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Temporal Focus</p>
                  <p className="text-lg font-black text-slate-900">{filterLabel}</p>
               </div>
               <div className="p-2 bg-slate-50 rounded-lg"><Calendar size={20} className="text-slate-400" /></div>
            </div>
          </div>
        </div>

        {/* --- MAIN CONTENT GRID --- */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-10 flex flex-col h-full min-h-[650px] relative overflow-hidden">
            <div className="mb-4 relative z-10">
                <h3 className={`text-sm font-black uppercase flex items-center gap-2 ${isHighRiskMode ? 'text-rose-600' : 'text-slate-800'}`}>
                  {isHighRiskMode ? <Zap size={16} fill="currentColor" /> : <ShieldAlert size={16} className={isAnomaly ? "text-rose-500" : "text-blue-500"} />} 
                  {isHighRiskMode ? 'HPCIA Distribution Framework' : `${species} Analytics Matrix`}
                </h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                   {isHighRiskMode ? 'Highest Priority Critically Important Antimicrobials (WHO List)' : `Geopolitical Aggregate for ${species} sector`}
                </p>
            </div>
            
            {/* Component renders map/bar switch, and dynamically intercepts active regional rows */}
            <div className="flex-1 w-full relative z-0 flex flex-col justify-between">
                <StructuralAnalyticsEngine 
                  zones={zones} 
                  topSubstances={topSubstances}
                  rawRows={rawRows} // <- Wired up raw dataset stream perfectly
                  isHighRiskMode={isHighRiskMode}
                />
            </div>
          </div>

          <div className="space-y-6">
            {/* Sector/Risk Summary Card */}
            <div className={`p-8 rounded-[2.5rem] shadow-lg relative overflow-hidden group transition-all duration-500 ${getCardTheme()}`}>
               <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:scale-110 transition-transform">
                 {isHighRiskMode ? <ShieldAlert size={120} /> : species === 'Poultry' ? <Bird size={120} /> : <Drama size={120} />}
               </div>
               <p className="text-xs font-black opacity-80 uppercase tracking-widest">
                 {isHighRiskMode ? '🔴 High Risk Load' : `${species} Impact`}
               </p>
               <h2 className="text-5xl font-black mt-1">
                 {totalDDD?.toFixed(2)} 
                 <span className="text-lg ml-2 font-medium opacity-70">DDD</span>
               </h2>
               <p className="mt-4 text-sm opacity-80 leading-tight font-bold">
                 {isHighRiskMode 
                   ? 'Monitoring Highest Priority Critically Important Antimicrobials.' 
                   : `National consumption data for the ${species} production sector.`
                 }
               </p>
            </div>

            {/* INTERACTIVE SIDEBAR WITH TRENDS & DRILL-DOWN */}
            <DrillDownSidebar zones={zones} totalDDD={totalDDD} />
          </div>
        </div>
      </div>
    </div>
  );
}