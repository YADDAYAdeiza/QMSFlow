'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAmendment } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function AmmendPermitModal({ 
  permit, 
  atcCodes, 
  onClose 
}: { 
  permit: any, 
  atcCodes: any[], 
  onClose: () => void 
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  
  const [substances, setSubstances] = useState(
    permit.permit_substances.map((s: any) => ({
      ...s,
      additional_qty: 0 
    }))
  );

  const updateAdditionalQty = (index: number, val: number) => {
    const next = [...substances];
    next[index].additional_qty = val;
    setSubstances(next);
  };

  const handleAmend = async () => {
    setIsPending(true);
    try {
      await createAmendment(permit.id, substances);
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to process amendment');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-[500px]">
        <h2 className="text-xl font-bold mb-1 text-slate-800">Quantity Amendment</h2>
        <p className="text-xs text-amber-600 font-bold mb-6 uppercase tracking-wider">Permit Extension Protocol</p>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-3 text-[10px] font-black uppercase text-slate-400 gap-2 px-2">
            <div>Substance</div>
            <div className="text-center">Authorized</div>
            <div className="text-right">Extension</div>
          </div>
          
          <div className="max-h-[300px] overflow-y-auto space-y-2 pr-1">
            {substances.map((sub: any, i: number) => {
              const name = atcCodes.find(a => a.id === sub.substance_id)?.substance || 'Unknown';
              return (
                <div key={i} className="grid grid-cols-3 gap-2 items-center bg-slate-50 p-3 rounded-lg border border-slate-100">
                  <span className="text-xs font-bold text-slate-700 truncate">{name}</span>
                  <span className="text-xs text-center font-mono bg-white border rounded px-1">{sub.quantity_kg}kg</span>
                  <div className="flex items-center gap-1">
                    <input 
                      type="number"
                      className="border p-1 text-xs rounded w-full text-right font-black text-amber-700 focus:ring-1 focus:ring-amber-500 outline-none"
                      placeholder="0"
                      onChange={(e) => updateAdditionalQty(i, Number(e.target.value))}
                    />
                    <span className="text-[10px] font-bold text-slate-400">KG</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex gap-3 border-t pt-4">
          <button onClick={onClose} className="flex-1 border p-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition">Cancel</button>
          <button 
            onClick={handleAmend} 
            disabled={isPending}
            className="flex-1 bg-amber-600 text-white p-2 rounded-lg font-bold text-sm hover:bg-amber-700 disabled:opacity-50 transition shadow-lg shadow-amber-100"
          >
            {isPending ? 'Processing...' : 'Apply Extension'}
          </button>
        </div>
      </div>
    </div>
  );
}