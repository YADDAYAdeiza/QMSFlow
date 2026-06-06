'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ShieldCheck, X } from 'lucide-react';
import { createAmendment } from '@/lib/actions/Vetstat/Permits/permitActions';

interface SubstanceEntry {
  substance_id: string;
  quantity_kg: number;
  additional_qty: number;
}

interface PermitAmendmentProps {
  permit: {
    id: string;
    permit_substances: Array<{ substance_id: string; quantity_kg: number }>;
  };
  atcCodes: Array<{ id: string; substance: string }>;
  onClose: () => void;
}

export default function AmmendPermitModal({ 
  permit, 
  atcCodes, 
  onClose 
}: PermitAmendmentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [substances, setSubstances] = useState<SubstanceEntry[]>(() =>
    permit.permit_substances.map((s) => ({
      substance_id: s.substance_id,
      quantity_kg: s.quantity_kg,
      additional_qty: 0 
    }))
  );

  const updateAdditionalQty = (index: number, rawValue: string) => {
    // If input is cleared, track internally as 0 but manage gracefully
    if (rawValue === '') {
      const next = [...substances];
      next[index].additional_qty = 0;
      setSubstances(next);
      return;
    }

    const parsed = parseFloat(rawValue);
    // Block negative values and safeguard against non-numeric inputs
    if (isNaN(parsed) || parsed < 0) return;

    const next = [...substances];
    next[index].additional_qty = parsed;
    setSubstances(next);
  };

  const handleAmend = () => {
    setErrorMessage(null);
    
    // Safety check: Don't submit if all extensions are zero
    const totalAdditional = substances.reduce((sum, s) => sum + s.additional_qty, 0);
    if (totalAdditional <= 0) {
      setErrorMessage("Please specify an extension quantity for at least one substance.");
      return;
    }

    // Execute Server Action inside transition context
    startTransition(async () => {
      try {
        const result = await createAmendment(permit.id, substances);
        
        // Assuming your action structure returns an explicit error payload if DB validations fail
        if (result?.error) {
          setErrorMessage(result.error);
          return;
        }

        router.refresh();
        onClose();
      } catch (error) {
        console.error("Amendment Error:", error);
        setErrorMessage('Failed to process quantitative extension. Please verify connections.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[520px] overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header Block */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
          <div>
            <h2 className="text-xl font-black text-slate-800 flex items-center gap-2">
              <ShieldCheck className="text-amber-500" size={22} />
              Quantity Amendment
            </h2>
            <p className="text-[10px] text-amber-600 font-black uppercase tracking-widest mt-1">
              Permit Extension Protocol
            </p>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
          >
            <X size={18} />
          </button>
        </div>
        
        {/* Scrollable Substance Form Content */}
        <div className="p-6 overflow-y-auto space-y-4 grow">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <div className="grid grid-cols-3 text-[10px] font-black uppercase text-slate-400 gap-2 px-2 tracking-wider">
            <div>Substance Description</div>
            <div className="text-center">Authorized Base</div>
            <div className="text-right">Extension Delta</div>
          </div>
          
          <div className="space-y-2">
            {substances.map((sub, i) => {
              const matchingCode = atcCodes.find(a => a.id === sub.substance_id);
              const name = matchingCode ? matchingCode.substance : 'Unknown Substance';
              
              return (
                <div 
                  key={sub.substance_id} 
                  className="grid grid-cols-3 gap-2 items-center bg-slate-50/60 p-3 rounded-xl border border-slate-100 hover:border-slate-200 transition-colors"
                >
                  <span className="text-xs font-black text-slate-700 truncate" title={name}>
                    {name}
                  </span>
                  
                  <span className="text-xs text-center font-mono font-bold bg-white border border-slate-200 text-slate-600 rounded-lg py-1 px-2 shadow-sm">
                    {sub.quantity_kg.toLocaleString()} kg
                  </span>
                  
                  <div className="flex items-center gap-1.5">
                    <input 
                      type="number"
                      min="0"
                      step="any"
                      disabled={isPending}
                      value={sub.additional_qty === 0 ? '' : sub.additional_qty}
                      className="border border-slate-200 p-1.5 text-xs rounded-lg w-full text-right font-black text-amber-700 focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none bg-white shadow-sm disabled:bg-slate-100"
                      placeholder="0.00"
                      onChange={(e) => updateAdditionalQty(i, e.target.value)}
                    />
                    <span className="text-[10px] font-black text-slate-400">KG</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Action Triggers Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3">
          <button 
            type="button" 
            disabled={isPending}
            onClick={onClose} 
            className="flex-1 bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            disabled={isPending}
            onClick={handleAmend} 
            className="flex-1 bg-amber-600 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-amber-700 disabled:opacity-50 transition shadow-lg shadow-amber-600/10 flex items-center justify-center min-h-[38px]"
          >
            {isPending ? (
              <span className="flex items-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Processing...
              </span>
            ) : 'Apply Extension'}
          </button>
        </div>
      </div>
    </div>
  );
}