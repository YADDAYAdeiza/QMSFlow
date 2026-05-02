'use client';
import { useState, Fragment, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import EditPermitModal from './EditPermitModal';
import AmmendPermitModal from './AmmendPermitModal';
import RapidIntake from './RapidIntake';
import { PackagePlus, PackageMinus, Search, ChevronDown, ChevronUp, XCircle } from 'lucide-react';

interface PermitDashboardProps {
  initialPermits: any[];
  atcCodes: any[];
  onSelectPermit: (permit: any) => void;
  selectedId?: string;
}

export default function PermitDashboard({ 
  initialPermits, 
  atcCodes,
  onSelectPermit,
  selectedId 
}: PermitDashboardProps) {
  const [permits, setPermits] = useState(initialPermits);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editingPermit, setEditingPermit] = useState<any | null>(null);
  const [amendingPermit, setAmendingPermit] = useState<any | null>(null);
  
  const [activeScanner, setActiveScanner] = useState<{ 
    permit: any; 
    mode: 'INTAKE' | 'OUTAKE' 
  } | null>(null);

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    setPermits(initialPermits);
  }, [initialPermits]);

  const refreshData = async () => {
    const { data, error } = await supabase
      .from('permits')
      .select('*, permit_substances(*)')
      .order('created_at', { ascending: false });
    
    if (!error && data) {
      setPermits(data);
    }
  };

  const filtered = permits.filter(p => 
    p.permit_number.toLowerCase().includes(search.toLowerCase()) || 
    p.company_name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <div className="relative">
        <Search className="absolute left-3 top-2.5 text-slate-400" size={18} />
        <input 
          placeholder="Search by Permit # or Company..." 
          className="border p-2 pl-10 w-full rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none"
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="overflow-hidden border border-slate-200 rounded-xl shadow-sm">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50 text-slate-600 text-xs uppercase tracking-wider">
              <th className="p-4 text-left font-bold">Permit Details</th>
              <th className="p-4 text-left font-bold">Actions</th>
              <th className="p-4 text-center font-bold text-emerald-600">Ledger Ops</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 bg-white">
            {filtered.map((permit) => {
              const isSelected = selectedId === permit.id;
              return (
                <Fragment key={permit.id}>
                  <tr 
                    onClick={() => onSelectPermit(permit)}
                    className={`cursor-pointer transition-colors ${isSelected ? 'bg-emerald-50/50' : 'hover:bg-slate-50'}`}
                  >
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span 
                          className="text-emerald-700 font-bold flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedId(expandedId === permit.id ? null : permit.id);
                          }}
                        >
                          {permit.permit_number}
                          {expandedId === permit.id ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </span>
                        <span className="text-sm font-semibold text-slate-800">{permit.company_name}</span>
                      </div>
                    </td>
                    
                    <td className="p-4">
                      <div className="flex gap-2">
                        <button 
                          onClick={(e) => { e.stopPropagation(); setEditingPermit(permit); }} 
                          className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-slate-200 transition"
                        >
                          EDIT
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); setAmendingPermit(permit); }} 
                          className="bg-slate-100 text-slate-700 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-slate-200 transition"
                        >
                          AMEND
                        </button>
                      </div>
                    </td>

                    <td className="p-4">
                      <div className="flex justify-center gap-2">
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveScanner({ permit, mode: 'INTAKE' }); 
                          }}
                          className="flex items-center gap-1 bg-emerald-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-emerald-700 transition shadow-sm shadow-emerald-100"
                        >
                          <PackagePlus size={14} /> INTAKE
                        </button>
                        <button 
                          onClick={(e) => { 
                            e.stopPropagation(); 
                            setActiveScanner({ permit, mode: 'OUTAKE' }); 
                          }}
                          className="flex items-center gap-1 bg-rose-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-rose-700 transition shadow-sm shadow-rose-100"
                        >
                          <PackageMinus size={14} /> OUTAKE
                        </button>
                      </div>
                    </td>
                  </tr>

                  {expandedId === permit.id && (
                    <tr className="bg-slate-50/50">
                      <td colSpan={3} className="p-4 border-t border-slate-100">
                        <div className="bg-white p-4 rounded-lg border border-slate-200">
                          <h4 className="font-bold text-xs mb-3 text-slate-500 uppercase tracking-widest">Authorized Substances Ledger:</h4>
                          {permit.permit_substances?.length > 0 ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {permit.permit_substances.map((s: any) => {
                                const foundSubstance = atcCodes.find(a => a.id === s.substance_id);
                                return (
                                  <div key={s.id} className="flex justify-between items-center p-2 border-b border-slate-50 text-sm">
                                    <span className="font-medium text-slate-700">{foundSubstance?.substance || 'Unknown'}</span>
                                    <span className="bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded font-bold">{s.quantity_kg}kg</span>
                                  </div>
                                );
                              })}
                            </div>
                          ) : (
                            <p className="text-sm text-slate-400 italic">No substances authorized yet.</p>
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

      {/* Modals Rendering */}
      {activeScanner && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-md z-[150] flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto relative shadow-2xl">
            <button onClick={() => setActiveScanner(null)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 z-10"><XCircle size={24} /></button>
            <div className="p-8">
              <div className="mb-6">
                <h2 className="text-2xl font-black text-slate-800 flex items-center gap-2">
                  {activeScanner.mode === 'INTAKE' ? <PackagePlus className="text-emerald-600" /> : <PackageMinus className="text-rose-600" />}
                  {activeScanner.mode} Process
                </h2>
                <p className="text-slate-500 font-medium">Permit: <span className="text-emerald-700">{activeScanner.permit.permit_number}</span></p>
              </div>
              <RapidIntake 
                companyName={activeScanner.permit.company_name} 
                mode={activeScanner.mode}
                permitId={activeScanner.permit.id}
                onComplete={async () => {
                  await refreshData();
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
          onClose={async () => {
            await refreshData();
            setEditingPermit(null);
          }} 
        />
      )}

      {amendingPermit && (
        <AmmendPermitModal 
          permit={amendingPermit} 
          atcCodes={atcCodes} 
          onClose={async () => {
            await refreshData();
            setAmendingPermit(null);
          }} 
        />
      )}
    </div>
  );
}