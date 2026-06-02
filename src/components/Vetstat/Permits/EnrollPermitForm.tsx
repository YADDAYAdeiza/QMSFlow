'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, Trash2, ShieldAlert, FileText, CheckCircle2 } from 'lucide-react';
// import { addSubstancesToPermit } from '@/lib/actions/Vetstat/Permits/permitActions';

interface ATCCode {
  id: string;
  substance: string;
}

interface FormRow {
  _client_id: string;
  substance_id: string;
  quantity_kg: number;
}

interface EnrollmentFormProps {
  permit_id?: string;
  atcCodes: ATCCode[];
}

export default function EnrollmentForm({ permit_id, atcCodes }: EnrollmentFormProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  
  // Form lines management
  const [rows, setRows] = useState<FormRow[]>(() => [
    { 
      _client_id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`, 
      substance_id: atcCodes[0]?.id || '', 
      quantity_kg: 0 
    }
  ]);

  // Internal state tracking for inline justification prompt
  const [showJustificationModal, setShowJustificationModal] = useState(false);
  const [justificationId, setJustificationId] = useState('');
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const addRow = () => {
    setRows(prev => [
      ...prev,
      {
        _client_id: `row_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        substance_id: atcCodes[0]?.id || '',
        quantity_kg: 0
      }
    ]);
  };

  const removeRow = (clientId: string) => {
    if (rows.length === 1) return; // Retain at least one row line
    setRows(prev => prev.filter(r => r._client_id !== clientId));
  };

  const updateRow = (clientId: string, field: 'substance_id' | 'quantity_kg', value: string) => {
    setRows(prev => prev.map(row => {
      if (row._client_id === clientId) {
        if (field === 'quantity_kg') {
          const parsed = parseFloat(value);
          return { ...row, quantity_kg: isNaN(parsed) || parsed < 0 ? 0 : parsed };
        }
        return { ...row, [field]: value };
      }
      return row;
    }));
  };

  const handleActionClick = (isAmendment: boolean) => {
    setErrorFeedback(null);
    
    // Check validation ceilings before prompting details
    const invalidRows = rows.some(r => r.quantity_kg <= 0 || !r.substance_id);
    if (invalidRows) {
      setErrorFeedback("All entries must map a valid substance substance reference and a quantity greater than 0.");
      return;
    }

    if (isAmendment) {
      setShowJustificationModal(true);
    } else {
      executeSubmission(null);
    }
  };

  const handleJustificationSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!justificationId.trim()) {
      setErrorFeedback("A valid regulatory Justification ID is strictly mandatory for extensions.");
      return;
    }
    
    setShowJustificationModal(false);
    executeSubmission(justificationId);
  };

  const executeSubmission = (justificationRef: string | null) => {
    startTransition(async () => {
      try {
        console.log("Submitting payload pipeline:", {
          permit_id,
          payload: rows.map(({ substance_id, quantity_kg }) => ({ substance_id, quantity_kg })),
          justification: justificationRef
        });

        // Example execution point:
        // await addSubstancesToPermit(permit_id, rows, justificationRef);
        
        router.refresh();
        // Reset state after clean resolution if required
      } catch (err) {
        console.error(err);
        setErrorFeedback("Failed to update database tracking systems.");
      }
    });
  };

  return (
    <div className="p-6 border border-slate-200 rounded-2xl shadow-sm bg-white space-y-6 relative">
      <div>
        <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">Substance Allotment Manifest</h3>
        <p className="text-[11px] text-slate-400 mt-0.5">Specify mass tracking values to deploy onto current active permits.</p>
      </div>

      {errorFeedback && (
        <div className="p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2">
          <ShieldAlert size={16} className="shrink-0" />
          <span>{errorFeedback}</span>
        </div>
      )}

      {/* Rows Generation Interface */}
      <div className="space-y-2">
        {rows.map((row) => (
          <div key={row._client_id} className="flex gap-2 items-center bg-slate-50/60 p-2.5 rounded-xl border border-slate-100">
            <select
              disabled={isPending}
              value={row.substance_id}
              onChange={(e) => updateRow(row._client_id, 'substance_id', e.target.value)}
              className="border border-slate-200 p-2 flex-grow text-xs font-bold rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20"
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
                value={row.quantity_kg === 0 ? '' : row.quantity_kg}
                placeholder="0.00"
                onChange={(e) => updateRow(row._client_id, 'quantity_kg', e.target.value)}
                className="border border-slate-200 p-2 w-24 text-xs font-black text-right rounded-lg bg-white outline-none focus:ring-2 focus:ring-blue-500/20 text-slate-700"
              />
              <span className="text-[10px] font-black text-slate-400 w-4">KG</span>
            </div>

            <button
              type="button"
              disabled={isPending || rows.length === 1}
              onClick={() => removeRow(row._client_id)}
              className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-50 rounded-lg transition disabled:opacity-30"
            >
              <Trash2 size={14} />
            </button>
          </div>
        ))}
      </div>

      <button
        type="button"
        disabled={isPending}
        onClick={addRow}
        className="w-full text-xs text-blue-600 font-black border-2 border-dashed border-slate-200 py-3 rounded-xl hover:border-blue-500/40 hover:bg-blue-50/40 transition flex items-center justify-center gap-1.5"
      >
        <Plus size={14} /> Append Row Configuration
      </button>

      {/* Dual Submission Actions */}
      <div className="flex gap-3 border-t border-slate-100 pt-4">
        <button 
          type="button" 
          disabled={isPending}
          onClick={() => handleActionClick(false)} 
          className="flex-1 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 p-3 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50"
        >
          {isPending ? 'Syncing...' : 'Add Additional'}
        </button>
        
        <button 
          type="button" 
          disabled={isPending}
          onClick={() => handleActionClick(true)} 
          className="flex-1 bg-amber-600 hover:bg-amber-700 text-white p-3 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50 shadow-lg shadow-amber-600/10"
        >
          Amend Permit
        </button>
      </div>

      {/* Custom Inline Justification Prompt Modal */}
      {showJustificationModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] animate-in fade-in duration-150">
          <form 
            onSubmit={handleJustificationSubmit}
            className="bg-white p-6 rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[400px] space-y-4"
          >
            <div className="flex items-start gap-3">
              <div className="p-2 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                <FileText size={20} />
              </div>
              <div>
                <h4 className="text-base font-black text-slate-800">Amendment Justification</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Modifying base quantities requires an authorized justification audit trace reference ID string.
                </p>
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Justification Audit ID</label>
              <input 
                type="text"
                autoFocus
                required
                value={justificationId}
                onChange={(e) => setJustificationId(e.target.value)}
                placeholder="e.g., NAFDAC/VMD/AUTH-2026-X"
                className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 bg-white shadow-sm"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowJustificationModal(false);
                  setJustificationId('');
                }}
                className="flex-1 bg-white border border-slate-200 p-2 rounded-xl text-xs font-black uppercase tracking-wider text-slate-500 hover:bg-slate-100 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex-1 bg-amber-600 hover:bg-amber-700 text-white p-2 rounded-xl text-xs font-black uppercase tracking-wider shadow-md transition flex items-center justify-center gap-1"
              >
                <CheckCircle2 size={14} /> Validate
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}