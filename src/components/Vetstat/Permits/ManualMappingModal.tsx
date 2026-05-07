'use client';
import { useState, useEffect } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Loader2, AlertCircle, Check, ChevronDown } from 'lucide-react';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface AuthorizedSubstance {
  substance: string;
  permit_number: string;
}

export default function ManualMappingModal({ companyName, rawName, onClose, onConfirm }: any) {
  const [authorizedList, setAuthorizedList] = useState<AuthorizedSubstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyAuthorizations = async () => {
      setLoading(true);
      try {
        // Fetching substances linked to active permits for this company
        const { data, error: fetchError } = await supabase
            .from('permit_substances')
            .select(`
                quantity_kg,
                substance_id,
                atc_codes!fk_atc_codes (
                substance
                ),
                permits!inner (
                permit_number,
                company_name,
                validity
                )
            `)
            .ilike('permits.company_name', `%${companyName}%`)
            .eq('permits.validity', 'Active');

        if (fetchError) throw fetchError;

        // Transform and deduplicate just in case
        const formatted = (data as any[] || []).map(item => ({
          substance: item.atc_codes.substance,
          permit_number: item.permits.permit_number
        }));

        setAuthorizedList(formatted);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchCompanyAuthorizations();
  }, [companyName]);

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Header */}
        <div className="p-6 border-b bg-slate-50">
          <h3 className="font-bold text-slate-800 text-lg">Manual Override</h3>
          <div className="mt-2 p-2 bg-rose-50 rounded border border-rose-100">
            <p className="text-[10px] text-rose-400 uppercase font-bold tracking-tight">Unrecognized Item</p>
            <p className="text-sm font-mono text-rose-700">{rawName}</p>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <label className="block text-xs font-bold text-slate-500 uppercase mb-2">
            Select Approved VMD Substance
          </label>
          
          {loading ? (
            <div className="flex items-center justify-center py-10 gap-2 text-slate-400">
              <Loader2 className="animate-spin" size={18} />
              <span className="text-sm italic">Loading authorized list...</span>
            </div>
          ) : error ? (
            <div className="p-4 bg-red-50 text-red-600 rounded-lg text-xs flex items-center gap-2">
              <AlertCircle size={14} /> {error}
            </div>
          ) : authorizedList.length > 0 ? (
            <div className="space-y-2 max-h-64 overflow-y-auto pr-2 custom-scrollbar">
              {authorizedList.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => onConfirm(item)}
                  className="w-full p-3 text-left border border-slate-100 rounded-xl hover:bg-emerald-50 hover:border-emerald-200 transition flex justify-between items-center group"
                >
                  <div>
                    <div className="font-bold text-slate-800 text-sm group-hover:text-emerald-700 transition">
                      {item.substance}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      Permit: {item.permit_number}
                    </div>
                  </div>
                  <div className="h-6 w-6 rounded-full bg-slate-50 flex items-center justify-center group-hover:bg-emerald-100 transition">
                    <Check className="text-emerald-600 opacity-0 group-hover:opacity-100" size={14} />
                  </div>
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <p className="text-sm text-slate-400 italic">No active permits found for {companyName}.</p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t flex justify-end">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-slate-600 transition uppercase"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}