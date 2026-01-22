"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { supabase } from '@/lib/supabase';
import { finalizeApplication, returnToStaffFromDirector } from '@/lib/actions/director';
import { CapaLetter } from '@/components/documents/CapaLetter';
import CapaLetterView from '@/components/CapaLetterView';
import { 
  FileCheck, Loader2, ShieldCheck, FileText, History, 
  MessageSquare, ClipboardCheck, RotateCcw, X, FileX 
} from 'lucide-react';

export default function DirectorReviewClient({ app, pdfUrl }: any) {
  const [decisionNote, setDecisionNote] = useState("");
  const [reworkNote, setReworkNote] = useState("");
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [showLetterPreview, setShowLetterPreview] = useState(false);
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const isCapa = app.isCapaOutcome;
  const narrative = [...(app.narrativeHistory || [])].reverse();

  const handleFinalize = async (isApproved: boolean) => {
    if (!decisionNote.trim()) return alert("QMS Requirement: Final decision note is mandatory.");
    
    const actionLabel = isApproved ? (isCapa ? "Issue CAPA Letter" : "Issue Certificate") : "Reject Application";
    if (!confirm(`Confirm ${actionLabel}? This will generate the physical PDF and archive it.`)) return;

    startTransition(async () => {
      try {
        let storagePath = "";

        if (isApproved) {
          // 1. Generate the PDF Blob
          const blob = await pdf(
            <CapaLetter 
              data={{
                appNumber: app.application_number,
                companyName: app.company?.name || "Company",
                companyAddress: app.details?.factory_address || "Address",
                facilityName: app.details?.factory_name || "Facility",
                date: new Date().toLocaleDateString()
              }} 
              observations={app.latestObservations} 
            />
          ).toBlob();

          // 2. Setup Hierarchical Path: Company/App/Type/File
          const safeCo = (app.company?.name || "Unknown").replace(/[^a-z0-9]/gi, '_');
          const safeApp = (app.application_number || "App").replace(/[^a-z0-9]/gi, '_');
          const type = isCapa ? "CAPA" : "GMP_CERTIFICATE";
          
          storagePath = `${safeCo}/${safeApp}/${type}/Notification_${Date.now()}.pdf`;

          // 3. Upload to Supabase 'documents' bucket
          const { error: uploadError } = await supabase.storage
            .from('documents')
            .upload(storagePath, blob, { contentType: 'application/pdf', upsert: true });

          if (uploadError) throw uploadError;
        }

        // 4. Update Database
        const result = await finalizeApplication(app.id, isApproved, decisionNote, storagePath);
        if (result.success) {
          router.push('/dashboard/director');
          router.refresh();
        }
      } catch (err: any) {
        alert("Process failed: " + err.message);
      }
    });
  };

  const handleReturnToStaff = () => {
    if (!reworkNote.trim()) return alert("Please provide instructions for the staff.");
    startTransition(async () => {
      const result = await returnToStaffFromDirector(app.id, reworkNote);
      if (result.success) {
        setIsReworkModalOpen(false);
        router.push('/dashboard/director');
        router.refresh();
      }
    });
  };

  return (
    <div className="grid grid-cols-12 gap-8 p-8 bg-slate-50 min-h-screen">
      
      {/* LEFT: PREVIEW PANEL */}
      <div className="col-span-7 h-[88vh] flex flex-col gap-4">
        <div className="flex bg-slate-200 p-1 rounded-2xl w-fit gap-1">
          <button onClick={() => setShowLetterPreview(false)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${!showLetterPreview ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            <ShieldCheck className="w-4 h-4" /> Dossier
          </button>
          <button onClick={() => setShowLetterPreview(true)} className={`px-6 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 transition-all ${showLetterPreview ? 'bg-white shadow-sm text-slate-900' : 'text-slate-500'}`}>
            <FileText className="w-4 h-4" /> {isCapa ? "CAPA Letter" : "Draft Certificate"}
          </button>
        </div>

        <div className="flex-1 bg-white rounded-[3rem] shadow-2xl border border-slate-200 overflow-hidden">
          {showLetterPreview ? (
            <div className="bg-slate-400/20 p-12 min-h-full flex justify-center overflow-y-auto">
              <CapaLetterView app={app} observations={app.latestObservations} />
            </div>
          ) : (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full" />
          )}
        </div>
      </div>

      {/* RIGHT: ACTION PANEL & AUDIT TRAIL */}
      <div className="col-span-5 flex flex-col gap-6 overflow-y-auto pr-2 max-h-[88vh]">
        
        {/* Recommendation Hero Box */}
        <div className={`p-8 rounded-[2.5rem] text-white shadow-xl ${isCapa ? 'bg-amber-600' : 'bg-blue-600'}`}>
          <h3 className="text-[11px] font-black uppercase mb-4 flex items-center gap-2 tracking-widest text-white/80">
            <ClipboardCheck className="w-4 h-4" /> Divisional Deputy Director's Note
          </h3>
          <p className="text-sm font-medium italic border-l-4 border-white/20 pl-6 leading-relaxed">
            "{app.dddRecommendation}"
          </p>
        </div>

        {/* Narrative Lifecycle (Audit Trail) */}
        <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
          <h3 className="text-[10px] font-black uppercase text-slate-400 mb-6 flex items-center gap-2 tracking-widest">
            <History className="w-4 h-4" /> Workflow Narrative
          </h3>
          <div className="space-y-4">
            {narrative.map((note: any, idx: number) => (
              <div key={idx} className="p-5 bg-slate-50 border border-slate-100 rounded-2xl text-[11px] text-slate-600">
                <div className="flex justify-between mb-2 opacity-50 font-black uppercase text-[8px]">
                  <span>{note.from}</span>
                  <span>{new Date(note.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="italic font-medium leading-relaxed">"{note.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Final Actions */}
        <div className="bg-slate-900 p-8 rounded-[3rem] text-white mt-auto shadow-2xl">
          <h3 className="text-blue-400 text-[11px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" /> Final Director's Minute
          </h3>
          
          <textarea 
            value={decisionNote} 
            onChange={(e) => setDecisionNote(e.target.value)}
            disabled={isPending}
            className="w-full h-28 bg-slate-800 rounded-[2rem] p-6 text-sm mb-6 outline-none border-none italic placeholder:text-slate-600 text-slate-200"
            placeholder="Type final administrative decision for the permanent archive..."
          />

          <button 
            onClick={() => handleFinalize(true)} 
            disabled={isPending} 
            className="w-full py-5 bg-emerald-600 hover:bg-emerald-500 rounded-2xl font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-3 transition-all mb-4"
          >
            {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : <><FileCheck className="w-4 h-4" /> Authorize & Issue</>}
          </button>

          <div className="grid grid-cols-2 gap-3">
            <button 
              onClick={() => handleFinalize(false)} 
              disabled={isPending} 
              className="py-4 bg-rose-600/10 text-rose-500 hover:bg-rose-600 hover:text-white rounded-xl font-black uppercase text-[9px] transition-all"
            >
              <FileX className="w-3.5 h-3.5 inline mr-2" /> Deny
            </button>
            <button 
              onClick={() => setIsReworkModalOpen(true)} 
              disabled={isPending} 
              className="py-4 bg-slate-800 text-slate-400 hover:text-white rounded-xl font-black uppercase text-[9px] transition-all"
            >
              <RotateCcw className="w-3.5 h-3.5 inline mr-2" /> Rework
            </button>
          </div>
        </div>
      </div>

      {/* REWORK MODAL */}
      {isReworkModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/90 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-lg rounded-[3rem] p-10 shadow-2xl animate-in zoom-in-95">
            <div className="flex justify-between items-center mb-8">
              <h3 className="font-black uppercase text-xs tracking-widest flex items-center gap-2">
                <RotateCcw className="w-4 h-4 text-blue-600" /> Return for Rework
              </h3>
              <button onClick={() => setIsReworkModalOpen(false)} className="p-2 hover:bg-slate-100 rounded-full transition-colors">
                <X className="w-6 h-6 text-slate-400" />
              </button>
            </div>
            
            <textarea 
              value={reworkNote}
              onChange={(e) => setReworkNote(e.target.value)}
              className="w-full h-44 bg-slate-50 border-none rounded-[2rem] p-8 text-sm italic outline-none resize-none focus:ring-2 focus:ring-blue-500"
              placeholder="Provide specific instructions for the Staff Reviewer..."
            />

            <button 
              onClick={handleReturnToStaff}
              disabled={isPending || !reworkNote.trim()}
              className="w-full py-5 mt-8 bg-slate-900 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest hover:bg-blue-600 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {isPending ? <Loader2 className="animate-spin w-4 h-4" /> : "Dispatch Rework Order"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}