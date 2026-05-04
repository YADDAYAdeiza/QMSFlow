'use client'

import { useState, useRef, useEffect } from 'react';
import { useActionState } from 'react';
import { submitLedgerEntry } from "@/lib/actions/Vetstat/importAction";
import { Package, Beaker, Activity, AlertTriangle, ChevronRight, Building2 } from 'lucide-react';

interface LedgerFormProps {
  type: 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION';
  atcCodes: any[];
  companies: any[]; 
}

export default function LedgerForm({ type, atcCodes = [], companies = [] }: LedgerFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selectedSubstance, setSelectedSubstance] = useState<any>(null);
  const [unit, setUnit] = useState<'mg' | 'g' | 'IU'>('mg');
  const [packQty, setPackQty] = useState(0);
  const [unitsPerPack, setUnitsPerPack] = useState(0);
  
  const [state, action, isPending] = useActionState(submitLedgerEntry, { 
    success: false, 
    message: '' 
  });

  // Dynamic Unit Selection Logic
  // When a substance is selected, check if it requires International Units (IU)
  useEffect(() => {
    if (selectedSubstance?.iu_to_mg_factor) {
      setUnit('IU');
    } else {
      setUnit('mg');
    }
  }, [selectedSubstance]);

  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setSelectedSubstance(null);
      setPackQty(0);
      setUnitsPerPack(0);
    }
  }, [state]);

  const handleSubstanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const item = atcCodes.find(c => c.id === e.target.value);
    setSelectedSubstance(item);
  };

  const totalUnits = packQty * unitsPerPack;

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {state.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${
          state.success 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {state.success ? <Activity size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}

      <input type="hidden" name="entry_type" value={type} />
      <input type="hidden" name="mass_unit" value={unit} />
      
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Beaker size={14} /> Active Substance
        </label>
        <select 
          name="atc_id" 
          onChange={handleSubstanceChange} 
          className="border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-600 focus:ring-0 transition-all font-medium text-slate-700 bg-white"
          required
        >
          <option value="">Select controlled substance...</option>
          {atcCodes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.substance} ({item.vet_atc || item.human_atc})
            </option>
          ))}
        </select>
        {selectedSubstance && (
          <div className="mt-2 p-3 bg-slate-900 text-white rounded-lg text-[10px] uppercase font-black tracking-widest flex justify-between items-center">
            <div className="flex gap-4">
              <span>Risk: {selectedSubstance.risk_priority}</span>
              {selectedSubstance.iu_to_mg_factor && (
                <span className="text-emerald-400">IU Factor: {selectedSubstance.iu_to_mg_factor}</span>
              )}
            </div>
            <span className="opacity-60">Ref DDD: {selectedSubstance.ddd_mg}mg</span>
          </div>
        )}
      </div>

      <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200 space-y-4">
        <div className="flex items-center justify-between mb-2">
           <div className="flex items-center gap-2">
              <Package size={16} className="text-slate-400" />
              <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Packing List Details</h3>
           </div>
           
           {/* Restricted Unit Toggle */}
           <div className="flex bg-white border border-slate-200 rounded-lg p-1">
              {['mg', 'g', 'IU'].map((u) => {
                // Disable IU if no factor exists; disable mg/g if factor DOES exist
                const isIUAvailable = !!selectedSubstance?.iu_to_mg_factor;
                const isDisabled = u === 'IU' ? !isIUAvailable : isIUAvailable;

                return (
                  <button
                    key={u}
                    type="button"
                    disabled={isDisabled}
                    onClick={() => setUnit(u as any)}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${
                      unit === u ? 'bg-slate-900 text-white' : 'text-slate-400'
                    } ${isDisabled ? 'opacity-20 cursor-not-allowed' : 'hover:bg-slate-100'}`}
                  >
                    {u.toUpperCase()}
                  </button>
                );
              })}
           </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase">Outer Packs (Boxes)</label>
            <input 
              name="pack_quantity" 
              type="number" 
              placeholder="0" 
              onChange={(e) => setPackQty(Number(e.target.value))}
              className="border-2 border-slate-200 p-2.5 rounded-lg focus:border-slate-400 font-bold text-slate-800" 
              required 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase">Units per Pack</label>
            <input 
              name="units_per_pack" 
              type="number" 
              placeholder="e.g., 10" 
              onChange={(e) => setUnitsPerPack(Number(e.target.value))}
              className="border-2 border-slate-200 p-2.5 rounded-lg focus:border-slate-400 font-bold text-slate-800" 
              required 
            />
          </div>
        </div>

        {totalUnits > 0 && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              Calculated {selectedSubstance?.substance || 'Product'} Count: {totalUnits.toLocaleString()} total units
            </span>
          </div>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[10px] font-black text-slate-400 uppercase">Strength per Unit ({unit})</label>
          <div className="relative">
            <input 
              name="strength" 
              type="number" 
              step="any" 
              placeholder={unit === 'IU' ? "1000000" : "500"} 
              className="w-full border-2 border-slate-200 p-2.5 rounded-lg focus:border-slate-400 font-bold pr-12 text-slate-800" 
              required 
            />
            <span className="absolute right-3 top-2.5 text-xs font-black text-slate-300 uppercase">{unit}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Building2 size={14} /> {type === 'IMPORT' ? 'Supplier / Source Company' : 'Target Entity / Farm'}
        </label>
        <select 
          name="entity_id" 
          className="border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-600 focus:ring-0 transition-all font-medium text-slate-700 bg-white"
          required
        >
          <option value="">Select registered company...</option>
          {companies.map((company) => (
            <option key={company.id} value={company.id}>
              {company.company_name} — {company.permit_number}
            </option>
          ))}
        </select>
        <p className="text-[9px] text-slate-400 italic px-1 font-medium">
          Official VMD registration list matching required permit numbers.
        </p>
      </div>

      <button 
        type="submit" 
        disabled={isPending} 
        className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-600 transition-all shadow-lg shadow-slate-200 disabled:bg-slate-300 active:scale-[0.98]"
      >
        {isPending ? 'Validating Entry...' : `Log ${type} Record`}
      </button>
    </form>
  );
}