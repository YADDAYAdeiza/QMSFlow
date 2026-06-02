'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useTransition, Suspense } from 'react';
import { ShieldAlert, Activity } from 'lucide-react';

function RiskToggleContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const currentRisk = searchParams.get('risk') || 'All';

  const setRisk = (risk: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (risk === 'All') {
      params.delete('risk');
    } else {
      params.set('risk', risk);
    }

    // Wrap in startTransition to prevent UI locking during heavy data refetches
    startTransition(() => {
      // { scroll: false } prevents the screen from bouncing to the top on click
      router.replace(`?${params.toString()}`, { scroll: false });
    });
  };

  return (
    <div 
      className={`flex bg-slate-100 p-1 rounded-2xl border border-slate-200 transition-opacity duration-200 ${
        isPending ? 'opacity-60 pointer-events-none' : ''
      }`}
    >
      <button
        type="button"
        disabled={isPending}
        onClick={() => setRisk('All')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
          currentRisk === 'All' 
            ? 'bg-white text-slate-900 shadow-sm' 
            : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Activity size={14} /> Total Vol
      </button>
      
      <button
        type="button"
        disabled={isPending}
        onClick={() => setRisk('HPCIA')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
          currentRisk === 'HPCIA' 
            ? 'bg-rose-600 text-white shadow-sm' 
            : 'text-slate-500 hover:text-rose-600'
        }`}
      >
        <ShieldAlert size={14} /> High Risk
      </button>
    </div>
  );
}

// 4. Exposed safe wrapper to completely isolate searchParam build-time side effects
export default function RiskToggle() {
  return (
    <Suspense fallback={
      <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200 w-[190px] h-[34px] animate-pulse" />
    }>
      <RiskToggleContent />
    </Suspense>
  );
}