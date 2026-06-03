'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, Save, X, AlertCircle } from 'lucide-react';
import { savePermitEdits } from '@/lib/actions/Vetstat/Permits/permitActions';

interface SubstanceRow {
  id?: string;         // Present if fetched from DB
  _client_id?: string; // Present if created freshly on client
  permit_id: string;
  substance_id: string;
  quantity_kg: number;
  _delete?: boolean;
}

interface ATCCode {
  id: string;
  substance: string;
}

interface EditPermitModalProps {
  permit: {
    id: string;
    permit_number: string;
    permit_substances: Array<{ id: string; substance_id: string; quantity_kg: number }>;
  };
  atcCodes: ATCCode[];
  onClose: () => void;
}

export default function EditPermitModal({ 
  permit, 
  atcCodes, 
  onClose 
}: EditPermitModalProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Initialize data with stable keys for both tracking types
  const [substances, setSubstances] = useState<SubstanceRow[]>(() =>
    (permit.permit_substances || []).map(s => ({ ...s, permit_id: permit.id }))
  );

  const addRow = () => {
    setSubstances(prev => [
      ...prev, 
      { 
        _client_id: `temp_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        permit_id: permit.id, 
        substance_id: atcCodes[0]?.id || '', 
        quantity_kg: 0 
      }
    ]);
  };

  const removeRow = (target: SubstanceRow) => {
    setSubstances(prev => 
      prev.map(row => {
        // Match existing DB rows by standard ID
        if (target.id && row.id === target.id) {
          return { ...row, _delete: true };
        }
        // Match un-saved client rows by temp client ID
        if (target._client_id && row._client_id === target._client_id) {
          return { ...row, _delete: true };
        }
        return row;
      })
    );
  };

  const updateRow = (target: SubstanceRow, field: keyof SubstanceRow, value: any) => {
    setSubstances(prev =>
      prev.map(row => {
        const isMatch = target.id 
          ? row.id === target.id 
          : row._client_id === target._client_id;
          
        if (isMatch) {
          if (field === 'quantity_kg') {
            const val = value === '' ? 0 : parseFloat(value);
            return { ...row, [field]: isNaN(val) || val < 0 ? 0 : val };
          }
          return { ...row, [field]: value };
        }
        return row;
      })
    );
  };

  const handleSave = () => {
    setErrorMsg(null);
    
    // Check if there's at least one active row left before submission
    const activeRows = substances.filter(s => !s._delete);
    if (activeRows.length === 0) {
      setErrorMsg("A permit ledger must contain at least one valid substance entry.");
      return;
    }

    startTransition(async () => {
      try {
        await savePermitEdits(permit.id, substances);
        router.refresh();
        onClose();
      } catch (error: any) {
        console.error("Save Error:", error);
        setErrorMsg(error.message || 'Failed to sync modifications with the regulatory ledger.');
      }
    });
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[200] animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[500px] max-h-[85vh] flex flex-col overflow-hidden">
        
        {/* Header Block */}
        <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50 shrink-0">
          <div>
            <h2 className="text-lg font-black text-slate-800 tracking-tight">Edit Permit Ledger</h2>
            <p className="text-[11px] text-slate-400 font-mono mt-1 uppercase tracking-wider">
              REF: {permit.permit_number}
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

        {/* Scrollable Rows Form */}
        <div className="p-6 overflow-y-auto grow space-y-4">
          {errorMsg && (
            <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-in shake-in duration-150">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          <div className="space-y-2">
            {substances.map((sub) => {
              // Skip rendering soft-deleted entries, but keep them in array state
              if (sub._delete) return null;
              
              // Key assignment is stable using structural identity variants
              const stableKey = sub.id || sub._client_id;

              return (
                <div 
                  key={stableKey} 
                  className="flex gap-2 items-center bg-slate-50/60 p-2.5 rounded-xl border border-slate-100 animate-in slide-in-from-bottom-2 duration-200"
                >
                  <select 
                    disabled={isPending}
                    value={sub.substance_id || ''}
                    className="border border-slate-200 p-2 flex-grow text-xs font-bold rounded-lg bg-white shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none text-slate-700"
                    onChange={(e) => updateRow(sub, 'substance_id', e.target.value)}
                  >
                    {atcCodes.map((code) => (
                      <option key={code.id} value={code.id}>{code.substance}</option>
                    ))}
                  </select>
                  
                  <div className="flex items-center gap-1.5 shrink-0">
                    <input 
                      type="number" 
                      min="0"
                      step="any"
                      disabled={isPending}
                      value={sub.quantity_kg === 0 ? '' : sub.quantity_kg} 
                      placeholder="0.00"
                      className="border border-slate-200 p-2 w-20 text-xs rounded-lg bg-white font-black text-right text-slate-700 shadow-sm focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 outline-none"
                      onChange={(e) => updateRow(sub, 'quantity_kg', e.target.value)}
                    />
                    <span className="text-[10px] font-black text-slate-400 w-4">KG</span>
                  </div>
                  
                  <button 
                    type="button"
                    disabled={isPending}
                    onClick={() => removeRow(sub)}
                    className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition shrink-0"
                    title="Remove row entry"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })}
          </div>

          <button 
            type="button"
            disabled={isPending}
            onClick={addRow} 
            className="w-full text-xs text-emerald-600 font-black border-2 border-dashed border-slate-200 py-3 rounded-xl hover:border-emerald-500/40 hover:bg-emerald-50/40 transition flex items-center justify-center gap-1.5"
          >
            <Plus size={14} /> Add New Substance Entry
          </button>
        </div>

        {/* Modal Action Footer */}
        <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
          <button 
            type="button"
            disabled={isPending}
            onClick={onClose} 
            className="flex-1 bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition disabled:opacity-50"
          >
            Cancel
          </button>
          
          <button 
            type="button"
            disabled={isPending}
            onClick={handleSave} 
            className="flex-1 bg-emerald-600 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-700 disabled:opacity-50 transition shadow-lg shadow-emerald-600/10 flex items-center justify-center gap-1.5 min-h-[38px]"
          >
            {isPending ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Save size={14} /> Save Changes
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}