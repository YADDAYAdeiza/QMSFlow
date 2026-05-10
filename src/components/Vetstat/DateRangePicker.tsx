'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { Calendar, RefreshCcw } from 'lucide-react';

export default function DateRangePicker() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // Get current values from URL or default to empty
  const start = searchParams.get('start') || '';
  const end = searchParams.get('end') || '';

  const handleUpdate = (key: 'start' | 'end', value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
      // Automatically set a label if dates are picked
      params.set('label', 'Custom Range');
    } else {
      params.delete(key);
    }
    router.push(`?${params.toString()}`);
  };

  const reset = () => {
    router.push('/Vetstat/Dashboard');
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
        onChange={(e) => handleUpdate('start', e.target.value)}
        className="text-xs font-bold text-slate-700 outline-none bg-transparent"
      />
      
      <span className="text-slate-300 text-xs">—</span>
      
      <input 
        type="date" 
        value={end}
        onChange={(e) => handleUpdate('end', e.target.value)}
        className="text-xs font-bold text-slate-700 outline-none bg-transparent"
      />

      {(start || end) && (
        <button 
          onClick={reset}
          className="ml-2 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors"
          title="Reset to All Time"
        >
          <RefreshCcw size={14} />
        </button>
      )}
    </div>
  );
}