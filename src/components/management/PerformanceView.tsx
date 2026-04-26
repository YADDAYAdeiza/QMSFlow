// components/management/PerformanceView.tsx
import { formatDuration } from "@/lib/utils/time";

interface PerformanceViewProps {
  performanceList: any[];
}

export default function PerformanceView({ performanceList }: PerformanceViewProps) {
  return (
    <div className="max-w-7xl mx-auto">
      <header className="mb-10">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight underline decoration-blue-600 underline-offset-8 uppercase">
          Directorate Performance Engine
        </h1>
        <p className="text-slate-500 mt-2 font-medium">
          Global QMS Metrics: Monitoring cross-divisional processing speeds and staff throughput.
        </p>
      </header>

      {/* Metric Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {performanceList.map((staff: any) => {
          const avgTime = staff.totalDuration / staff.taskCount;
          
          return (
            <div key={staff.id} className="bg-white border-2 border-slate-200 rounded-3xl p-6 hover:border-blue-500 transition-all shadow-sm group">
              <div className="flex justify-between items-start mb-4">
                {/* Division Tag helps identify where the staff member sits */}
                <div className="px-3 py-1 rounded-full text-[9px] bg-slate-900 text-white font-black uppercase tracking-widest">
                  {staff.division || 'N/A'}
                </div>
                <span className="text-[10px] font-bold text-slate-400 italic">
                  {staff.taskCount} Dossiers
                </span>
              </div>

              <h2 className="text-[10px] font-bold text-slate-400 mb-1 uppercase tracking-widest">Officer Credentials</h2>
              <p className="text-slate-900 font-mono text-[10px] break-all mb-6 bg-slate-50 p-2 rounded-xl border border-slate-100">
                {staff.id}
              </p>

              <div className="pt-4 border-t border-slate-100">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg. Processing Time</p>
                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-black text-slate-900 tracking-tighter">
                    {formatDuration(avgTime)}
                  </span>
                  {/* Performance Indicator: Green < 2hrs, Amber < 4hrs, Red > 4hrs */}
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    avgTime < 7200000 ? 'bg-emerald-500' : 
                    avgTime < 14400000 ? 'bg-amber-500' : 'bg-rose-500'
                  }`} />
                </div>
              </div>

              <div className="mt-4 flex items-center justify-between">
                 <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                    <div 
                      className="bg-blue-600 h-full transition-all duration-1000" 
                      style={{ width: `${Math.min((staff.taskCount / 20) * 100, 100)}%` }}
                    />
                 </div>
              </div>
            </div>
          );
        })}
      </div>

      {performanceList.length === 0 && (
        <div className="text-center py-24 bg-white rounded-[3rem] border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No global performance data available.</p>
        </div>
      )}
    </div>
  );
}