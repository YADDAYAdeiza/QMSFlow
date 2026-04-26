'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { enrollPermitHeader } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function EnrollmentModal() {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const router = useRouter();

  const handleAction = async (formData: FormData) => {
    setIsPending(true);
    const result = await enrollPermitHeader(formData);
    
    if (result.success) {
      router.refresh();
      setIsOpen(false);
    } else {
      alert(`Error: ${result.message}`);
    }
    setIsPending(false);
  };

  return (
    <>
      <button onClick={() => setIsOpen(true)} className="bg-green-700 text-white px-6 py-2 rounded font-bold hover:bg-green-800 transition">
        + Enroll New Permit
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <form action={handleAction} className="bg-white p-6 rounded shadow-lg w-[400px]">
            <h2 className="text-xl font-bold mb-4">Enroll New Permit</h2>
            <input name="permit_number" placeholder="Permit Number" className="w-full border p-2 mb-2 rounded" required />
            <input name="company_name" placeholder="Company Name" className="w-full border p-2 mb-4 rounded" required />
            
            <div className="flex gap-2">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 border p-2 rounded">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-green-700 text-white p-2 rounded font-bold">
                {isPending ? 'Enrolling...' : 'Submit Enrollment'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}