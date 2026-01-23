"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, Send, FileSearch, AlertCircle, 
  ArrowRight, RotateCcw, ShieldCheck, ExternalLink, 
  Loader2, MessageSquare, History, AlertTriangle, Activity 
} from 'lucide-react';

import { approveToDirector } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal'; // Updated path if needed

interface DDDReviewProps {
  app: any; 
  staffList: any[];
  pdfUrl: string;
}

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl }: DDDReviewProps) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const router = useRouter();

  // Strictly CAPA logic, removed observations
  const capas = Array.isArray(app.latestCapas) ? app.latestCapas : [];
  
  const hasFindings = capas.length > 0;
  const currentStaffId = app.details?.staff_reviewer_id || "";
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
      
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center justify-between px-4">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-blue-600" />
            <h2 className="text-sm font-black uppercase tracking-tighter text-slate-700">Technical Dossier Verification</h2>
          </div>
          {pdfUrl && (
            <a href={pdfUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-[10px] font-bold text-blue-600 hover:underline">
              <ExternalLink className="w-3 h-3" /> Open Full Screen
            </a>
          )}
        </div>
        <div className="bg-white p-3 rounded-[2.5rem] shadow-2xl border border-slate-200 h-[82vh] relative overflow-hidden">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full rounded-[1.8rem] border-none" title="Dossier" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[1.8rem] border-2 border-dashed border-slate-200">
              <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No Document Found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: DDD PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar">
        
        {/* NARRATIVE TRAIL */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-slate-100">
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400">Review Narrative</h3>
          </div>
          <div className="space-y-4 max-h-40 overflow-y-auto pr-2">
            {narrative.length > 0 ? narrative.map((note: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-2xl text-xs border ${note.action === "SUBMITTED_TO_DDD" ? "bg-blue-50 border-blue-200 ml-4 shadow-sm" : "bg-slate-50 border-slate-100 mr-4"}`}>
                <div className="flex justify-between mb-1 items-center">
                  <span className="font-black uppercase text-[8px] text-slate-500">{note.from}</span>
                  <span className="text-[8px] text-slate-400">{note.timestamp && new Date(note.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="italic text-slate-600 leading-relaxed">"{note.text}"</p>
              </div>
            )) : (
                <p className="text-center py-2 text-[9px] text-slate-400 italic">No narrative history.</p>
            )}
          </div>
        </div>

        {/* TECHNICAL DEFICIENCIES SECTION */}
        <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-100 space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-700 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-blue-600" /> Staff Technical Deficiencies
            </h3>
            <div className="flex gap-1">
               {capas.length > 0 && <span className="px-2 py-1 rounded-full text-[8px] font-black bg-rose-600 text-white uppercase">{capas.length} CAPAs</span>}
            </div>
          </div>

          {/* FDA STYLE CAPAs */}
          {capas.map((capa: any, i: number) => (
            <div key={i} className="p-4 bg-white rounded-2xl border border-slate-100 shadow-sm relative overflow-hidden">
              <div className={`absolute top-0 left-0 bottom-0 w-1 ${capa.classification === 'Critical' ? 'bg-rose-600' : 'bg-amber-500'}`} />
              <span className={`text-[8px] font-black uppercase px-2 py-0.5 rounded mb-2 inline-block ${capa.classification === 'Critical' ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                {capa.classification}
              </span>
              <p className="text-[11px] font-bold text-slate-800 leading-tight mb-2">{capa.deficiency}</p>
              <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                <p className="text-[8px] font-black text-slate-400 uppercase mb-1 italic">Action Plan</p>
                <p className="text-[10px] text-slate-600 italic leading-snug">{capa.action}</p>
              </div>
            </div>
          ))}

          {!hasFindings && <p className="text-center py-4 text-[10px] font-black text-slate-300 uppercase italic tracking-widest">No deficiencies reported</p>}
        </div>

        {/* DDD DECISION CONTROL */}
        <div className="bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl">
          <textarea 
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            className="w-full h-32 bg-slate-800 border-none rounded-3xl p-5 text-sm mb-6 italic outline-none focus:ring-2 focus:ring-blue-500 transition-all"
            placeholder="Technical recommendation for the Director..."
          />
          <div className="space-y-3">
            <button 
              onClick={handleEndorse}
              disabled={isPending}
              className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all ${capas.length > 0 ? 'bg-rose-600 hover:bg-rose-500 shadow-rose-900/20' : 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20'}`}
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{capas.length > 0 ? "Endorse Rejection" : "Endorse Approval"} <ArrowRight className="w-4 h-4" /></>}
            </button>
            <button type="button" onClick={() => setIsReworkModalOpen(true)} className="w-full py-4 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-700 text-slate-400 hover:text-white flex items-center justify-center gap-2 transition-all">
              <RotateCcw className="w-3 h-3" /> Return for Rework
            </button>
          </div>
        </div>
      </div>

      <RejectionModal 
        isOpen={isReworkModalOpen} 
        onClose={() => setIsReworkModalOpen(false)} 
        appId={app.id} 
        currentStaffId={currentStaffId} 
        staffList={staffList} 
        onSuccess={() => { router.push('/dashboard/ddd'); router.refresh(); }} 
      />
    </div>
  );
}