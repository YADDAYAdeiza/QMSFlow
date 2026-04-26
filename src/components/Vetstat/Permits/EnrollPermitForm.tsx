'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
// import { addSubstancesToPermit } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function EnrollmentForm({ permit_id, atcCodes }: { permit_id?: string, atcCodes: any[] }) {
  const router = useRouter();
  const [rows, setRows] = useState([{ id: atcCodes[0]?.id || '', qty: 0 }]);
  const [isPending, setIsPending] = useState(false);

  const handleAction = async (isAmendment: boolean) => {
    setIsPending(true);
    // If it's an amendment, prompt for justification (for now)
    const justification = isAmendment ? prompt("Enter Justification ID:") : null;
    
    if (isAmendment && !justification) {
      alert("Justification is required for amendments.");
      setIsPending(false);
      return;
    }

    // const result = await addSubstancesToPermit(permit_id!, rows, isAmendment, Number(justification));
    
    // if (result.success) {
    //   alert(isAmendment ? 'Amendment saved.' : 'Substances added.');
    //   router.refresh();
    // } else {
    //   alert('Error: ' + result.message);
    // }
    // setIsPending(false);
  };

  return (
    <div className="p-6 border rounded shadow-sm bg-white space-y-4">
      {/* ... row mapping (as before) ... */}
      
      <div className="flex gap-4">
        <button 
          onClick={() => handleAction(false)} 
          disabled={isPending}
          className="flex-1 bg-blue-600 text-white p-3 rounded font-bold"
        >
          Add Additional
        </button>
        <button 
          onClick={() => handleAction(true)} 
          disabled={isPending}
          className="flex-1 bg-amber-600 text-white p-3 rounded font-bold"
        >
          Amend Permit
        </button>
      </div>
    </div>
  );
}