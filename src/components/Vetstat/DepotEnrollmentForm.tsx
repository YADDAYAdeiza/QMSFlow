'use client';

import { useState, useRef, useEffect } from 'react';
import { useActionState } from 'react';
import { enrollDepotLocation } from "@/lib/actions/Vetstat/depotAction";
import { Building2, MapPin, Warehouse, PlusCircle, CheckCircle2, AlertTriangle, ChevronDown, ChevronUp, Layers, Timer } from 'lucide-react';

interface DepotEnrollmentFormProps {
  companies: any[];
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

export default function DepotEnrollmentForm({ companies = [] }: DepotEnrollmentFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [selectedState, setSelectedState] = useState("");
  const [nodeType, setNodeType] = useState<'WAREHOUSE' | 'DEPOT'>('DEPOT');
  
  // QMS Workflow metric tracking stopwatch state
  const [startTime, setStartTime] = useState<number | null>(null);
  const [elapsedSeconds, setElapsedSeconds] = useState<number>(0);

  // Auto-calculate the matching geopolitical zone based on active dropdown selection
  const calculatedZone = Object.keys(GEO_ZONES).find(zone => 
    GEO_ZONES[zone].includes(selectedState)
  ) || "";

  const [state, action, isPending] = useActionState(enrollDepotLocation, {
    success: false,
    message: '',
    timestamp: 0
  });

  const uniqueCompanies = Array.from(new Set(companies.map(c => c.company_name))).sort();

  // Start workflow tracking whenever the form layout container expands open
  useEffect(() => {
    if (isOpen) {
      setStartTime(Date.now());
    } else {
      setStartTime(null);
      setElapsedSeconds(0);
    }
  }, [isOpen]);

  // Keep a running update loop for visible workflow auditing feedback
  useEffect(() => {
    if (!startTime || isPending || state.success) return;

    const interval = setInterval(() => {
      setElapsedSeconds(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [startTime, isPending, state.success]);

  // Handle post-submission routines smoothly
  useEffect(() => {
    if (state.success && state.timestamp !== 0) {
      const timer = setTimeout(() => {
        setSelectedCompany("");
        setSelectedState("");
        formRef.current?.reset();
        setIsOpen(false);
      }, 2000);
      
      return () => clearTimeout(timer);
    }
  }, [state.success, state.timestamp]);

  return (
    <div className="bg-white border-2 border-slate-200 rounded-3xl overflow-hidden shadow-sm transition-all duration-300">
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full p-5 bg-slate-50 hover:bg-slate-100/80 flex items-center justify-between text-left transition-colors select-none"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-amber-500/10 text-amber-600 rounded-xl">
            <Warehouse size={20} />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Corporate Supply Chain Node Registry</h3>
            <p className="text-xs text-slate-500 font-medium">Enroll verified central warehouses and regional distribution depots</p>
          </div>
        </div>
        <div className="flex items-center gap-4 text-slate-400">
          {isOpen && startTime && (
            <div className="flex items-center gap-1 bg-slate-200/60 px-2 py-1 rounded-md text-[10px] font-mono font-bold text-slate-600">
              <Timer size={11} className="animate-pulse" />
              <span>{elapsedSeconds}s</span>
            </div>
          )}
          {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
        </div>
      </button>

      {isOpen && (
        <form ref={formRef} action={action} className="p-6 space-y-5 border-t-2 border-slate-100 animate-in slide-in-from-top-2 duration-200">
          
          {/* Hidden metadata payloads passed downstream securely to server actions */}
          <input type="hidden" name="node_type" value={nodeType} />
          <input type="hidden" name="geopolitical_zone" value={calculatedZone} />
          <input type="hidden" name="qms_completion_duration_seconds" value={elapsedSeconds} />

          {/* Subsegment Selector: Node Type Specification Toggle */}
          <div className="flex flex-col gap-1.5 border-b border-slate-100 pb-4">
            <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
              <Layers size={13} /> Facility Classification
            </label>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setNodeType('DEPOT')}
                className={`flex-1 p-3 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all ${nodeType === 'DEPOT' ? 'border-amber-500 bg-amber-50 text-amber-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                Regional Distribution Depot Node
              </button>
              <button
                type="button"
                onClick={() => setNodeType('WAREHOUSE')}
                className={`flex-1 p-3 rounded-xl border-2 font-black text-xs uppercase tracking-wider transition-all ${nodeType === 'WAREHOUSE' ? 'border-blue-600 bg-blue-50 text-blue-800 shadow-sm' : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'}`}
              >
                Central Strategic Warehouse Hub
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Building2 size={13} /> Marketing Authorization Holder
              </label>
              <select 
                name="company_name"
                value={selectedCompany} 
                onChange={(e) => setSelectedCompany(e.target.value)}
                className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-bold text-slate-700 text-sm cursor-pointer"
                required
              >
                <option value="">Select Corporate MAH...</option>
                {uniqueCompanies.map(name => (
                  <option key={name} value={name}>{name}</option>
                ))}
              </select>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <Warehouse size={13} /> Facility Unique Title
              </label>
              <input 
                type="text"
                name="depot_name"
                placeholder={nodeType === 'WAREHOUSE' ? "e.g. Lagos Seaport Depot A" : "e.g. North-West Hub (Kano)"}
                className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-bold text-slate-700 text-sm"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                <MapPin size={13} /> Geopolitical State Location
              </label>
              <select 
                name="state"
                value={selectedState} 
                onChange={(e) => setSelectedState(e.target.value)}
                className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-bold text-slate-700 text-sm cursor-pointer"
                required
              >
                <option value="">Select State...</option>
                {ALL_STATES.map(stateName => (
                  <option key={stateName} value={stateName}>{stateName}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-black text-slate-500 uppercase tracking-wider">
                Physical Footprint Address
              </label>
              {calculatedZone && (
                <span className="text-[10px] font-extrabold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md uppercase tracking-wider">
                  Zone: {calculatedZone}
                </span>
              )}
            </div>
            <input 
              type="text"
              name="physical_address"
              placeholder="e.g. Plot 14, Industrial Layout, Phase II, State Nigeria"
              className="border-2 p-3 rounded-xl focus:border-blue-600 outline-none bg-white font-bold text-slate-700 text-sm"
              required
            />
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2">
            <div className="flex-1 max-w-xl">
              {state.message && (
                <div className={`p-3 rounded-xl flex items-center gap-2.5 border text-xs font-bold animate-in fade-in ${state.success ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'}`}>
                  {state.success ? <CheckCircle2 size={15} /> : <AlertTriangle size={15} />}
                  <span>{state.message}</span>
                </div>
              )}
            </div>

            <button 
              type="submit" 
              disabled={isPending || state.success}
              className="px-6 py-3.5 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center gap-2 disabled:bg-slate-300 shadow-md cursor-pointer disabled:cursor-not-allowed"
            >
              <PlusCircle size={14} />
              {isPending ? 'Processing Authorization...' : state.success ? 'Success Registered' : `Authorize & Register ${nodeType === 'WAREHOUSE' ? 'Warehouse Hub' : 'Distribution Depot'}`}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}