'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, AlertCircle, FilePlus2 } from 'lucide-react';
import { enrollPermitHeader } from '@/lib/actions/Vetstat/Permits/permitActions';

export default function EnrollmentModal() {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorFeedback(null);

    const formData = new FormData(e.currentTarget);
    
    // Injecting submission context directly to satisfy QMS process timing parameters
    formData.append('qms_processed_at', new Date().toISOString());

    startTransition(async () => {
      try {
        const result = await enrollPermitHeader(formData);
        
        if (result?.success) {
          router.refresh();
          setIsOpen(false);
        } else {
          setErrorFeedback(result?.message || 'An error occurred during permit authorization.');
        }
      } catch (err: any) {
        console.error("Enrollment Action Drop:", err);
        setErrorFeedback(err?.message || 'Critical pipeline interruption. Please check connections.');
      }
    });
  };

  return (
    <>
      <button 
        type="button"
        onClick={() => {
          setErrorFeedback(null);
          setIsOpen(true);
        }} 
        className="inline-flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-emerald-800 transition shadow-lg shadow-emerald-700/10"
      >
        <Plus size={16} /> Enroll New Permit
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[250] p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 w-full max-w-[420px] overflow-hidden flex flex-col animate-in scale-in-95 duration-150">
            
            {/* Header Area */}
            <div className="p-6 border-b border-slate-100 flex justify-between items-start bg-slate-50">
              <div>
                <h2 className="text-base font-black text-slate-800 flex items-center gap-2">
                  <FilePlus2 className="text-emerald-600" size={18} />
                  Enroll New Permit
                </h2>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                  Initial Header Ledger Authorization
                </p>
              </div>
              <button 
                type="button" 
                disabled={isPending}
                onClick={() => setIsOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:bg-slate-200/60 hover:text-slate-600 transition disabled:opacity-50"
              >
                <X size={16} />
              </button>
            </div>

            {/* Main Interactive Form */}
            <form onSubmit={handleFormSubmit} className="p-6 space-y-4">
              {errorFeedback && (
                <div className="p-3 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl text-xs font-bold flex items-center gap-2 animate-in shake-in duration-150">
                  <AlertCircle size={16} className="shrink-0" />
                  <span>{errorFeedback}</span>
                </div>
              )}

              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Permit Number Reference</label>
                  <input 
                    name="permit_number" 
                    type="text"
                    required 
                    disabled={isPending}
                    placeholder="e.g., VMD/PERMIT/2026/0891" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm disabled:bg-slate-50 disabled:text-slate-400" 
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-black text-slate-400 uppercase tracking-wider">Applicant Corporate Entity</label>
                  <input 
                    name="company_name" 
                    type="text"
                    required 
                    disabled={isPending}
                    placeholder="e.g., Veterinary Importation Ltd" 
                    className="w-full border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white shadow-sm disabled:bg-slate-50 disabled:text-slate-400" 
                  />
                </div>
              </div>

              {/* Action Triggers */}
              <div className="flex gap-3 border-t border-slate-100 pt-4 mt-2">
                <button 
                  type="button" 
                  disabled={isPending}
                  onClick={() => setIsOpen(false)} 
                  className="flex-1 bg-white border border-slate-200 text-slate-700 p-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-slate-100 transition disabled:opacity-50"
                >
                  Cancel
                </button>
                
                <button 
                  type="submit" 
                  disabled={isPending}
                  className="flex-1 bg-emerald-700 hover:bg-emerald-800 text-white p-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition disabled:opacity-50 shadow-lg shadow-emerald-700/10 flex items-center justify-center min-h-[38px]"
                >
                  {isPending ? (
                    <span className="flex items-center gap-2">
                      <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Enrolling...
                    </span>
                  ) : 'Submit Enrollment'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}