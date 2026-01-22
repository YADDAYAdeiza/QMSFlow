"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitToDDD } from '@/lib/actions/staff'; // Renamed as per our previous step
import { Loader2, CheckCircle2 } from 'lucide-react';

export default function StaffReviewForm({ 
  appId, 
  division, 
  staffId, 
  initialObservations 
}: { 
  appId: number; 
  division: string; 
  staffId: string;
  initialObservations: any[]; // The array of findings from the previous round
}) {
  const [isPending, startTransition] = useTransition();
  // We now manage a list (array) instead of a single string
  const [observations, setObservations] = useState<any[]>(initialObservations || []);
  const router = useRouter();

  const handleComplete = () => {
    // QMS Guard
    if (observations.length === 0) {
      const confirmEmpty = confirm("No deficiencies recorded. Submit as 'Compliant'?");
      if (!confirmEmpty) return;
    }

    startTransition(async () => {
      // ✅ Now correctly passing 4 arguments: appId, division, observations (array), and staffId
      const result = await submitToDDD(appId, division, observations, staffId);
      
      if (result.success) {
        alert("Review Submitted. Clock Stopped.");
        router.push(`/dashboard/staff`); // Redirecting to the staff overview
        router.refresh();
      } else {
        alert("Submission failed: " + result.error);
      }
    });
  };

  return (
    <div className="mt-6 p-8 border-2 border-blue-100 rounded-[2rem] bg-white shadow-xl">
      <div className="flex items-center justify-between mb-6">
        <h2 className="font-black text-slate-800 uppercase tracking-tighter text-xl italic">Technical Findings</h2>
        <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-[10px] font-black uppercase">
          {observations.length} Issues Flagged
        </span>
      </div>

      {/* Structured Observations List */}
      <div className="space-y-3 mb-6">
        {observations.map((obs, idx) => (
          <div key={idx} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 flex justify-between items-center group">
            <div>
              <span className="text-[9px] font-black text-blue-500 uppercase tracking-widest">{obs.system}</span>
              <p className="text-sm text-slate-600 italic">"{obs.finding}"</p>
            </div>
            <button 
              onClick={() => setObservations(observations.filter((_, i) => i !== idx))}
              className="text-slate-300 hover:text-rose-600 transition-colors p-2"
              title="Remove this finding"
            >
              ×
            </button>
          </div>
        ))}

        {observations.length === 0 && (
          <div className="py-10 text-center border-2 border-dashed border-slate-100 rounded-2xl">
             <CheckCircle2 className="w-8 h-8 text-emerald-200 mx-auto mb-2" />
             <p className="text-[10px] font-bold text-slate-400 uppercase">No deficiencies added</p>
          </div>
        )}
      </div>

      {/* Quick Add (Simpler version of my previous complex refactor) */}
      <div className="bg-blue-50/50 p-4 rounded-2xl mb-6">
        <textarea
          id="quick-add"
          className="w-full h-24 p-4 border-none rounded-xl shadow-inner text-sm outline-none focus:ring-2 focus:ring-blue-500 italic"
          placeholder="Type a new deficiency found in the dossier..."
        />
        <button
          type="button"
          onClick={() => {
            const el = document.getElementById('quick-add') as HTMLTextAreaElement;
            if (el.value.trim()) {
              setObservations([...observations, { system: "General", finding: el.value, severity: "Major" }]);
              el.value = "";
            }
          }}
          className="mt-2 text-[10px] font-black text-blue-600 uppercase hover:underline"
        >
          + Add to Official List
        </button>
      </div>

      <button
        onClick={handleComplete}
        disabled={isPending}
        className="w-full bg-slate-900 text-white font-black py-4 rounded-2xl hover:bg-blue-600 disabled:bg-slate-300 transition-all uppercase tracking-[0.2em] text-[11px] flex items-center justify-center gap-2"
      >
        {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit to Divisional Deputy Director"}
      </button>
    </div>
  );
}