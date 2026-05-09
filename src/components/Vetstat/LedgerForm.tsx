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
  MapPin,
  Truck,
  Bird,
  Warehouse
} from 'lucide-react';

interface LedgerFormProps {
  type: 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION';
  atcCodes: any[];
  companies: any[]; 
  initialData?: any; 
}

const GEO_ZONES: Record<string, string[]> = {
  "North-Central": ["Benue", "FCT", "Kogi", "Kwara", "Nasarawa", "Niger", "Plateau"],
  "North-East": ["Adamawa", "Bauchi", "Borno", "Gombe", "Taraba", "Yobe"],
  "North-West": ["Kaduna", "Kano", "Katsina", "Kebbi", "Jigawa", "Sokoto", "Zamfara"],
  "South-East": ["Abia", "Anambra", "Ebonyi", "Enugu", "Imo"],
  "South-South": ["Akwa Ibom", "Bayelsa", "Cross River", "Delta", "Edo", "Rivers"],
  "South-West": ["Ekiti", "Lagos", "Ogun", "Ondo", "Osun", "Oyo"]
};

const ALL_STATES = Object.values(GEO_ZONES).flat().sort();

const SPECIES_CATEGORIES = [
  "Poultry", 
  "Livestock (Cattle/Sheep/Goat)", 
  "Poultry + Livestock", 
  "Swine", 
  "Aquaculture", 
  "Companion Animals"
];

export default function LedgerForm({ type, atcCodes = [], companies = [], initialData }: LedgerFormProps) {
  const formRef = useRef<HTMLFormElement>(null);

  // Selection States
  const [selectedProductId, setSelectedProductId] = useState<string>(initialData?.entity_id || "");
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>("");
  const [selectedSubstance, setSelectedSubstance] = useState<any>(null);
  
  // Pinpoint Logistics States
  const [originWarehouse, setOriginWarehouse] = useState<string>(initialData?.origin_warehouse || "");
  const [originState, setOriginState] = useState<string>(initialData?.origin_state || "");
  const [destinationState, setDestinationState] = useState<string>(initialData?.destination_state || "");
  const [targetSpecies, setTargetSpecies] = useState<string>(initialData?.target_species || "");

  // Auto-derived Zone for the Destination
  const derivedZone = useMemo(() => {
    for (const [zone, states] of Object.entries(GEO_ZONES)) {
      if (states.includes(destinationState)) return zone;
    }
    return "";
  }, [destinationState]);

  // Calculation States
  const [unit, setUnit] = useState<'mg' | 'g' | 'IU'>(initialData?.metadata?.original_unit || 'mg');
  const [strength, setStrength] = useState<number>(initialData?.metadata?.strength_at_log || 0);
  const [shippingPacks, setShippingPacks] = useState(initialData?.pack_quantity || 0);
  const [displayPackSize, setDisplayPackSize] = useState(""); 
  const [numericPackSize, setNumericPackSize] = useState(0); 
  
  const [state, action, isPending] = useActionState(submitLedgerEntry, { 
    success: false, 
    message: '' 
  });

  // Success Reset logic
  useEffect(() => {
    if (state.success) {
      setSelectedCompanyId(""); setSelectedProductId(""); setSelectedSubstance(null);
      setOriginWarehouse(""); setOriginState(""); setDestinationState(""); setTargetSpecies("");
      setStrength(0); setShippingPacks(0); setDisplayPackSize(""); setNumericPackSize(0);
      formRef.current?.reset();
    }
  }, [state.success]);

  // Substance Detection logic
  useEffect(() => {
    const product = companies.find(p => p.id === selectedProductId);
    if (product) {
      const match = atcCodes.find(a => a.substance?.toLowerCase() === product.active_substance?.toLowerCase());
      setSelectedSubstance(match || { substance: product.active_substance, ddd_mg: 0 });
      setDisplayPackSize(product.shipping_pack_size || "");
      const mult = (product.shipping_pack_size || "").split(/[xX*]/).reduce((a, c) => a * (parseInt(c.replace(/\D/g,'')) || 1), 1);
      setNumericPackSize(mult || 0);
    }
  }, [selectedProductId, companies, atcCodes]);

  const totalUnits = shippingPacks * numericPackSize;

  const dddPreview = useMemo(() => {
    if (!selectedSubstance || !strength || !totalUnits) return null;
    let norm = unit === 'g' ? strength * 1000 : strength;
    if (unit === 'IU') norm = strength / parseFloat(selectedSubstance.iu_to_mg_factor || "1");
    const mass = totalUnits * norm;
    const ddd = parseFloat(selectedSubstance.ddd_mg) > 0 ? mass / parseFloat(selectedSubstance.ddd_mg) : 0;
    return { mass, ddd };
  }, [selectedSubstance, strength, totalUnits, unit]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {/* Hidden Fields for DB Mapping */}
      <input type="hidden" name="entry_type" value={type} />
      <input type="hidden" name="origin_warehouse" value={originWarehouse} />
      <input type="hidden" name="origin_state" value={originState} />
      <input type="hidden" name="destination_state" value={destinationState} />
      <input type="hidden" name="geopolitical_zone" value={derivedZone} />
      <input type="hidden" name="target_species" value={targetSpecies} />
      <input type="hidden" name="mass_unit" value={unit} />

      {/* STEP 1: CORPORATE SELECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> Marketing Authorization Holder
          </label>
          <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedProductId(""); }} className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-medium" required>
            <option value="">Select MAH...</option>
            {Array.from(new Set(companies.map(c => c.company_name))).map(name => <option key={name} value={name}>{name}</option>)}
          </select>
        </div>
        <div className={`flex flex-col gap-1.5 ${!selectedCompanyId ? 'opacity-40' : ''}`}>
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Tag size={14} /> Registered Product Brand
          </label>
          <select name="product_id" value={selectedProductId} onChange={(e) => setSelectedProductId(e.target.value)} className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-medium" required={!!selectedCompanyId}>
            <option value="">Select Brand...</option>
            {companies.filter(c => c.company_name === selectedCompanyId).map(p => <option key={p.id} value={p.id}>{p.product_name}</option>)}
          </select>
        </div>
      </div>

      {/* STEP 2: GRANULAR LOGISTICS (Pinpoint Warehouse Tracking) */}
      {type === 'CONSUMPTION' && selectedProductId && (
        <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
             <Warehouse size={18} className="text-blue-600" />
             <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Supply Chain Pinpoint</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Origin State</label>
              <select value={originState} onChange={(e) => setOriginState(e.target.value)} className="p-3 rounded-xl border-2 border-white bg-white font-bold outline-none" required>
                <option value="">Origin State...</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Origin Warehouse</label>
              <input type="text" placeholder="e.g. Lagos Hub A" value={originWarehouse} onChange={(e) => setOriginWarehouse(e.target.value)} className="p-3 rounded-xl border-2 border-white bg-white font-bold outline-none" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Target State</label>
              <select value={destinationState} onChange={(e) => setDestinationState(e.target.value)} className="p-3 rounded-xl border-2 border-white bg-white font-bold outline-none" required>
                <option value="">Destination State...</option>
                {ALL_STATES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Target Sector</label>
              <select value={targetSpecies} onChange={(e) => setTargetSpecies(e.target.value)} className="p-3 rounded-xl border-2 border-white bg-white font-bold outline-none" required>
                <option value="">Select Sector...</option>
                {SPECIES_CATEGORIES.map(s => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
          </div>
        </div>
      )}

      {/* STEP 3: SUBSTANCE & DDD CALCULATIONS */}
      {selectedSubstance && (
        <div className="bg-slate-900 p-6 rounded-3xl text-white space-y-6 shadow-2xl">
          <div className="flex justify-between items-center border-b border-slate-800 pb-4">
             <div>
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Active Ingredient</p>
               <h4 className="text-xl font-bold text-emerald-400">{selectedSubstance.substance}</h4>
             </div>
             <div className="text-right">
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zone</p>
               <span className="text-blue-400 font-bold uppercase">{derivedZone || 'N/A'}</span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Packs Dispatched</label>
              <input type="number" value={shippingPacks || ""} onChange={(e) => setShippingPacks(Number(e.target.value))} className="bg-slate-800 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Pack Weight/Count</label>
              <input type="text" readOnly value={displayPackSize} className="bg-slate-800/50 p-3 rounded-xl font-bold text-slate-500 cursor-not-allowed" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Strength ({unit})</label>
              <input type="number" step="any" value={strength || ""} onChange={(e) => setStrength(parseFloat(e.target.value))} className="bg-slate-800 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
          </div>

          {dddPreview && (
            <div className="bg-emerald-600 p-5 rounded-2xl flex justify-between items-center border-b-4 border-emerald-800">
              <div>
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Consumption Load (DDD)</p>
                <p className="text-4xl font-black">{dddPreview.ddd.toFixed(4)}</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-black text-emerald-100 uppercase tracking-widest">Total API Content</p>
                <p className="font-bold text-xl">{dddPreview.mass.toLocaleString()} mg</p>
              </div>
            </div>
          )}
        </div>
      )}

      <button type="submit" disabled={isPending || !selectedSubstance} className="w-full bg-blue-600 text-white font-black uppercase tracking-[0.2em] py-5 rounded-2xl hover:bg-blue-500 transition-all shadow-xl disabled:bg-slate-300">
        {isPending ? 'Verifying & Logging...' : `Record ${type} Activity`}
      </button>

      {state.message && (
        <div className={`p-4 rounded-xl flex items-center gap-3 border ${state.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
          {state.success ? <Activity size={18} /> : <AlertTriangle size={18} />}
          <span className="text-sm font-bold">{state.message}</span>
        </div>
      )}
    </form>
  );
}