'use client'

import { useState, useRef, useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { submitLedgerEntry } from "@/lib/actions/Vetstat/importAction";
import { 
  Package, 
  Beaker, 
  Activity, 
  AlertTriangle, 
  ChevronRight, 
  Building2, 
  Tag, 
  Calculator 
} from 'lucide-react';

interface LedgerFormProps {
  type: 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION';
  atcCodes: any[];
  companies: any[]; 
}

export default function LedgerForm({ type, atcCodes = [], companies = [] }: LedgerFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Selection States
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedProductId, setSelectedProductId] = useState<string>("");
  const [selectedSubstance, setSelectedSubstance] = useState<any>(null);
  
  // Calculation & Input States
  const [unit, setUnit] = useState<'mg' | 'g' | 'IU'>('mg');
  const [strength, setStrength] = useState<number>(0);
  const [shippingPacks, setShippingPacks] = useState(0);
  const [displayPackSize, setDisplayPackSize] = useState(""); 
  const [numericPackSize, setNumericPackSize] = useState(0); 
  
  const [state, action, isPending] = useActionState(submitLedgerEntry, { 
    success: false, 
    message: '' 
  });

  // 1. Filter products based on company name (Support for multiple permits per company)
  const availableProducts = useMemo(() => {
    if (!selectedCompanyId) return [];
    const selectedCompanyName = companies.find(c => c.id === selectedCompanyId)?.company_name;
    return companies.filter(c => c.company_name === selectedCompanyName);
  }, [selectedCompanyId, companies]);

  // 2. Substance Detection and Pack Size Multiplier Extraction
  useEffect(() => {
    const product = availableProducts.find(p => p.id === selectedProductId);
    
    if (product) {
      const targetSubstance = product.active_substance?.trim().toLowerCase();
      const registryMatch = atcCodes.find(a => 
        a.substance?.trim().toLowerCase() === targetSubstance ||
        a.id === product.atc_id
      );

      setSelectedSubstance(registryMatch || { 
        substance: product.active_substance, 
        risk_priority: 'Pending Review',
        atc_code: 'N/A',
        ddd_mg: 0,
        iu_to_mg_factor: 1
      });

      const rawSize = product.shipping_pack_size || "";
      setDisplayPackSize(rawSize);

      const calculatedMultiplier = rawSize.split(/[xX*]/)
        .reduce((acc: number, curr: string) => {
            const num = parseInt(curr.replace(/[^0-9]/g, ''));
            return !isNaN(num) ? acc * num : acc;
        }, 1);
      
      setNumericPackSize(calculatedMultiplier || 0);

    } else {
      setSelectedSubstance(null);
      setDisplayPackSize("");
      setNumericPackSize(0);
    }
  }, [selectedProductId, availableProducts, atcCodes]);

  // 3. Dynamic Unit Selection
  useEffect(() => {
    if (selectedSubstance?.iu_to_mg_factor && selectedSubstance.iu_to_mg_factor !== 1) {
      setUnit('IU');
    } else {
      setUnit('mg');
    }
  }, [selectedSubstance]);

  // 4. Combined Calculation Logic
  const totalUnits = shippingPacks * numericPackSize;

  const dddPreview = useMemo(() => {
    if (!selectedSubstance || !strength || !totalUnits) return null;

    let normalizedStrength = strength;
    if (unit === 'g') {
      normalizedStrength = strength * 1000;
    } else if (unit === 'IU') {
      const factor = parseFloat(selectedSubstance.iu_to_mg_factor || "1");
      normalizedStrength = strength / factor;
    }

    const totalMassMg = totalUnits * normalizedStrength;
    const referenceDdd = parseFloat(selectedSubstance.ddd_mg || "0");
    const dddConsumed = referenceDdd > 0 ? totalMassMg / referenceDdd : 0;

    return {
      mass: totalMassMg,
      ddd: dddConsumed
    };
  }, [selectedSubstance, strength, totalUnits, unit]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {state.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border animate-in fade-in zoom-in-95 ${
          state.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {state.success ? <Activity size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}

      {/* Hidden Fields */}
      <input type="hidden" name="entry_type" value={type} />
      <input type="hidden" name="mass_unit" value={unit} />
      <input type="hidden" name="atc_id" value={selectedSubstance?.id || ""} />
      <input type="hidden" name="substance_name" value={selectedSubstance?.substance || ""} />
      <input type="hidden" name="units_per_pack" value={numericPackSize} />

      {/* STEP 1: COMPANY */}
      <div className="flex flex-col gap-1.5">
        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Building2 size={14} /> {type === 'IMPORT' ? 'Authorized Importer' : 'Entity'}
        </label>
        <select 
          name="entity_id" 
          value={selectedCompanyId}
          onChange={(e) => {
            setSelectedCompanyId(e.target.value);
            setSelectedProductId(""); 
            setSelectedSubstance(null);
          }}
          className="border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-600 transition-all font-medium text-slate-700 bg-white outline-none"
          required
        >
          <option value="">Select company...</option>
          {Array.from(new Set(companies.map(c => c.company_name))).map((name) => {
            const comp = companies.find(c => c.company_name === name);
            return <option key={comp?.id} value={comp?.id || ""}>{name}</option>
          })}
        </select>
      </div>

      {/* STEP 2: PRODUCT */}
      <div className={`flex flex-col gap-1.5 transition-all duration-300 ${!selectedCompanyId ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Tag size={14} /> Registered Product (Brand Name)
        </label>
        <select 
          name="product_id" 
          value={selectedProductId}
          onChange={(e) => setSelectedProductId(e.target.value)}
          className="border-2 border-slate-200 p-3 rounded-xl focus:border-emerald-600 transition-all font-medium text-slate-700 bg-white outline-none"
          required={!!selectedCompanyId}
        >
          <option value="">Select enrolled product...</option>
          {availableProducts.map((p) => (
            <option key={p.id} value={p.id}>
              {p.product_name} [{p.permit_number}]
            </option>
          ))}
        </select>
      </div>

      {/* STEP 3: SUBSTANCE */}
      <div className={`flex flex-col gap-1.5 transition-all duration-300 ${!selectedProductId ? 'opacity-40' : 'opacity-100'}`}>
        <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-2">
          <Beaker size={14} /> Detected Active Substance
        </label>
        <div className={`border-2 p-3 rounded-xl font-bold flex justify-between items-center transition-colors ${
          selectedSubstance ? 'bg-white border-emerald-100 text-slate-800' : 'bg-slate-50 border-slate-100 text-slate-400'
        }`}>
          <span>{selectedSubstance ? selectedSubstance.substance : "Waiting for selection..."}</span>
          {selectedSubstance?.atc_code && (
            <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-lg font-mono">
              {selectedSubstance.atc_code}
            </span>
          )}
        </div>
      </div>

      {/* STEP 4: PACKING & CALCULATIONS */}
      <div className={`bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-slate-200 space-y-4 transition-all duration-300 ${!selectedSubstance ? 'opacity-40 pointer-events-none scale-[0.98]' : 'opacity-100 scale-100'}`}>
        <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
               <Package size={16} className="text-slate-400" />
               <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest">Packing List Details</h3>
            </div>
            
            <div className="flex bg-white border border-slate-200 rounded-lg p-1">
              {['mg', 'g', 'IU'].map((u) => (
                  <button
                    key={u}
                    type="button"
                    disabled={unit !== u}
                    className={`px-3 py-1 text-[10px] font-black rounded-md transition-all ${
                      unit === u ? 'bg-slate-900 text-white' : 'text-slate-400 opacity-20 cursor-not-allowed'
                    }`}
                  >
                    {u.toUpperCase()}
                  </button>
              ))}
            </div>
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase">Shipping Packs</label>
            <input 
              name="pack_quantity" 
              type="number" 
              min="1"
              onChange={(e) => setShippingPacks(Number(e.target.value) || 0)} 
              className="border-2 border-slate-200 p-2.5 rounded-lg font-bold outline-none focus:border-slate-900 transition-colors" 
              required 
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label className="text-[10px] font-black text-slate-400 uppercase">Ref. Pack Size</label>
            <input 
              type="text" 
              readOnly
              value={displayPackSize}
              className="border-2 border-slate-100 p-2.5 rounded-lg font-bold bg-slate-100 text-slate-500 cursor-not-allowed" 
            />
          </div>
        </div>

        {/* RESTORED: Calculated Units Display */}
        {totalUnits > 0 && (
          <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <ChevronRight size={14} />
            <span className="text-[10px] font-bold uppercase tracking-tight">
              Total {selectedSubstance?.substance} Count: {totalUnits.toLocaleString()} units
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
              onChange={(e) => setStrength(parseFloat(e.target.value) || 0)}
              placeholder={unit === 'IU' ? "1000000" : "500"} 
              className="w-full border-2 border-slate-200 p-2.5 rounded-lg font-bold pr-12 outline-none focus:border-slate-900 transition-colors" 
              required 
            />
            <span className="absolute right-3 top-2.5 text-xs font-black text-slate-300 uppercase">{unit}</span>
          </div>
        </div>

        {/* DDD METRIC PANEL */}
        {dddPreview && dddPreview.ddd > 0 && (
          <div className="mt-4 p-4 bg-slate-900 rounded-xl text-white border-b-4 border-emerald-500 shadow-xl animate-in slide-in-from-bottom-2 duration-500">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <Calculator size={12} className="text-emerald-400" /> Regulatory Metric Preview
              </span>
              <span className="text-[9px] bg-emerald-500/20 text-emerald-400 px-2 py-0.5 rounded font-bold">
                {selectedSubstance?.risk_priority || 'Standard'}
              </span>
            </div>
            <div className="flex justify-between items-end">
              <div>
                <p className="text-3xl font-black text-emerald-400 tracking-tighter">
                  {dddPreview.ddd.toFixed(4)} 
                  <span className="text-xs text-white tracking-normal font-bold ml-1">
                    DDD Consumed
                  </span>
                </p>
                <p className="text-[9px] text-slate-400 font-medium italic mt-1">
                  Normalized Mass: {dddPreview.mass.toLocaleString()}mg API
                </p>
              </div>
              <div className="text-right pb-1">
                <p className="text-[9px] text-slate-500 uppercase font-black">Ref Standard</p>
                <p className="text-xs font-mono text-slate-300">{selectedSubstance?.ddd_mg}mg/DDD</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <button 
        type="submit" 
        disabled={isPending || !selectedSubstance} 
        className="w-full bg-slate-900 text-white font-black uppercase tracking-[0.2em] py-4 rounded-xl hover:bg-emerald-600 transition-all disabled:bg-slate-200 disabled:text-slate-400 shadow-xl shadow-slate-900/10 active:scale-[0.98]"
      >
        {isPending ? 'Processing...' : `Log ${type} Entry`}
      </button>
    </form>
  );
}