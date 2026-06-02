'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { Calendar, RefreshCcw } from 'lucide-react';

export default function DateRangePicker() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Get current active date bounding filters from URL strings
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  const handleUpdate = (key: 'start' | 'end', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    
    if (value) {
      params.set(key, value);
      // Automatically pair with range indicator metadata safely
      params.set('label', 'Custom Range');
    } else {
      params.delete(key);
    }
    
    // Safely apply state updates directly atop current path structure
    router.push(`${pathname}?${params.toString()}`);
  };

  const reset = () => {
    const params = new URLSearchParams(searchParams.toString());
    
    // Completely clear date parameters without destroying other active context (e.g. search, pagination)
    params.delete('start');
    params.delete('end');
    params.delete('label');
    
    router.push(`${pathname}?${params.toString()}`);
  };

  return (
    <div className="flex items-center gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
      <div className="flex items-center gap-2 px-3 border-r border-slate-100">
        <Calendar size={14} className="text-slate-400" />
        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Range</span>
      </div>
      
      <input 
        type="date" 
        value={start}
        max={end || undefined} // Restricts start selection from going beyond active end date boundaries
        onChange={(e) => handleUpdate('start', e.target.value)}
        className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
      />
      
      <span className="text-slate-300 text-xs">—</span>
      
      <input 
        type="date" 
        value={end}
        min={start || undefined} // Restricts end selection from falling before active start date boundaries
        onChange={(e) => handleUpdate('end', e.target.value)}
        className="text-xs font-bold text-slate-700 outline-none bg-transparent cursor-pointer"
      />

      {(start || end) && (
        <button 
          onClick={reset}
          type="button"
          className="ml-2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-rose-600 transition-colors"
          title="Reset to All Time"
        >
          <RefreshCcw size={14} />
        </button>
      )}
    </div>
  );
}