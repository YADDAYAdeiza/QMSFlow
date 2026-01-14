"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import RejectionModal from "@/components/RejectionModal";
import { approveToDirector } from "@/lib/actions/ddd"; 
import { History, CheckCircle2, AlertCircle, FileText } from "lucide-react";

export default function DeputyDirectorReviewClient({ history, app, pdfUrl }: any) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  // --- QMS LOGIC GATES ---
  const isDDDTurn = app.currentPoint === 'Divisional Deputy Director';
  const isCleared = app.status === 'CLEARED';

  // --- DATA MAPPING LOGIC ---
  const techHistory = app.details?.technical_history || [];
  const rejectHistory = app.details?.rejection_history || [];

  // Track counts to map timeline rows to JSON array indices
  let techIndex = 0;
  let rejectIndex = 0;

  const augmentedHistory = history.map((segment: any) => {
    let comment = null;

    if (segment.point === 'Technical Review') {
      // Pick the findings for this specific round, then move the pointer
      comment = techHistory[techIndex]?.findings || null;
      techIndex++;
    } else if (segment.point === 'Divisional Deputy Director') {
      // Pick the rejection reason for this specific round
      comment = rejectHistory[rejectIndex]?.reason || null;
      rejectIndex++;
    }

    return {
      ...segment,
      comments: comment // This injects the specific text into the AuditTrail segment
    };
  });

  const technicalHistoryDisplay = [...techHistory].reverse();

  const handleApprove = async () => {
    if (!confirm("Forward this application to the Director for final issuance?")) return;
    setIsPending(true);
    try {
      const result = await approveToDirector(app.id);
      if (result.success) {
        alert("Application forwarded to Director.");
        router.refresh();
        router.push('/dashboard/ddd'); 
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during transition.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-white border-r shadow-inner">
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full border-none" title="Dossier Preview" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="italic">Dossier Document Preview Unavailable</p>
          </div>
        )}
      </div>

      {/* RIGHT: DDD PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto bg-slate-50/50">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
             <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Active Review Session</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">DDD Technical Review</h1>
          <p className="text-slate-500 font-medium font-mono text-sm tracking-tight">
            Ref: <span className="text-blue-600 font-bold">{app.applicationNumber}</span>
          </p>
        </header>

        {/* Audit Trail Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">Dossier Lifecycle Audit</h2>
          <AuditTrail segments={augmentedHistory} />
        </div>

        {/* DECISION AREA */}
        <div className="mt-auto bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-2xl space-y-6">
          <div className="bg-blue-50/50 p-5 rounded-xl border border-blue-100 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
               <History className="w-4 h-4 text-blue-600" />
               <label className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                Quick Summary: Technical History ({techHistory.length} Rounds)
              </label>
            </div>
            
            <div className="space-y-4 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
              {technicalHistoryDisplay.map((entry: any, i: number) => (
                <div key={i} className="relative pl-4 border-l-2 border-blue-200 py-1">
                  <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-400" />
                  <span className="text-[9px] font-black text-blue-500 uppercase">Round {entry.round}</span>
                  <p className="text-sm text-slate-700 italic leading-relaxed">"{entry.findings}"</p>
                </div>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              disabled={isPending || !isDDDTurn || isCleared}
              onClick={handleApprove}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 disabled:bg-slate-100 disabled:text-slate-300"
            >
              <CheckCircle2 className="w-4 h-4" />
              {isPending ? "PROCESSING..." : "APPROVE TO DIRECTOR"}
            </button>

            <button 
              disabled={isPending || !isDDDTurn || isCleared}
              onClick={() => setIsRejectionModalOpen(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-xs bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 disabled:bg-slate-50 disabled:text-slate-200"
            >
              <AlertCircle className="w-4 h-4" />
              RETURN FOR REWORK
            </button>
          </div>
        </div>
      </div>

      <RejectionModal 
        isOpen={isRejectionModalOpen} 
        onClose={() => setIsRejectionModalOpen(false)} 
        appId={app.id}
        currentStaffId={app.details?.staff_reviewer_id || ""}
        onSuccess={() => {
          setIsRejectionModalOpen(false);
          router.refresh(); 
          router.push('/dashboard/ddd'); 
       }}
      />
    </div>
  );
}