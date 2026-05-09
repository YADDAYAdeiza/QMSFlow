'use client';
import { useState, Fragment, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import LedgerForm from './LedgerForm';
import { 
  Search, 
  XCircle, 
  FileEdit,
  ClipboardList,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle
} from 'lucide-react';

interface RegistrationDashboardProps {
  initialData: any[];
  atcCodes: any[];
  companies: any[];
}

export default function RegistrationDashboard({ 
  initialData, 
  atcCodes,
  companies 
}: RegistrationDashboardProps) {
  const [records, setRecords] = useState(initialData);
  const [search, setSearch] = useState('');
  const [activeLedgerEntry, setActiveLedgerEntry] = useState<any | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setRecords(initialData);
  }, [initialData]);

  // Updated to point to your actual ledger table
  const refreshData = async () => {
    const { data, error } = await supabase
      .from('ledger_entries') 
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setRecords(data);
    }
  };

  const filtered = records.filter(r => 
    r.entry_type?.toLowerCase().includes(search.toLowerCase()) || 
    r.atc_id?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input 
          placeholder="Search by type or substance ID..." 
          className="border p-3 pl-10 w-full rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none shadow-sm"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-2xl shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-[10px] uppercase tracking-[0.15em]">
              <th className="p-4 text-left font-black">Entry Type</th>
              <th className="p-4 text-left font-black">API Mass (mg)</th>
              <th className="p-4 text-left font-black">DDD Consumed</th>
              <th className="p-4 text-center font-black">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((record) => (
              <Fragment key={record.id}>
                <tr className="hover:bg-slate-50/50 transition-colors">
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {record.entry_type === 'IMPORT' ? (
                        <ArrowDownCircle className="text-blue-500" size={18} />
                      ) : (
                        <ArrowUpCircle className="text-amber-500" size={18} />
                      )}
                      <div className="flex flex-col">
                        <span className="font-black text-slate-700 text-sm">{record.entry_type}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{record.created_at.split(' ')[0]}</span>
                      </div>
                    </div>
                  </td>
                  <td className="p-4">
                    <span className="text-sm font-bold text-slate-600">
                      {parseFloat(record.api_mass_mg).toLocaleString()} mg
                    </span>
                  </td>
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-sm font-black text-emerald-600">
                        {parseFloat(record.ddd_consumed).toFixed(4)}
                      </span>
                      <span className="text-[9px] font-bold text-slate-300 uppercase">Total DDDs</span>
                    </div>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setActiveLedgerEntry(record)} 
                      className="inline-flex items-center gap-2 bg-white border-2 border-slate-200 text-slate-700 px-4 py-2 rounded-xl text-xs font-black hover:border-emerald-500 hover:text-emerald-600 transition-all shadow-sm"
                    >
                      <FileEdit size={14} /> REVIEW
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* The Modal wrapping the LedgerForm */}
      {activeLedgerEntry && (
        <div className="fixed inset-0 bg-slate-900/80 backdrop-blur-md z-[200] flex items-center justify-center p-4 animate-in fade-in duration-300">
          <div className="bg-white rounded-[2rem] w-full max-w-2xl max-h-[90vh] overflow-hidden relative shadow-2xl border border-white/20">
            
            {/* Modal Header */}
            <div className="bg-white border-b border-slate-100 p-8 flex justify-between items-center relative z-20">
              <div>
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-3 uppercase tracking-tight">
                  <Activity className="text-emerald-500" />
                  Ledger Entry Review
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] font-black text-slate-500 uppercase">
                    {activeLedgerEntry.entry_type}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    UID: {activeLedgerEntry.id.slice(0,8)}...
                  </span>
                </div>
              </div>
              <button 
                onClick={() => setActiveLedgerEntry(null)} 
                className="p-2 hover:bg-rose-50 text-slate-300 hover:text-rose-500 rounded-full transition-all"
              >
                <XCircle size={32} strokeWidth={1.5} />
              </button>
            </div>

            {/* Scrollable Content Area */}
            {/* RegistrationDashboard.tsx (Relevant Section) */}
              <div className="p-8 overflow-y-auto max-h-[calc(90vh-180px)]">
                <LedgerForm 
                  type={activeLedgerEntry.entry_type} 
                  atcCodes={atcCodes} 
                  companies={companies} 
                  initialData={activeLedgerEntry} // PASS THE DATA HERE
                />
              </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                 Divisional Deputy Director | VMD Audit Trail
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}