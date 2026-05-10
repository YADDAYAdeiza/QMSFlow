'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { ShieldAlert, Activity } from 'lucide-react';

export default function RiskToggle() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentRisk = searchParams.get('risk') || 'All';

  const setRisk = (risk: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (risk === 'All') params.delete('risk');
    else params.set('risk', risk);
    router.push(`?${params.toString()}`);
  };

  return (
    <div className="flex bg-slate-100 p-1 rounded-2xl border border-slate-200">
      <button
        onClick={() => setRisk('All')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
          currentRisk === 'All' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700'
        }`}
      >
        <Activity size={14} /> Total Vol
      </button>
      <button
        onClick={() => setRisk('HPCIA')}
        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all flex items-center gap-2 ${
          currentRisk === 'HPCIA' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-rose-600'
        }`}
      >
        <ShieldAlert size={14} /> High Risk
      </button>
    </div>
  );
}