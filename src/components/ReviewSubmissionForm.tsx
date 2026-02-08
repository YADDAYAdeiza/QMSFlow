"use client"

import React, { useState } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { 
  Send, Loader2, MessageSquare, Trash2, 
  AlertTriangle, ShieldAlert, ListChecks, History,
  ChevronDown, ChevronUp
} from 'lucide-react';
import { submitToDDD } from '@/lib/actions/staff'; 
import AuditTrail from '@/components/AuditTrail';

interface Props {
  appId: number;
  division: string;
  staffId: string;
  initialFindings: { capas: any[] };
  comments: any[];
}

export default function ReviewSubmissionForm({ appId, division, staffId, initialFindings, comments }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      capas: initialFindings.capas?.length > 0 ? initialFindings.capas : [], 
      justification: "" 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "capas" });
  const justification = watch("justification");

  const onFormSubmit = async (data: any) => {
    if (!data.justification.trim()) return alert("QMS Requirement: Please provide a summary.");
    
    setIsPending(true);
    try {
      // ✅ QMS: Submitting results to the Divisional Deputy Director
      const result = await submitToDDD(
        appId, 
        data.capas, 
        data.justification, 
        staffId 
      );

      if (result.success) {
        // ✅ REDIRECT: Push back to the general staff dashboard for their division
        // This clears the staff member's active desk and lets them pick a new task.
        router.push(`/dashboard/staff?division=${division.toLowerCase()}`);
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
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-10">
      {/* SECTION 1: REGULATORY DEFICIENCIES */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Regulatory Deficiency Builder
          </h3>
          <button 
            type="button" 
            onClick={() => append({ deficiency: "", classification: "Minor", action: "" })} 
            className="text-[9px] font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-full hover:bg-amber-100 transition-all active:scale-95"
          >
            + ADD DEFICIENCY
          </button>
        </div>

        {fields.length === 0 && (
          <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
            <ListChecks className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">No Deficiencies Identified</p>
          </div>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative animate-in fade-in slide-in-from-bottom-2">
            <button 
              type="button" 
              onClick={() => remove(index)} 
              className="absolute -top-2 -right-2 bg-white shadow-md border border-slate-100 text-slate-300 hover:text-rose-500 p-2 rounded-full z-10 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            
            <div className="space-y-6">
              {/* Classification Selector */}
              <div className="flex items-center gap-3">
                {["Critical", "Major", "Minor"].map((lvl) => (
                  <label key={lvl} className="cursor-pointer">
                    <input type="radio" {...register(`capas.${index}.classification` as const)} value={lvl} className="hidden peer" />
                    <div className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase border transition-all peer-checked:text-white 
                      ${lvl === 'Critical' ? 'peer-checked:bg-rose-600 border-rose-100 text-rose-600' : 
                        lvl === 'Major' ? 'peer-checked:bg-amber-500 border-amber-100 text-amber-600' : 
                        'peer-checked:bg-slate-800 border-slate-100 text-slate-500'}`}>
                      {lvl}
                    </div>
                  </label>
                ))}
              </div>

              <div className="grid gap-4">
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase px-1">Observation / Non-Compliance</span>
                  <textarea 
                    {...register(`capas.${index}.deficiency` as const)} 
                    placeholder="Describe the specific regulatory gap..." 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs outline-none focus:ring-2 focus:ring-amber-100 resize-none" 
                    rows={2} 
                  />
                </div>
                <div className="space-y-1">
                  <span className="text-[8px] font-black text-slate-400 uppercase px-1">Corrective Action Required</span>
                  <textarea 
                    {...register(`capas.${index}.action` as const)} 
                    placeholder="What must the applicant do to resolve this?" 
                    className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs outline-none text-blue-800 focus:ring-2 focus:ring-blue-100 resize-none" 
                    rows={2} 
                  />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: COLLAPSIBLE REWORK HISTORY (QMS Requirement) */}
      <div className="pt-10 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-900" />
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Review & Rework Trail</h2>
          </div>
          {comments.length > 0 && (
            <button 
              type="button" 
              onClick={() => setIsHistoryExpanded(!isHistoryExpanded)} 
              className="text-[9px] font-black text-blue-600 flex items-center gap-1 hover:underline"
            >
              {isHistoryExpanded ? (
                <>HIDE FULL HISTORY <ChevronUp className="w-3 h-3" /></>
              ) : (
                <>SHOW ALL {comments.length} ENTRIES <ChevronDown className="w-3 h-3" /></>
              )}
            </button>
          )}
        </div>

        <div className={`relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)] ${isHistoryExpanded ? 'max-h-[1000px]' : 'max-h-[220px]'}`}>
          <AuditTrail comments={comments} />
          {!isHistoryExpanded && comments.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {/* SECTION 3: EXECUTIVE SUMMARY & SUBMISSION */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden">
        <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-white">
          <MessageSquare className="w-4 h-4 text-blue-400" /> Internal Minute to Divisional Deputy Director
        </h3>
        
        <textarea 
          {...register("justification")} 
          placeholder="Summarize your findings for the Divisional Deputy Director's sign-off..." 
          className="w-full h-32 p-6 bg-slate-800 text-white rounded-[2rem] text-sm border-none italic mb-8 outline-none focus:ring-2 focus:ring-blue-500 transition-all resize-none" 
          disabled={isPending} 
        />

        <button 
          type="submit" 
          disabled={isPending || !justification?.trim()} 
          className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-[0.98] ${
            !justification?.trim() 
              ? 'bg-slate-800 text-slate-600 cursor-not-allowed' 
              : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl shadow-blue-900/20'
          }`}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <>Complete Technical Review <Send className="w-4 h-4" /></>
          )}
        </button>

        {/* Decorative background icon */}
        <ShieldAlert className="absolute -bottom-10 -right-10 w-48 h-48 text-white opacity-[0.03] pointer-events-none" />
      </div>
    </form>
  );
}