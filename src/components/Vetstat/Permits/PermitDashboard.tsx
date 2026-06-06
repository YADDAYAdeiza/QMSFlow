'use client';

import { useState, Fragment, useEffect, useTransition } from 'react';
import EditPermitModal from './EditPermitModal';
import AmmendPermitModal from './AmmendPermitModal';
import RapidIntake from './RapidIntake';
import PermitHistoryPanel from './PermitHistoryPanel';
import { getPermitsWithUtilization } from '@/lib/actions/Vetstat/Permits/permitActions';
import { 
  PackagePlus, 
  PackageMinus, 
  Search, 
  ChevronDown, 
  ChevronUp, 
  X, 
  History,
  FileCode2,
  RefreshCw
} from 'lucide-react';

interface PermitDashboardProps {
  initialPermits: any[];
  atcCodes: any[];
  onSelectPermit: (permit: any) => void;
  selectedId?: string;
  companiesCatalog:any[]
}

export default function PermitDashboard({ 
  initialPermits, 
  atcCodes,
  onSelectPermit,
  selectedId,
  companiesCatalog
}: PermitDashboardProps) {
  const [permits, setPermits] = useState(initialPermits);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPermit, setEditingPermit] = useState<any | null>(null);
  const [amendingPermit, setAmendingPermit] = useState<any | null>(null);
  const [viewingHistory, setViewingHistory] = useState<any | null>(null);
  const [isRefreshing, startRefreshTransition] = useTransition();
  
  const [activeScanner, setActiveScanner] = useState<{ 
    permit: any; 
    mode: 'INTAKE' | 'OUTAKE' 
  } | null>(null);

  // Synchronize state with incoming Server Component payload updates safely
  useEffect(() => {
    setPermits(initialPermits);
  }, [initialPermits]);

  // Securely refresh data using our existing, server-optimized backend action
  const refreshData = () => {
    startRefreshTransition(async () => {
      try {
        const freshData = await getPermitsWithUtilization();
        if (freshData) {
          setPermits(freshData);
        }
      } catch (err) {
        console.error("Failed to cycle fresh ledger records through server context:", err);
      }
    });
  };

  const filtered = permits.filter(p => 
    p?.permit_number?.toLowerCase().includes(search.toLowerCase()) || 
    p?.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 relative">
      {/* Search Bar & Manual Sync Core */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 text-slate-400" size={16} />
          <input 
            type="text"
            placeholder="Filter registrations by Permit Reference # or Corporate Title..." 
            className="border border-slate-200 p-2.5 pl-10 w-full rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm"
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <button
          type="button"
          disabled={isRefreshing}
          onClick={refreshData}
          className="p-2.5 border border-slate-200 rounded-xl bg-white text-slate-500 hover:bg-slate-50 transition active:scale-95 disabled:opacity-50 shrink-0 shadow-sm"
          title="Force Synchronization Refresh"
        >
          <RefreshCw size={16} className={isRefreshing ? "animate-spin text-emerald-600" : ""} />
        </button>
      </div>

      {/* Main Ledger Architecture Grid */}
      <div className="overflow-hidden border border-slate-100 rounded-2xl shadow-sm bg-white">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <th className="p-4 w-[40%]">Authorization Matrix / Holder</th>
                <th className="p-4 w-[20%]">Config Actions</th>
                <th className="p-4 w-[25%] text-center">Ledger Operations</th>
                <th className="p-4 w-[15%] text-center">Audit Trails</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filtered.map((permit) => {
                const isSelected = selectedId === permit.id;
                return (
                  <Fragment key={permit.id}>
                    <tr 
                      onClick={() => onSelectPermit(permit)}
                      className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/40' : 'hover:bg-slate-50/60'}`}
                    >
                      <td className="p-4">
                        <div className="flex flex-col space-y-0.5">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setExpandedId(expandedId === permit.id ? null : permit.id);
                            }}
                            className="text-emerald-700 font-black flex items-center gap-1 hover:text-emerald-800 text-left w-fit uppercase tracking-wide group"
                          >
                            <span>{permit.permit_number}</span>
                            <span className="p-0.5 rounded group-hover:bg-slate-100 text-slate-400 transition">
                              {expandedId === permit.id ? <ChevronUp size={12}/> : <ChevronDown size={12}/>}
                            </span>
                          </button>
                          <span className="font-bold text-slate-700 max-w-[280px] truncate block">{permit.company_name}</span>
                        </div>
                      </td>
                      
                      <td className="p-4">
                        <div className="flex gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setEditingPermit(permit)} 
                            className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 hover:text-slate-800 transition"
                          >
                            Edit
                          </button>
                          <button 
                            type="button"
                            onClick={() => setAmendingPermit(permit)} 
                            className="bg-slate-50 border border-slate-200 text-slate-600 px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-slate-100 hover:text-slate-800 transition"
                          >
                            Amend
                          </button>
                        </div>
                      </td>

                      <td className="p-4">
                        <div className="flex justify-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                          <button 
                            type="button"
                            onClick={() => setActiveScanner({ permit, mode: 'INTAKE' })}
                            className="flex items-center gap-1 bg-emerald-700 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-emerald-800 transition shadow-sm shadow-emerald-700/5"
                          >
                            <PackagePlus size={12} /> Intake
                          </button>
                          <button 
                            type="button"
                            onClick={() => setActiveScanner({ permit, mode: 'OUTAKE' })}
                            className="flex items-center gap-1 bg-rose-600 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider hover:bg-rose-700 transition shadow-sm shadow-rose-600/5"
                          >
                            <PackageMinus size={12} /> Outake
                          </button>
                        </div>
                      </td>

                      <td className="p-4 text-center">
                        <button 
                          type="button"
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setViewingHistory(permit); 
                          }}
                          className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition border border-transparent hover:border-emerald-200/40 inline-flex items-center justify-center"
                          title="Review Entry Authorization Ledger Logs"
                        >
                          <History size={16} />
                        </button>
                      </td>
                    </tr>

                    {/* Expandable Substance Details Grid */}
                    {expandedId === permit.id && (
                      <tr className="bg-slate-50/40">
                        <td colSpan={4} className="p-4 border-t border-slate-100">
                          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-inner space-y-3">
                            <h4 className="font-black text-[10px] text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                              <FileCode2 size={12} className="text-slate-400" />
                              Authorized Substances Allocation Ledger
                            </h4>
                            
                            {permit.permit_substances?.length > 0 ? (
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                {permit.permit_substances.map((s: any) => {
                                  const foundSubstance = atcCodes.find(a => a.id === s.substance_id);
                                  return (
                                    <div key={s.id} className="flex justify-between items-center p-2.5 bg-slate-50/50 rounded-xl border border-slate-100 text-xs">
                                      <span className="font-bold text-slate-600 truncate max-w-[200px]">
                                        {foundSubstance?.substance || 'Unmatched Entry Link'}
                                      </span>
                                      <span className="bg-emerald-50 text-emerald-700 border border-emerald-100/40 px-2 py-0.5 rounded-md font-black font-mono">
                                        {s.quantity_kg} kg
                                      </span>
                                    </div>
                                  );
                                })}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 font-medium italic">No substance records registered down this active allocation file node.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Overlay Panels / Modals */}
      {viewingHistory && (
        <PermitHistoryPanel 
          permit={viewingHistory} 
          atcCodes={atcCodes}
          onClose={() => setViewingHistory(null)} 
        />
      )}

      {activeScanner && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[150] flex items-center justify-center p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden relative shadow-2xl flex flex-col border border-slate-100 animate-in scale-in-95 duration-150">
            <button 
              type="button"
              onClick={() => setActiveScanner(null)} 
              className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-100 hover:text-slate-600 transition z-20"
            >
              <X size={16} />
            </button>
            
            <div className="p-6 border-b border-slate-100 bg-slate-50 shrink-0">
              <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                {activeScanner.mode === 'INTAKE' ? <PackagePlus className="text-emerald-600" size={18} /> : <PackageMinus className="text-rose-600" size={18} />}
                {activeScanner.mode} Processing Desk
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Active Operational File: <span className="text-emerald-700 font-bold font-mono uppercase">{activeScanner.permit.permit_number}</span>
              </p>
            </div>

            <div className="p-6 overflow-y-auto grow">
              <RapidIntake 
                companyName={activeScanner.permit?.companies_amr?.company_name} 
                mode={activeScanner.mode}
                permitId={activeScanner.permit.id}
                onComplete={() => {
                  refreshData();
                  setActiveScanner(null);
                }}
              />
            </div>
          </div>
        </div>
      )}

      {editingPermit && (
        <EditPermitModal 
          permit={editingPermit} 
          atcCodes={atcCodes} 
          onClose={() => {
            refreshData();
            setEditingPermit(null);
          }} 
        />
      )}

      {amendingPermit && (
        <AmmendPermitModal 
          permit={amendingPermit} 
          atcCodes={atcCodes} 
          onClose={() => {
            refreshData();
            setAmendingPermit(null);
          }} 
        />
      )}
    </div>
  );
}