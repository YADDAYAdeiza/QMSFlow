import { db } from "@/db";
import { qmsTimelines } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";
import { formatDuration } from "@/lib/utils/time";

export default async function PerformanceDashboard() {
  // 1. Fetch all segments that have an end_time (completed tasks)
  const segments = await db.query.qmsTimelines.findMany({
    where: isNotNull(qmsTimelines.endTime),
    orderBy: [desc(qmsTimelines.endTime)],
  });

  // 2. Aggregate data by Staff ID
  const staffStats = segments.reduce((acc: any, curr) => {
    const sId = curr.staffId || "Unknown Staff";
    const duration = curr.endTime!.getTime() - curr.startTime!.getTime();

    if (!acc[sId]) {
      acc[sId] = {
        id: sId,
        division: curr.division,
        totalDuration: 0,
        taskCount: 0,
        lastActive: curr.endTime
      };
    }

    acc[sId].totalDuration += duration;
    acc[sId].taskCount += 1;
    return acc;
  }, {});

  const performanceList = Object.values(staffStats);

  return (
    <div className="min-h-screen bg-slate-50 p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10">
          <h1 className="text-3xl font-black text-slate-900 tracking-tight underline decoration-emerald-500 underline-offset-8">
            STAFF PERFORMANCE ENGINE
          </h1>
          <p className="text-slate-500 mt-2 font-medium">
            Real-time QMS metrics: Average processing time per Division.
          </p>
        </header>

        {/* Metric Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {performanceList.map((staff: any) => {
            const avgTime = staff.totalDuration / staff.taskCount;
            
            return (
              <div key={staff.id} className="bg-white border-2 border-slate-200 rounded-2xl p-6 hover:border-emerald-500 transition-all shadow-sm group">
                <div className="flex justify-between items-start mb-4">
                  <div className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${
                    staff.division === 'DIRECTORATE' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                  }`}>
                    {staff.division}
                  </div>
                  <span className="text-[10px] font-bold text-slate-400 italic">
                    {staff.taskCount} Dossiers Processed
                  </span>
                </div>

                <h2 className="text-sm font-bold text-slate-500 mb-1 uppercase tracking-tight">Staff ID</h2>
                <p className="text-slate-900 font-mono text-xs break-all mb-6 bg-slate-50 p-2 rounded">
                  {staff.id}
                </p>

                <div className="pt-4 border-t border-slate-100">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Avg. Active Time</p>
                  <div className="flex items-baseline gap-2">
                    <span className="text-3xl font-black text-slate-900 tracking-tighter">
                      {formatDuration(avgTime)}
                    </span>
                    {/* Visual indicator: Green if under 2 hours, Amber if more */}
                    <div className={`h-2 w-2 rounded-full ${avgTime < 7200000 ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                  </div>
                </div>

                <div className="mt-4 flex items-center justify-between">
                   <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                      <div 
                        className="bg-emerald-500 h-full transition-all duration-1000" 
                        style={{ width: `${Math.min((staff.taskCount / 10) * 100, 100)}%` }}
                      />
                   </div>
                </div>
              </div>
            );
          })}
        </div>

        {performanceList.length === 0 && (
          <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-200">
            <p className="text-slate-400 font-medium">No performance data available yet. Clear a dossier to see metrics.</p>
          </div>
        )}
      </div>
    </div>
  );
}