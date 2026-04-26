'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createAmendment } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function AmendPermitModal({ 
  permit, 
  atcCodes, 
  onClose 
}: { 
  permit: any, 
  atcCodes: any[], 
  onClose: () => void 
}) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  
  // Initialize state with current quantities to show the regulator what exists
  const [substances, setSubstances] = useState(
    permit.permit_substances.map((s: any) => ({
      ...s,
      additional_qty: 0 // New field for the amendment
    }))
  );

  const updateAdditionalQty = (index: number, val: number) => {
    const next = [...substances];
    next[index].additional_qty = val;
    setSubstances(next);
  };

  const handleAmend = async () => {
    setIsPending(true);
    try {
      // Logic: Send the original ID and the new additive quantities
      await createAmendment(permit.id, substances);
      router.refresh();
      onClose();
    } catch (error) {
      console.error(error);
      alert('Failed to process amendment');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded shadow-lg w-[500px]">
        <h2 className="text-xl font-bold mb-1">Amend Permit: {permit.permit_number}</h2>
        <p className="text-sm text-gray-500 mb-6">Type: Amended (Quantity Extension)</p>
        
        <div className="space-y-4 mb-6">
          <div className="grid grid-cols-3 text-xs font-bold uppercase text-gray-500 gap-2">
            <div>Substance</div>
            <div>Current Qty</div>
            <div>Add New Qty</div>
          </div>
          
          {substances.map((sub: any, i: number) => {
            const name = atcCodes.find(a => a.id === sub.substance_id)?.substance || 'Unknown';
            return (
              <div key={i} className="grid grid-cols-3 gap-2 items-center border-b pb-2">
                <span className="text-sm truncate">{name}</span>
                <span className="text-sm font-bold">{sub.quantity_kg} kg</span>
                <input 
                  type="number"
                  className="border p-1 text-sm rounded w-full"
                  placeholder="+ kg"
                  onChange={(e) => updateAdditionalQty(i, Number(e.target.value))}
                />
              </div>
            );
          })}
        </div>

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 border p-2 rounded">Cancel</button>
          <button 
            onClick={handleAmend} 
            disabled={isPending}
            className="flex-1 bg-amber-600 text-white p-2 rounded font-bold hover:bg-amber-700"
          >
            {isPending ? 'Processing...' : 'Apply Amendment'}
          </button>
        </div>
      </div>
    </div>
  );
}