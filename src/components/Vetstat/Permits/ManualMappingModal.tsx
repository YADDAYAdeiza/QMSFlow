'use client';

import { useState, useEffect } from 'react';
import { Loader2, AlertCircle, Check, X } from 'lucide-react';
import { fetchCompanyActiveAuthorizations } from '@/lib/actions/Vetstat/Permits/permitActions';

interface AuthorizedSubstance {
  substance: string;
  permit_number: string;
}

interface ManualMappingModalProps {
  companyName: string;
  rawName: string;
  onClose: () => void;
  onConfirm: (item: AuthorizedSubstance) => void;
}

export default function ManualMappingModal({ 
  companyName, 
  rawName, 
  onClose, 
  onConfirm 
}: ManualMappingModalProps) {
  const [authorizedList, setAuthorizedList] = useState<AuthorizedSubstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    setLoading(true);
    setError(null);

    async function loadData() {
      const result = await fetchCompanyActiveAuthorizations(companyName);
      
      // Ignore execution state mutations if the user unmounted the modal workspace
      if (!isMounted) return;

      if (result.success && result.data) {
        setAuthorizedList(result.data);
      } else {
        setError(result.error || 'Failed to fetch authorized datasets.');
      }
      setLoading(false);
    }

    loadData();

    // Cleanup phase: cancel pending state assertions if the modal vanishes
    return () => {
      isMounted = false;
    };
  }, [companyName]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 flex flex-col max-h-[85vh] animate-in scale-in-95 duration-150">
        
        {/* Header Block */}
        <div className="p-6 border-b border-slate-100 bg-slate-50 relative shrink-0">
          <h3 className="font-black text-slate-800 text-base tracking-tight">Manual System Override</h3>
          <button 
            type="button" 
            onClick={onClose}
            className="absolute top-5 right-5 p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
          >
            <X size={16} />
          </button>
          
          <div className="mt-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
            <p className="text-[10px] text-rose-500 uppercase font-black tracking-widest">Unrecognized Line Payload</p>
            <p className="text-xs font-mono font-bold text-rose-700 break-all mt-0.5">{rawName}</p>
          </div>
        </div>

        {/* Content Node Container */}
        <div className="p-6 overflow-y-auto grow flex flex-col min-h-[200px]">
          <label className="block text-[10px] font-black text-slate-400 uppercase tracking-wider mb-2">
            Select Approved VMD Substance Reference
          </label>
          
          {loading ? (
            <div className="flex flex-col items-center justify-center grow py-12 gap-2 text-slate-400">
              <Loader2 className="animate-spin text-emerald-600" size={20} />
              <span className="text-xs font-medium italic">Querying authorized regulatory registries...</span>
            </div>
          ) : error ? (
            <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" /> 
              <span>{error}</span>
            </div>
          ) : authorizedList.length > 0 ? (
            <div className="space-y-1.5 pr-1 custom-scrollbar">
              {authorizedList.map((item, idx) => (
                <button
                  key={`${item.permit_number}_${idx}`}
                  type="button"
                  onClick={() => onConfirm(item)}
                  className="w-full p-3 text-left border border-slate-100 rounded-xl hover:bg-emerald-50/60 hover:border-emerald-500/30 transition flex justify-between items-center group bg-slate-50/40"
                >
                  <div className="min-w-0 flex-1 pr-2">
                    <div className="font-black text-slate-700 text-xs truncate group-hover:text-emerald-800 transition">
                      {item.substance}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5 uppercase tracking-wide">
                      Permit ID: {item.permit_number}
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-lg bg-white border border-slate-200 shrink-0 flex items-center justify-center group-hover:bg-emerald-600 group-hover:border-emerald-600 transition-colors">
                    <Check className="text-slate-300 opacity-40 group-hover:text-white group-hover:opacity-100 transition-opacity" size={12} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 grow flex flex-col justify-center items-center">
              <p className="text-xs text-slate-400 font-medium italic">
                No active authorized permits located for:
              </p>
              <p className="text-xs font-black text-slate-600 px-2 py-1 bg-slate-100 rounded-md mt-1">
                {companyName}
              </p>
            </div>
          )}
        </div>

        {/* Footer Area */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end shrink-0">
          <button 
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-black text-slate-400 hover:text-slate-600 transition uppercase tracking-wider"
          >
            Close Window
          </button>
        </div>
      </div>
    </div>
  );
}