'use client';
import { useState, Fragment, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import LedgerForm from './LedgerForm'; // This is your FPP code component
import { 
  Search, 
  ChevronDown, 
  ChevronUp, 
  XCircle, 
  History,
  FileEdit,
  ClipboardList
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
  const [expandedId, setExpandedId] = useState<string | null>(null);
  
  // State to control the LedgerForm Modal
  const [activeLedgerEntry, setActiveLedgerEntry] = useState<any | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setRecords(initialData);
  }, [initialData]);

  const refreshData = async () => {
    const { data, error } = await supabase
      .from('registrations') // Adjust table name as per your schema
      .select('*')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setRecords(data);
    }
  };

  const filtered = records.filter(r => 
    r.permit_number?.toLowerCase().includes(search.toLowerCase()) || 
    r.company_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4 relative">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input 
          placeholder="Search registrations..." 
          className="border p-2 pl-10 w-full rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm bg-white">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <th className="p-4 text-left font-bold">Registration Details</th>
              <th className="p-4 text-left font-bold">Status</th>
              <th className="p-4 text-center font-bold">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200">
            {filtered.map((record) => (
              <Fragment key={record.id}>
                <tr className="hover:bg-slate-50 transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <span className="text-emerald-700 font-bold">{record.permit_number}</span>
                      <span className="text-sm font-semibold text-slate-800">{record.company_name}</span>
                    </div>
                  </td>
                  <td className="p-4">
                     <span className="px-2 py-1 rounded-full bg-slate-100 text-[10px] font-bold text-slate-600 uppercase">
                        {record.status || 'Active'}
                     </span>
                  </td>
                  <td className="p-4 text-center">
                    <button 
                      onClick={() => setActiveLedgerEntry(record)} 
                      className="flex items-center gap-2 bg-slate-900 text-white px-4 py-2 rounded-lg text-xs font-black hover:bg-emerald-600 transition shadow-md"
                    >
                      <FileEdit size={14} /> EDIT ENTRY
                    </button>
                  </td>
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>

      {/* The Modal wrapping your FPP LedgerForm */}
      {activeLedgerEntry && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-2xl max-h-[90vh] overflow-y-auto relative shadow-2xl border border-slate-200">
            
            {/* Modal Header */}
            <div className="sticky top-0 bg-white border-b border-slate-100 p-6 flex justify-between items-center z-20">
              <div>
                <h2 className="text-xl font-black text-slate-800 flex items-center gap-2 uppercase tracking-tight">
                  <ClipboardList className="text-emerald-600" />
                  Update Registration Ledger
                </h2>
                <p className="text-xs font-bold text-slate-400 mt-1">
                  ID: {activeLedgerEntry.id} | {activeLedgerEntry.company_name}
                </p>
              </div>
              <button 
                onClick={() => setActiveLedgerEntry(null)} 
                className="p-2 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded-full transition-colors"
              >
                <XCircle size={28} />
              </button>
            </div>

            {/* The LedgerForm Component */}
            <div className="p-8">
              <LedgerForm 
                type="IMPORT" 
                atcCodes={atcCodes} 
                companies={companies} 
              />
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 text-center">
               <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  Secure Regulatory Update Portal
               </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}