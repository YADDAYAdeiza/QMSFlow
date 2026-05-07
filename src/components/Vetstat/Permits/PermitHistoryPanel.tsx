'use client';
import { useEffect, useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { X, FileText, ArrowDownLeft, ArrowUpRight, Calendar } from 'lucide-react';

export default function PermitHistoryPanel({ permit, atcCodes, onClose }: any) {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    console.log('This is permit.id: ',  permit.id);
    async function fetchLogs() {
      const { data } = await supabase
        .from('permit_ledger_logs')
        .select('*')
        .eq('permit_id', permit.id)
        .order('created_at', { ascending: false });
      console.log('This is data: ', data);
      setLogs(data || []);
      setLoading(false);
    }
    fetchLogs();
  }, [permit.id]);

  return (
    <div className="fixed inset-0 z-[200] overflow-hidden">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="absolute inset-y-0 right-0 max-w-full flex">
        <div className="w-screen max-w-md bg-white shadow-2xl flex flex-col">
          <div className="p-6 border-b flex justify-between items-center bg-slate-50">
            <div>
              <h2 className="text-xl font-black text-slate-800">Audit Trail</h2>
              <p className="text-xs text-emerald-600 font-bold uppercase tracking-widest">{permit.permit_number}</p>
            </div>
            <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-full transition">
              <X size={20} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {loading ? (
              <div className="flex justify-center py-10">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-20 text-slate-400 italic">
                No ledger activity recorded for this permit yet.
              </div>
            ) : (
              <div className="space-y-6 relative before:absolute before:inset-0 before:left-5 before:border-l-2 before:border-slate-100">
                {logs.map((log) => {
                  const sub = atcCodes.find(a => a.id === log.substance_id);
                  const isIntake = log.mode === 'INTAKE';

                  return (
                    <div key={log.id} className="relative pl-10">
                      <div className={`absolute left-2.5 top-1 w-5 h-5 rounded-full border-4 border-white shadow-sm z-10 
                        ${isIntake ? 'bg-emerald-500' : 'bg-rose-500'}`} />
                      
                      <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 hover:border-emerald-200 transition">
                        <div className="flex justify-between items-start mb-2">
                          <span className={`text-[10px] font-black px-2 py-0.5 rounded uppercase ${
                            isIntake ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'
                          }`}>
                            {log.mode}
                          </span>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 font-medium">
                            <Calendar size={10} /> {new Date(log.created_at).toLocaleString()}
                          </span>
                        </div>
                        
                        <h4 className="font-bold text-slate-800 text-sm">{sub?.substance}</h4>
                        <p className="text-lg font-black text-slate-900">{log.quantity}kg</p>
                        
                        <div className="mt-3 pt-3 border-t border-slate-200/50 flex justify-between items-center">
                          <span className="text-[10px] text-slate-500">By: **Divisional Deputy Director**</span>
                          {log.storage_path && (
                            <a 
                              href={`${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/Permit/${log.storage_path}`}
                              target="_blank"
                              className="flex items-center gap-1 text-emerald-600 text-[10px] font-bold hover:underline"
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