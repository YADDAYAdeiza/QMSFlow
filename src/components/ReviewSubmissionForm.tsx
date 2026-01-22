"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, AlertCircle, Loader2, MessageSquare } from 'lucide-react';
import { submitToDDD } from '@/lib/actions/staff'; // Adjust path to your server action

interface Props {
  appId: number;
  division: string;
  staffId: string;
  initialObservations: any[];
}

export default function ReviewSubmissionForm({ appId, division, staffId, initialObservations }: Props) {
  const [isPending, setIsPending] = useState(false);
  const [justification, setJustification] = useState("");
  const router = useRouter();

  const handleSubmit = async () => {
    if (!justification.trim()) {
      return alert("QMS Requirement: Please provide a summary of your changes/findings for the Divisional Deputy Director.");
    }

    setIsPending(true);
    try {
      // We pass the justification as the 'comment'
      const result = await submitToDDD(appId, initialObservations, justification);
      if (result.success) {
        router.push(`/dashboard/${division}`);
        router.refresh();
      } else {
        alert("Submission failed: " + result.error);
      }
    } catch (error) {
      alert("System Error occurred during submission.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-200">
      <div className="flex items-center gap-2 mb-6 text-slate-900">
        <MessageSquare className="w-5 h-5" />
        <h3 className="text-xs font-black uppercase tracking-widest">Submission Justification</h3>
      </div>

      <textarea
        value={justification}
        onChange={(e) => setJustification(e.target.value)}
        placeholder="Explain your changes or findings (e.g., 'Pruned 2 CAPAs after verifying Section 4.2...')"
        className="w-full h-32 p-5 bg-slate-50 rounded-3xl text-sm border-none focus:ring-2 focus:ring-blue-500 mb-6 italic"
        disabled={isPending}
      />

      <button
        onClick={handleSubmit}
        disabled={isPending || !justification.trim()}
        className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
          !justification.trim() 
          ? 'bg-slate-100 text-slate-400 cursor-not-allowed' 
          : 'bg-blue-600 text-white hover:bg-blue-500 shadow-lg shadow-blue-900/20 active:scale-95'
        }`}
      >
        {isPending ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            Submit to Divisional Deputy Director
            <Send className="w-4 h-4" />
          </>
        )}
      </button>
      
      <p className="mt-4 text-[9px] text-center text-slate-400 font-bold uppercase tracking-widest leading-relaxed">
        Note: This justification will be visible to the <br/> Divisional Deputy Director and the Director.
      </p>
    </div>
  );
}