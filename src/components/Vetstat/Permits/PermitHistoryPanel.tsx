'use client';

import { useEffect, useState, useTransition } from 'react';
import { X, FileText, Calendar, Loader2, History } from 'lucide-react';
import { fetchPermitLedgerLogs } from '@/lib/actions/Vetstat/Permits/permitActions';

interface PermitHistoryPanelProps {
  permit: {
    id: string;
    permit_number: string;
  };
  atcCodes: any[];
  onClose: () => void;
}

export default function PermitHistoryPanel({ permit, atcCodes, onClose }: PermitHistoryPanelProps) {
  const [logs, setLogs] = useState<any[]>([]);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setError(null);
    
    startTransition(async () => {
      const result = await fetchPermitLedgerLogs(permit.id);
      
      if (result.success && result.data) {
        setLogs(result.data);
      } else {
        setError(result.error || "Failed to load audit history trail.");
      }
    });
  }, [permit.id]);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      {/* Background Dim Backdrop */}
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm animate-in fade-in duration-200" 
        onClick={onClose} 
      />
      
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
          
          {/* Audit Header Block */}
          <div className="p-5 border-b border-slate-100 flex justify-between items-center bg-slate-50/80 shrink-0">
            <div className="space-y-0.5">
              <h2 className="text-sm font-black text-slate-800 flex items-center gap-2">
                <History size={16} className="text-emerald-600" />
                Audit Trail Ledger
              </h2>
              <p className="text-[10px] text-emerald-700 font-mono font-black uppercase tracking-wider">
                {permit.permit_number}
              </p>
            </div>
            <button 
              type="button"
              onClick={onClose} 
              className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition"
            >
              <X size={16} />
            </button>
          </div>

          {/* Audit Node Container */}
          <div className="flex-1 overflow-y-auto p-5 min-h-0 custom-scrollbar">
            {isPending ? (
              <div className="flex flex-col items-center justify-center py-24 gap-2 text-slate-400">
                <Loader2 className="animate-spin text-emerald-600" size={20} />
                <span className="text-xs font-medium italic">Compiling historical regulatory lines...</span>
              </div>
            ) : error ? (
              <div className="p-4 bg-rose-50 border border-rose-100 text-rose-700 text-xs font-bold rounded-xl">
                {error}
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-24 text-slate-400 text-xs font-medium italic">
                No ledger activity recorded for this authorization node.
              </div>
            ) : (
              <div className="space-y-5 relative before:absolute before:inset-0 before:left-[11px] before:border-l-2 before:border-slate-100">
                {logs.map((log) => {
                  const sub = atcCodes.find(a => a.id === log.substance_id);
                  const isIntake = log.mode === 'INTAKE';

                  return (
                    <div key={log.id} className="relative pl-7 animate-in fade-in slide-in-from-bottom-2 duration-150">
                      {/* Timeline Node Tracer Dot */}
                      <div className={`absolute left-1.5 top-1.5 w-2.5 h-2.5 rounded-full ring-4 ring-white shadow-sm z-10 
                        ${isIntake ? 'bg-emerald-600' : 'bg-rose-500'}`} 
                      />
                      
                      <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 hover:border-slate-200 transition space-y-2">
                        <div className="flex justify-between items-center">
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded-md uppercase tracking-wider border ${
                            isIntake 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {log.mode}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono font-medium">
                            <Calendar size={11} className="text-slate-300" /> 
                            {new Date(log.created_at).toLocaleDateString()} {new Date(log.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        
                        <div className="space-y-0.5">
                          <h4 className="font-bold text-slate-700 text-xs truncate max-w-[280px]">
                            {sub?.substance || 'Unidentified Base Substance Reference'}
                          </h4>
                          <p className="text-base font-black text-slate-900 tracking-tight font-mono">
                            {log.quantity} kg
                          </p>
                        </div>
                        
                        <div className="pt-2.5 border-t border-slate-100 flex justify-between items-center text-[10px]">
                          <span className="text-slate-400 font-medium">
                            Officer: <span className="text-slate-600 font-bold">Divisional Deputy Director</span>
                          </span>
                          
                          {log.storage_path && (
                            <a 
                              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Documents/${log.storage_path}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-emerald-600 font-black hover:text-emerald-700 transition"
                            >
                              <FileText size={12} /> VIEW DOC
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}