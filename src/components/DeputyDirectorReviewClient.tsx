"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, 
  Send, 
  FileSearch, 
  AlertCircle, 
  ArrowRight, 
  RotateCcw,
  ShieldCheck,
  ExternalLink,
  Loader2,
  MessageSquare,
  History,
  Tag
} from 'lucide-react';

import { approveToDirector } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

interface DDDReviewProps {
  app: any; 
  timeline: any[];
  staffList: any[];
  pdfUrl: string;
}

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl }: DDDReviewProps) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const router = useRouter();

  const appDetails = app.details || {};
  const observations = app.latestObservations || []; 
  const hasDeficiencies = observations.length > 0;
  const currentStaffId = appDetails.staff_reviewer_id || "";

  // 1. Get Narrative and REVERSE it so newest is on top
  const narrative = [...(app.narrativeHistory || [])].reverse();

  const handleEndorse = async () => {
    if (!remarks.trim()) {
      return alert("QMS Requirement: Please provide a concurrence note for the Director's record.");
    }

    startTransition(async () => {
      const result = await approveToDirector(app.id, remarks);
      if (result.success) {
        router.push('/dashboard/ddd');
        router.refresh();
      } else {
        alert("Action failed. Please check connection.");
      }
    });
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-slate-50 min-h-screen">
      
      {/* LEFT SIDE: DOSSIER PREVIEW */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-black uppercase tracking-tighter text-slate-700">
              Technical Dossier Verification
            </h2>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> Open Full Screen
            </a>
          )}
        </div>

        <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-200 h-[82vh] relative overflow-hidden">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full rounded-[1.8rem] border-none shadow-inner" title="Dossier Preview" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[1.8rem] border-2 border-dashed border-slate-200">
              <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Primary Document Found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT SIDE: DDD VERIFICATION & ACTIONS */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar">
        
        {/* 1. NARRATIVE HISTORY (Complete Trail - Newest First) */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Complete Review Narrative</h3>
          </div>
          
          <div className="space-y-4">
            {narrative.map((note: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-2xl text-xs border transition-all ${
                note.action === "SUBMITTED_TO_DDD" 
                ? "bg-blue-50 border-blue-200 ml-4 shadow-sm" 
                : "bg-slate-50 border-slate-100 mr-4"
              }`}>
                <div className="flex justify-between mb-2 items-center">
                  <div className="flex items-center gap-2">
                    <span className="font-black uppercase text-[8px] text-slate-500">{note.from}</span>
                    <span className="px-1.5 py-0.5 rounded bg-slate-200 text-[7px] font-black text-slate-500 uppercase tracking-tighter">
                      {note.action?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  <span className="text-[8px] text-slate-400">{new Date(note.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="italic text-slate-600 leading-relaxed">"{note.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* 2. REVIEWER FINDINGS SUMMARY */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700">Pruned Findings</h3>
            </div>
            <span className={`px-2 py-1 rounded-full text-[9px] font-black uppercase ${hasDeficiencies ? 'bg-rose-100 text-rose-600' : 'bg-emerald-100 text-emerald-600'}`}>
              {observations.length} Issues
            </span>
          </div>

          <div className="space-y-3">
            {hasDeficiencies ? (
              observations.map((obs: any, i: number) => (
                <div key={i} className="p-4 bg-slate-50 rounded-2xl border-l-4 border-rose-500">
                  <div className="flex justify-between items-start mb-1">
                    <span className="text-[9px] font-black text-rose-600 uppercase">{obs.severity}</span>
                    <span className="text-[8px] font-bold text-slate-400 uppercase">{obs.system}</span>
                  </div>
                  <p className="text-[11px] text-slate-600 italic">"{obs.finding}"</p>
                </div>
              ))
            ) : (
              <div className="text-center py-6">
                <p className="text-[10px] text-slate-400 font-bold uppercase italic tracking-widest">Dossier Compliant</p>
              </div>
            )}
          </div>
        </div>

        {/* 3. DDD DECISION CONTROL */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
          <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" /> Final Concurrence
          </h3>
          
          <textarea 
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isPending}
            className="w-full h-32 bg-slate-800 border-none rounded-3xl p-5 text-sm text-slate-200 placeholder:text-slate-600 focus:ring-2 focus:ring-blue-500 transition-all mb-6 outline-none italic resize-none"
            placeholder="Technical recommendation for the Director..."
          />

          <div className="space-y-3">
            <button 
              onClick={handleEndorse}
              disabled={isPending}
              className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-[0.2em] flex items-center justify-center gap-3 transition-all active:scale-95 shadow-lg ${
                hasDeficiencies ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'
              }`}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                <>{hasDeficiencies ? "Endorse Rejection" : "Endorse Approval"} <ArrowRight className="w-4 h-4" /></>
              )}
            </button>

            <button type="button" onClick={() => setIsReworkModalOpen(true)} disabled={isPending} className="w-full py-4 rounded-[2rem] font-black uppercase text-[10px] tracking-widest border-2 border-slate-700 text-slate-400 hover:bg-slate-800 hover:text-white transition-all flex items-center justify-center gap-2">
              <RotateCcw className="w-3 h-3" /> Return for Rework
            </button>
          </div>
          
          <p className="text-[9px] text-slate-600 font-bold text-center mt-6 uppercase tracking-widest">
            Authorization: Divisional Deputy Director
          </p>
        </div>
      </div>

      <RejectionModal 
        isOpen={isReworkModalOpen}
        onClose={() => setIsReworkModalOpen(false)}
        appId={app.id}
        currentStaffId={currentStaffId}
        staffList={staffList}
        onSuccess={() => {
          setIsReworkModalOpen(false);
          router.push('/dashboard/ddd');
          router.refresh();
        }}
      />
    </div>
  );
}