'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { savePermitEdits } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function EditPermitModal({ 
  permit, 
  atcCodes, 
  onClose 
}: { 
  permit: any, 
  atcCodes: any[], 
  onClose: () => void 
}) {
  const router = useRouter();
  const [substances, setSubstances] = useState(permit.permit_substances || []);
  const [isPending, setIsPending] = useState(false);

  const addRow = () => {
    setSubstances([...substances, { 
      permit_id: permit.id, 
      substance_id: atcCodes[0]?.id || '', 
      quantity_kg: 0 
    }]);
  };

  const removeRow = (index: number) => {
    const next = [...substances];
    if (next[index].id) {
      next[index] = { ...next[index], _delete: true };
    } else {
      next.splice(index, 1);
    }
    setSubstances(next);
  };

  const updateRow = (index: number, field: string, value: any) => {
    setSubstances(prev => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setIsPending(true);
    try {
      // Logic for Divisional Deputy Director review could be injected here if needed
      await savePermitEdits(permit.id, substances);
      router.refresh();
      onClose();
    } catch (error: any) {
      console.error(error);
      alert(`Failed to save: ${error.message}`);
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[200]">
      <div className="bg-white p-6 rounded-xl shadow-2xl w-[450px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4 text-slate-800 border-b pb-2">Edit Permit Ledger</h2>
        <p className="text-xs text-slate-400 mb-4 font-mono">{permit.permit_number}</p>
        
        <div className="space-y-3 mb-6">
          {substances.filter((s: any) => !s._delete).map((sub: any, i: number) => (
            <div key={i} className="flex gap-2 items-center bg-slate-50 p-2 rounded-lg border border-slate-100">
              <select 
                value={sub.substance_id || ''}
                className="border p-2 flex-grow text-xs rounded bg-white"
                onChange={(e) => updateRow(i, 'substance_id', e.target.value)}
              >
                {atcCodes.map((code) => (
                  <option key={code.id} value={code.id}>{code.substance}</option>
                ))}
              </select>
              
              <div className="flex items-center gap-1">
                <input 
                  type="number" 
                  value={sub.quantity_kg || 0} 
                  className="border p-2 w-16 text-xs rounded bg-white font-bold"
                  onChange={(e) => updateRow(i, 'quantity_kg', Number(e.target.value))}
                />
                <span className="text-[10px] font-bold text-slate-400">KG</span>
              </div>
              
              <button 
                onClick={() => removeRow(i)}
                className="text-rose-500 font-bold px-2 py-1 hover:bg-rose-50 rounded transition"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <button 
          onClick={addRow} 
          className="w-full text-xs text-emerald-600 font-bold border border-dashed border-emerald-200 py-2 rounded-lg hover:bg-emerald-50 mb-6 transition"
        >
          + Add New Substance Entry
        </button>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border p-2 rounded-lg text-sm font-medium hover:bg-gray-50">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isPending}
            className="flex-1 bg-emerald-600 text-white p-2 rounded-lg font-bold text-sm hover:bg-emerald-700 disabled:opacity-50 transition"
          >
            {isPending ? 'Syncing...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}