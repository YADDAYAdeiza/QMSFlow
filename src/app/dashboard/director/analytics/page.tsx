// import { getGMPHealthReport } from "@/lib/actions/analytics";
// import AnalyticsClient from "@/components/AnalyticsClient";
// import { Activity, ShieldAlert, Award, Search } from "lucide-react";

// export default async function DirectorAnalyticsPage() {
//   const stats = await getGMPHealthReport();

//   // Transform object into Recharts-friendly array
//   const chartData = Object.entries(stats).map(([name, data]) => ({
//     subject: name.replace(" System", ""), // Shorten names for the chart labels
//     total: data.total,
//     critical: data.critical,
//     fullMark: Math.max(...Object.values(stats).map(s => s.total)) + 5,
//   }));

//   return (
//     <div className="p-10 bg-slate-50 min-h-screen font-sans">
//       <div className="max-w-7xl mx-auto space-y-10">
        
//         {/* HEADER */}
//         <div className="flex justify-between items-end">
//           <div>
//             <h1 className="text-4xl font-black tracking-tighter text-slate-900">National GMP Health</h1>
//             <p className="text-xs font-bold text-slate-400 uppercase tracking-[0.3em] mt-2">
//               Regulatory Intelligence & Training Oversight
//             </p>
//           </div>
//           <div className="bg-white px-6 py-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
//              <div className="text-right">
//                 <p className="text-[9px] font-black text-slate-400 uppercase">Status</p>
//                 <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live QMS Feed</p>
//              </div>
//              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
//           </div>
//         </div>

//         {/* TOP STATS */}
//         <div className="grid grid-cols-3 gap-6">
//           <StatCard 
//             title="Total Deficiencies" 
//             value={Object.values(stats).reduce((acc, s) => acc + s.total, 0)} 
//             icon={<Search className="w-5 h-5" />}
//             color="text-blue-600"
//           />
//           <StatCard 
//             title="Critical Risk Points" 
//             value={Object.values(stats).reduce((acc, s) => acc + s.critical, 0)} 
//             icon={<ShieldAlert className="w-5 h-5" />}
//             color="text-rose-600"
//           />
//           <StatCard 
//             title="High Risk Facilities" 
//             value={Object.values(stats).filter(s => s.critical > 0).length} 
//             icon={<Activity className="w-5 h-5" />}
//             color="text-amber-600"
//           />
//         </div>

//         {/* RADAR CHART SECTION */}
//         <div className="grid grid-cols-12 gap-8">
//           <div className="col-span-7 bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100 min-h-[500px]">
//              <div className="mb-8">
//                <h3 className="text-sm font-black uppercase tracking-widest text-slate-900">GMP System Performance</h3>
//                <p className="text-[11px] text-slate-400 italic">Visualizing deficiency density across the 6 PIC/S Systems</p>
//              </div>
//              <AnalyticsClient data={chartData} />
//           </div>

//           {/* SYSTEM RANKING TABLE */}
//           <div className="col-span-5 space-y-4">
//             <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-4">System Breakdown</h3>
//             {Object.entries(stats)
//               .sort((a, b) => b[1].total - a[1].total)
//               .map(([name, data]) => (
//               <div key={name} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-200 transition-all flex items-center justify-between">
//                 <div>
//                   <p className="text-[11px] font-black text-slate-800">{name}</p>
//                   <p className="text-[9px] font-bold text-slate-400 uppercase">{data.total} Total Citations</p>
//                 </div>
//                 <div className="flex gap-2">
//                    <div className="px-3 py-1 bg-rose-50 rounded-full">
//                       <p className="text-[9px] font-black text-rose-600">{data.critical} CRIT</p>
//                    </div>
//                    <div className="px-3 py-1 bg-slate-50 rounded-full">
//                       <p className="text-[9px] font-black text-slate-500">{data.major} MAJ</p>
//                    </div>
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// function StatCard({ title, value, icon, color }: any) {
//   return (
//     <div className="bg-white p-8 rounded-[2.5rem] shadow-lg border border-slate-100 flex items-center justify-between">
//       <div>
//         <p className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">{title}</p>
//         <p className={`text-4xl font-black tracking-tighter ${color}`}>{value}</p>
//       </div>
//       <div className="p-4 bg-slate-50 rounded-3xl text-slate-300">
//         {icon}
//       </div>
//     </div>
//   );
// }

// app/dashboard/director/analytics/page.tsx
import AnalyticsView from "@/components/management/AnalyticsView";
import { getGMPHealthReport } from "@/lib/actions/analytics";

export default async function DirectorAnalyticsPage() {
  // 1. Fetch the data on the server
  const stats = await getGMPHealthReport();

  // 2. Pass the data DOWN into the shared view
  return <AnalyticsView stats={stats} />;
}