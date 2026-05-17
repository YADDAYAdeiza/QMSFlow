'use client';

import { useState, useRef, useEffect, useMemo } from 'react';
import { useActionState } from 'react';
import { submitLedgerEntry } from "@/lib/actions/Vetstat/importAction";
import { 
  Package, Beaker, Activity, AlertTriangle, 
  ChevronRight, Building2, Tag, MapPin,
  Truck, Bird, Warehouse, Layers
} from 'lucide-react';

interface LedgerFormProps {
  type: 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION';
  atcCodes: any[];
  companies: any[]; 
  initialData?: any; 
  enrolledDepots?: any[]; // Reloaded network master nodes array parameter passes down cleanly
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

export default function LedgerForm({ type, atcCodes = [], companies = [], enrolledDepots = [], initialData }: LedgerFormProps) {
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
  
  // Dynamic Node Tracking Selection Parameter IDs
  const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
  const [isDepotDistribution, setIsDepotDistribution] = useState<boolean>(false);
  const [targetDepotId, setTargetDepotId] = useState<string>("");

  // Calculation States
  const [unit, setUnit] = useState<'mg' | 'g' | 'IU'>(initialData?.metadata?.original_unit || 'mg');
  const [strength, setStrength] = useState<number>(initialData?.metadata?.strength_at_log || 0);
  const [shippingPacks, setShippingPacks] = useState(initialData?.pack_quantity || 0);
  const [displayPackSize, setDisplayPackSize] = useState(""); 
  const [numericPackSize, setNumericPackSize] = useState(0); 

  // Compute live active product balance matching profiles
  const activeProductMatch = useMemo(() => {
    return companies.find(p => p.id === selectedProductId);
  }, [selectedProductId, companies]);

  // Isolate custom strategically enrolled warehouses assigned to active corporation
  const filteredCorporateWarehouses = useMemo(() => {
    if (!selectedCompanyId) return [];
    return enrolledDepots.filter(
      node => node.company_name.toLowerCase() === selectedCompanyId.toLowerCase() && node.node_type === 'WAREHOUSE'
    );
  }, [selectedCompanyId, enrolledDepots]);

  // Isolate downstream distribution regional depot facilities assigned to active corporation
  const filteredCorporateDepots = useMemo(() => {
    if (!selectedCompanyId) return [];
    return enrolledDepots.filter(
      node => node.company_name.toLowerCase() === selectedCompanyId.toLowerCase() && node.node_type === 'DEPOT'
    );
  }, [selectedCompanyId, enrolledDepots]);

  const [state, action, isPending] = useActionState(submitLedgerEntry, { 
    success: false, 
    message: '',
    timestamp: 0 
  });

  // Success Reset logic
  useEffect(() => {
    if (state.success && state.timestamp !== 0) {
      setSelectedCompanyId(""); 
      setSelectedProductId(""); 
      setSelectedSubstance(null);
      setOriginWarehouse(""); 
      setOriginState(""); 
      setDestinationState(""); 
      setTargetSpecies("");
      setTargetWarehouseId("");
      setIsDepotDistribution(false);
      setTargetDepotId("");
      setStrength(0); 
      setShippingPacks(0); 
      setDisplayPackSize(""); 
      setNumericPackSize(0);
      formRef.current?.reset();
    }
  }, [state.success, state.timestamp]);

  // Substance Detection & Master Data Strength Prefill
  useEffect(() => {
    if (activeProductMatch) {
      const match = atcCodes.find(a => a.substance?.toLowerCase() === activeProductMatch.active_substance?.toLowerCase());
      setSelectedSubstance(match || { id: "", substance: activeProductMatch.active_substance, ddd_mg: 0 });
      
      setDisplayPackSize(activeProductMatch.shipping_pack_size || "");
      const mult = (activeProductMatch.shipping_pack_size || "").split(/[xX*]/).reduce((a: number, c: string) => a * (parseInt(c.replace(/\D/g,'')) || 1), 1);
      setNumericPackSize(mult || 0);

      if (activeProductMatch.strength) {
        const numericStrength = parseFloat(activeProductMatch.strength.replace(/[^\d.]/g, ''));
        setStrength(numericStrength || 0);
      }
    }
  }, [activeProductMatch, atcCodes]);

  // Handle dynamic lookup updates when origin source node is modified
  const handleWarehouseSelectionChange = (warehouseId: string) => {
    setTargetWarehouseId(warehouseId);
    if (!warehouseId) {
      setOriginWarehouse("");
      setOriginState("");
      return;
    }
    const matchingHub = filteredCorporateWarehouses.find(w => w.id === warehouseId);
    if (matchingHub) {
      setOriginWarehouse(matchingHub.depot_name); // maps standard string property back down
      setOriginState(matchingHub.state);
    }
  };

  // Bidirectional Lookup Logic: Triggered when user selects a registered depot location
  const handleDepotSelectionChange = (depotId: string) => {
    setTargetDepotId(depotId);
    
    if (!depotId) {
      setDestinationState("");
      return;
    }

    const selectedDepotNode = filteredCorporateDepots.find(d => d.id === depotId);
    if (selectedDepotNode) {
      setDestinationState(selectedDepotNode.state);
      setTargetSpecies("Poultry + Livestock");
    }
  };

  const totalUnits = shippingPacks * numericPackSize;

  const dddPreview = useMemo(() => {
    if (!selectedSubstance || !strength || !totalUnits) return null;
    let norm = unit === 'g' ? strength * 1000 : strength;
    if (unit === 'IU') norm = strength / parseFloat(selectedSubstance.iu_to_mg_factor || "1");
    const mass = totalUnits * norm;
    const ddd = parseFloat(selectedSubstance.ddd_mg) > 0 ? mass / parseFloat(selectedSubstance.ddd_mg) : 0;
    return { mass, ddd };
  }, [selectedSubstance, strength, totalUnits, unit]);

  const derivedZone = useMemo(() => {
    for (const [zone, states] of Object.entries(GEO_ZONES)) {
      if (states.includes(destinationState)) return zone;
    }
    return "";
  }, [destinationState]);

  return (
    <form ref={formRef} action={action} className="space-y-6">
      {/* Hidden Fields for Server Action mapping */}
      <input type="hidden" name="entry_type" value={type} />
      <input type="hidden" name="origin_warehouse" value={originWarehouse} />
      <input type="hidden" name="origin_state" value={originState} />
      <input type="hidden" name="destination_state" value={destinationState} />
      <input type="hidden" name="geopolitical_zone" value={derivedZone} />
      <input type="hidden" name="target_species" value={targetSpecies} />
      <input type="hidden" name="mass_unit" value={unit} />
      <input type="hidden" name="is_depot_distribution" value={String(isDepotDistribution)} />
      <input type="hidden" name="target_depot_id" value={targetDepotId} />
      <input type="hidden" name="atc_id" value={selectedSubstance?.id || ""} />

      {/* VERIFIED INVENTORY BADGES */}
      {activeProductMatch && (
        <div className="bg-slate-100 border border-slate-200 p-4 rounded-2xl flex flex-wrap gap-4 items-center justify-between animate-in fade-in duration-200">
          <div className="flex items-center gap-2.5">
            <Warehouse size={18} className="text-slate-500" />
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Current Verified Balances</p>
              <h5 className="text-sm font-bold text-slate-700">Stock Assets Profile</h5>
            </div>
          </div>
          <div className="flex gap-2">
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center">
              <span className="block text-[9px] font-black text-slate-400 uppercase">Central Whse</span>
              <span className={`text-sm font-black ${activeProductMatch.warehouse_balance > 0 ? 'text-blue-600' : 'text-slate-400'}`}>
                {activeProductMatch.warehouse_balance ?? 0} Packs
              </span>
            </div>
            <div className="bg-white border border-slate-200 px-4 py-2 rounded-xl text-center">
              <span className="block text-[9px] font-black text-slate-400 uppercase">Active Depots</span>
              <span className="text-sm font-black text-slate-600">
                {activeProductMatch.depots?.length || 0} Locations
              </span>
            </div>
          </div>
        </div>
      )}

      {/* STEP 1: CORPORATE SELECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
            <Building2 size={14} /> Marketing Authorization Holder
          </label>
          <select value={selectedCompanyId} onChange={(e) => { setSelectedCompanyId(e.target.value); setSelectedProductId(""); setTargetDepotId(""); setTargetWarehouseId(""); }} className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-medium" required>
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

      {/* STEP 2: GRANULAR LOGISTICS */}
      {type === 'CONSUMPTION' && selectedProductId && (
        <div className="p-6 bg-slate-50 border-2 border-slate-200 rounded-3xl space-y-5 animate-in slide-in-from-top-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-3">
             <div className="flex items-center gap-2">
                <Warehouse size={18} className="text-blue-600" />
                <h3 className="text-sm font-black text-slate-700 uppercase tracking-widest">Supply Chain Pinpoint</h3>
             </div>
             
             {/* Alternate Route Toggle */}
             <label className="flex items-center gap-2 cursor-pointer bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-sm select-none">
               <input 
                 type="checkbox" 
                 checked={isDepotDistribution} 
                 onChange={(e) => {
                   setIsDepotDistribution(e.target.checked);
                   setTargetDepotId("");
                   if (!e.target.checked) setDestinationState("");
                 }}
                 className="accent-blue-600 h-4 w-4"
               />
               <span className="text-xs font-bold text-slate-600 flex items-center gap-1">
                 <Layers size={13} className="text-amber-500" /> Regional Depot Supply Route
               </span>
             </label>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* AUTOMATED SOURCE WAREHOUSE PICKER */}
            <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 bg-blue-50/40 p-3 rounded-xl border border-blue-100">
              <label className="text-[10px] font-black text-blue-700 uppercase flex items-center justify-between">
                <span>Source Warehouse Hub</span>
                {originState && <span className="text-[9px] bg-blue-200 px-1.5 py-0.5 rounded text-blue-800 font-black">MAPPED STATE: {originState}</span>}
              </label>
              <select 
                value={targetWarehouseId} 
                onChange={(e) => handleWarehouseSelectionChange(e.target.value)} 
                className="p-2.5 rounded-lg border border-blue-300 bg-white font-bold text-sm outline-none text-slate-800"
                required
              >
                <option value="">Select Enrolled Warehouse Origin...</option>
                {filteredCorporateWarehouses.map(wh => (
                  <option key={wh.id} value={wh.id}>
                    {wh.depot_name} ({wh.state})
                  </option>
                ))}
                {filteredCorporateWarehouses.length === 0 && (
                  <option value="" disabled>No custom hubs found for this corporate MAH.</option>
                )}
              </select>
            </div>

            {/* If it's an enrolled Depot Allocation Route, swap fields to render the automated picker */}
            {isDepotDistribution ? (
              <div className="flex flex-col gap-1.5 col-span-1 md:col-span-2 bg-amber-50 p-3 rounded-xl border border-amber-200 animate-in zoom-in-95">
                <label className="text-[10px] font-black text-amber-700 uppercase flex items-center justify-between">
                  <span>Target Distribution Depot</span>
                  {destinationState && <span className="text-[9px] bg-amber-200 px-1.5 py-0.5 rounded text-amber-800 font-black">MAPPED STATE: {destinationState}</span>}
                </label>
                <select 
                  value={targetDepotId} 
                  onChange={(e) => handleDepotSelectionChange(e.target.value)} 
                  className="p-2.5 rounded-lg border border-amber-300 bg-white font-bold text-sm outline-none text-slate-800"
                  required={isDepotDistribution}
                >
                  <option value="">Select Enrolled Depot Location...</option>
                  {filteredCorporateDepots.map(depot => (
                    <option key={depot.id} value={depot.id}>
                      {depot.depot_name} ({depot.state})
                    </option>
                  ))}
                  {filteredCorporateDepots.length === 0 && (
                    <option value="" disabled>No registered depots found for this MAH.</option>
                  )}
                </select>
              </div>
            ) : (
              <>
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
              </>
            )}
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
               <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Zone / Route Status</p>
               <span className="text-blue-400 font-bold uppercase">
                 {isDepotDistribution ? 'DEPOT LOGISTICS CHAIN' : (derivedZone || 'N/A')}
               </span>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Packs Dispatched</label>
              <input type="number" name="pack_quantity" value={shippingPacks || ""} onChange={(e) => setShippingPacks(Number(e.target.value))} className="bg-slate-800 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500" required />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase">Pack Weight/Count</label>
              <input type="text" readOnly value={displayPackSize} className="bg-slate-800/50 p-3 rounded-xl font-bold text-slate-500 cursor-not-allowed" />
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2">
                Strength ({unit}) <span className="text-[8px] bg-emerald-500/20 text-emerald-400 px-1 rounded font-bold">VMD MASTER DATA</span>
              </label>
              <input 
                type="number" 
                step="any" 
                name="strength" 
                value={strength || ""} 
                onChange={(e) => setStrength(parseFloat(e.target.value))} 
                className="bg-slate-800 p-3 rounded-xl font-bold outline-none focus:ring-2 focus:ring-blue-500 border-none" 
                required 
              />
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