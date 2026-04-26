'use client'

import { useState, useRef, useEffect } from 'react';
import { useActionState } from 'react';
import { submitLedgerEntry } from "@/lib/actions/Vetstat/importAction";

interface LedgerFormProps {
  type: 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION';
  atcCodes: any[];
}

export default function LedgerForm({ type, atcCodes }: LedgerFormProps) {
  const formRef = useRef<HTMLFormElement>(null);
  const [selected, setSelected] = useState<any>(null);
  const [unit, setUnit] = useState('mg');
  const [state, action, isPending] = useActionState(submitLedgerEntry, { success: false, message: '' });

  // Handle successful form submission (clear form and state)
  useEffect(() => {
    if (state.success) {
      formRef.current?.reset();
      setSelected(null);
      setUnit('mg');
    }
  }, [state]);

  const handleSubstanceChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const item = atcCodes.find(c => c.id === e.target.value);
    setSelected(item);
  };

  return (
    <form ref={formRef} action={action} className="space-y-4 max-w-lg p-6 border rounded-lg shadow-sm">
      {state.message && (
        <div className={`p-4 rounded text-sm ${state.success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
          {state.message}
        </div>
      )}

      <input type="hidden" name="entry_type" value={type} />
      
      <div className="flex flex-col">
        <label className="text-sm font-semibold">Substance</label>
        <select name="atc_id" onChange={handleSubstanceChange} className="border p-2 rounded" required>
          <option value="">Select a substance...</option>
          {atcCodes.map((item) => (
            <option key={item.id} value={item.id}>
              {item.substance} ({item.vet_atc || item.human_atc})
            </option>
          ))}
        </select>
      </div>

      {selected && (
        <div className="p-3 bg-blue-50 text-blue-800 rounded text-sm">
          <p><strong>Risk:</strong> {selected.risk_priority} | <strong>DDD:</strong> {selected.ddd_mg} mg</p>
        </div>
      )}

      <div className="flex flex-col">
        <label className="text-sm font-semibold">Select Unit</label>
        <select name="unit" value={unit} onChange={(e) => setUnit(e.target.value)} className="border p-2 rounded">
          <option value="mg">mg</option><option value="g">g</option><option value="kg">kg</option><option value="ml">ml</option>
        </select>
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-semibold">Quantity</label>
        <input name="quantity" type="number" step="any" required className="border p-2 rounded" />
      </div>

      <div className="flex flex-col">
        <label className="text-sm font-semibold">Concentration (mg/{unit})</label>
        <input name="concentration" type="number" step="any" required className="border p-2 rounded" />
      </div>

      {type !== 'DESTRUCTION' && (
        <input name="entity_id" placeholder={type === 'IMPORT' ? "Supplier ID" : "Farm ID"} className="border p-2 rounded w-full" required />
      )}
      
      {unit === 'ml' && <input name="density" placeholder="Density (g/ml)" className="border p-2 rounded w-full" />}

      <button type="submit" disabled={isPending} className="bg-blue-600 text-white p-2 w-full rounded hover:bg-blue-700 disabled:bg-gray-400">
        {isPending ? 'Processing...' : `Log ${type}`}
      </button>
    </form>
  );
}