'use client';

import { useState, useEffect } from 'react';
import EnrollmentModal from './EnrollPermitModal';
import PermitDashboard from './PermitDashboard';
import RapidIntake from './RapidIntake';
import PermitAuthDashboard from './PermitAuthDashboard';
import { Layers, ShieldCheck, Landmark, Tractor, Activity } from 'lucide-react';

interface PermitPageClientProps {
  initialPermits: any[];
  atcCodes: any[];
}

export default function PermitPageClient({ initialPermits, atcCodes }: PermitPageClientProps) {
  const [activeTab, setActiveTab] = useState('permits');
  const [selectedPermit, setSelectedPermit] = useState<any | null>(null);
  
  // Dynamic divisional array structures mapped as per VMD requirements
  const divisions = ["VMD", "PAD", "AFPD", "IRSD"];

  // Monitor background data updates to keep the active side-panel contextual node fresh
  useEffect(() => {
    if (selectedPermit) {
      const match = initialPermits.find(p => p.id === selectedPermit.id);
      if (match) {
        setSelectedPermit(match);
      }
    }
  }, [initialPermits]);

  const tabs = [
    { id: 'permits', label: 'Import Permits', icon: ShieldCheck },
    { id: 'local', label: 'Local Manufacturer Utilization', icon: Landmark },
    { id: 'farm', label: 'On-Farm Utilization', icon: Tractor },
  ];

  const CurrentIcon = tabs.find(t => t.id === activeTab)?.icon || Layers;

  return (
    <div className="p-6 max-w-[1600px] mx-auto space-y-6">
      
      {/* Structural Header Area */}
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 bg-slate-900 text-white p-6 rounded-2xl shadow-sm border border-slate-800">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] bg-emerald-500/20 text-emerald-400 font-black px-2 py-0.5 rounded-md uppercase tracking-wider border border-emerald-500/30">
              National Security Module
            </span>
            <div className="flex gap-1 text-[9px] font-bold text-slate-400">
              {divisions.map((div, i) => (
                <span key={div}>
                  {div}{i < divisions.length - 1 && ' • '}
                </span>
              ))}
            </div>
          </div>
          <h1 className="text-xl font-black tracking-tight">Antimicrobial Usage Surveillance Console</h1>
          <p className="text-xs text-slate-400">Veterinary Medicine Directorate (VMD) Regulatory Tracking Workspace</p>
        </div>
        <div className="shrink-0">
          <EnrollmentModal atcCodes={atcCodes} />
        </div>
      </div>

      {/* Aggregate Analytical Dashboard Node */}
      {activeTab === 'permits' && (
        <PermitAuthDashboard permits={initialPermits} />
      )}

      {/* Segment Workspace Navigation Tabs */}
      <div className="border-b border-slate-100 flex gap-6 overflow-x-auto custom-scrollbar">
        {tabs.map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setActiveTab(tab.id);
                setSelectedPermit(null); // Clear context tracking on node pivot
              }}
              className={`pb-3 text-xs font-black uppercase tracking-wider flex items-center gap-2 border-b-2 transition outline-none shrink-0 ${
                isActive 
                  ? 'border-emerald-600 text-emerald-700' 
                  : 'border-transparent text-slate-400 hover:text-slate-600 hover:border-slate-200'
              }`}
            >
              <Icon size={14} className={isActive ? "text-emerald-600" : "text-slate-400"} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Multi-Pane Grid Infrastructure */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Side: Ledger Hub Grid (2/3 Grid Layout footprint) */}
        <div className="lg:col-span-2">
          {activeTab === 'permits' ? (
            <PermitDashboard 
              initialPermits={initialPermits} 
              atcCodes={atcCodes} 
              onSelectPermit={setSelectedPermit}
              selectedId={selectedPermit?.id}
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50/50 text-slate-400">
              <div className="h-12 w-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 text-slate-500 animate-pulse">
                <CurrentIcon size={20} />
              </div>
              <h2 className="text-sm font-black uppercase text-slate-700 tracking-wide">
                {tabs.find(t => t.id === activeTab)?.label}
              </h2>
              <p className="text-xs text-slate-400 mt-1 max-w-xs text-center">
                This database pipeline layer is currently being staged to align with localized antimicrobial consumption data architectures.
              </p>
            </div>
          )}
        </div>

        {/* Right Side: Sticky Split-Pane Processing Desk (1/3 Footprint) */}
        <div className="lg:col-span-1 lg:sticky lg:top-6">
          {selectedPermit ? (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200">
              {/* Context Profile Header */}
              <div className="p-4 bg-slate-50 border-b border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[9px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-black px-2 py-0.5 rounded-md uppercase tracking-wider flex items-center gap-1">
                    <Activity size={10} className="animate-pulse text-emerald-600" />
                    Desk Context Bound
                  </span>
                </div>
                <div>
                  <h4 className="font-black text-slate-800 text-xs truncate max-w-[280px]">
                    {selectedPermit.company_name}
                  </h4>
                  <p className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide font-medium">
                    Permit Reference: <span className="text-slate-600 font-bold">{selectedPermit.permit_number}</span>
                  </p>
                </div>
              </div>
              
              {/* Localized Execution Window Container */}
              <div className="p-4 bg-white">
                <RapidIntake 
                  companyName={selectedPermit.company_name} 
                  permitId={selectedPermit.id}
                  mode="OUTAKE" // Default localized workflow pane tracking setting
                  onComplete={() => {
                    // Triggers inline reset variables or background validation cascades if necessary
                    console.log(` सुरिक्षत context side-car operational action completed.`);
                  }}
                />
              </div>
            </div>
          ) : (
            <div className="border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center text-slate-400 p-8 text-center min-h-[260px] bg-slate-50/20">
              <p className="text-xs font-medium italic">
                Select an active registration header row from the tracking matrix ledger to slide in the dynamic Rapid Intake configuration module.
              </p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}