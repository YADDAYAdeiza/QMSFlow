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
    // If it has an ID, mark it for deletion in the DB; otherwise, just remove from UI
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
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[450px] max-h-[90vh] overflow-y-auto">
        <h2 className="text-xl font-bold mb-4">Edit Permit: {permit.permit_number}</h2>
        
        <div className="space-y-3 mb-6">
          {substances.filter(s => !s._delete).map((sub: any, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <select 
                value={sub.substance_id || ''}
                className="border p-2 flex-grow text-sm rounded"
                onChange={(e) => updateRow(i, 'substance_id', e.target.value)}
              >
                {atcCodes.map((code) => (
                  <option key={code.id} value={code.id}>{code.substance}</option>
                ))}
              </select>
              
              <input 
                type="number" 
                value={sub.quantity_kg || 0} 
                className="border p-2 w-20 text-sm rounded"
                onChange={(e) => updateRow(i, 'quantity_kg', Number(e.target.value))}
              />
              
              <button 
                onClick={() => removeRow(i)}
                className="text-red-500 font-bold px-2 py-1 hover:bg-red-50 rounded"
              >
                ×
              </button>
            </div>
          ))}
        </div>
        
        <button 
          onClick={addRow} 
          className="w-full text-sm text-blue-600 underline mb-6"
        >
          + Add New Substance
        </button>
        
        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border p-2 rounded hover:bg-gray-100">Cancel</button>
          <button 
            onClick={handleSave} 
            disabled={isPending}
            className="flex-1 bg-green-600 text-white p-2 rounded font-bold hover:bg-green-700"
          >
            {isPending ? 'Saving...' : 'Save Progress'}
          </button>
        </div>
      </div>
    </div>
  );
}