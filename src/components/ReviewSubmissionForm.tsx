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

export default function ReviewSubmissionForm({ appId, division, initialFindings, comments }: Props) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isHistoryExpanded, setIsHistoryExpanded] = useState(false);

  const { register, control, handleSubmit, watch } = useForm({
    defaultValues: {
      capas: initialFindings.capas?.length > 0 
        ? initialFindings.capas 
        : [] as { deficiency: string; classification: "Critical" | "Major" | "Minor"; action: string }[], 
      justification: "" 
    }
  });

  const { fields, append, remove } = useFieldArray({ control, name: "capas" });
  const justification = watch("justification");

  const onFormSubmit = async (data: any) => {
    if (!data.justification.trim()) return alert("QMS Requirement: Please provide a summary.");
    setIsPending(true);
    try {
      const result = await submitToDDD(appId, { observations: [], capas: data.capas }, data.justification);
      if (result.success) {
        router.push(`/dashboard/${division}`);
        router.refresh();
      } else {
        alert("Submission failed: " + result.error);
      }
    } catch (error) {
      alert("System Error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-10">
      {/* SECTION 1: DEFICIENCIES */}
      <div className="space-y-6">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[10px] font-black text-slate-900 uppercase tracking-[0.2em] flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-amber-500" /> Regulatory Deficiency Builder
          </h3>
          <button type="button" onClick={() => append({ deficiency: "", classification: "Minor", action: "" })} className="text-[9px] font-black text-amber-600 bg-amber-50 px-4 py-2 rounded-full hover:bg-amber-100 transition-all">
            + ADD DEFICIENCY
          </button>
        </div>

        {fields.length === 0 && (
          <div className="p-10 border-2 border-dashed border-slate-100 rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300">
            <ListChecks className="w-8 h-8 mb-2 opacity-20" />
            <p className="text-[10px] font-black uppercase tracking-widest">No Deficiencies Added</p>
          </div>
        )}

        {fields.map((field, index) => (
          <div key={field.id} className="p-6 bg-white border border-slate-100 rounded-[2.5rem] shadow-sm relative group animate-in fade-in slide-in-from-bottom-2">
            <button type="button" onClick={() => remove(index)} className="absolute -top-2 -right-2 bg-white shadow-md border border-slate-100 text-slate-300 hover:text-rose-500 p-2 rounded-full z-10">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
            <div className="space-y-6">
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
                <textarea {...register(`capas.${index}.deficiency` as const)} placeholder="Non-compliance description..." className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs outline-none focus:ring-2 focus:ring-amber-100" rows={2} />
                <textarea {...register(`capas.${index}.action` as const)} placeholder="Required CAPA action..." className="w-full bg-slate-50 border-none rounded-2xl p-4 text-xs outline-none text-blue-800 focus:ring-2 focus:ring-blue-100" rows={2} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* SECTION 2: COLLAPSIBLE REWORK HISTORY */}
      <div className="pt-10 border-t border-slate-100">
        <div className="flex items-center justify-between mb-6 px-1">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-slate-900" />
            <h2 className="text-[11px] font-black text-slate-900 uppercase tracking-[0.2em]">Previous Remarks</h2>
          </div>
          {comments.length > 1 && (
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

        {/* Dynamic height container with springy transition */}
        <div 
          className={`relative overflow-hidden transition-all duration-500 ease-[cubic-bezier(0.175,0.885,0.32,1.275)]
            ${isHistoryExpanded ? 'max-h-[1000px]' : 'max-h-[220px]'}
          `}
        >
          <AuditTrail comments={comments} />
          
          {/* Bottom Fade: only shows when collapsed and there is more to see */}
          {!isHistoryExpanded && comments.length > 0 && (
            <div className="absolute bottom-0 left-0 right-0 h-20 bg-gradient-to-t from-white to-transparent pointer-events-none" />
          )}
        </div>
      </div>

      {/* SECTION 3: EXECUTIVE SUMMARY */}
      <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl relative overflow-hidden transition-all duration-300">
        <h3 className="text-xs font-black uppercase tracking-widest mb-6 flex items-center gap-2 text-white">
          <MessageSquare className="w-4 h-4 text-blue-400" /> Executive Summary
        </h3>
        <textarea 
          {...register("justification")} 
          placeholder="Provide a final minute addressing the feedback above..." 
          className="w-full h-32 p-6 bg-slate-800 text-white rounded-[2rem] text-sm border-none italic mb-8 outline-none focus:ring-2 focus:ring-blue-500 transition-all" 
          disabled={isPending} 
        />
        <button 
          type="submit" 
          disabled={isPending || !justification?.trim()} 
          className={`w-full py-6 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all ${
            !justification?.trim() ? 'bg-slate-800 text-slate-600' : 'bg-blue-600 text-white hover:bg-blue-500 shadow-xl'
          }`}
        >
          {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Forward to Divisional Deputy Director <Send className="w-4 h-4" /></>}
        </button>
        <ShieldAlert className="absolute -bottom-10 -right-10 w-48 h-48 text-white opacity-[0.03]" />
      </div>
    </form>
  );
}