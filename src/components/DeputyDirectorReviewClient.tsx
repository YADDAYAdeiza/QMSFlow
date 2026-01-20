"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import RejectionModal from "@/components/RejectionModal";
import { approveToDirector } from "@/lib/actions/ddd"; 
import { History, AlertCircle, FileText, MessageSquare, Send } from "lucide-react";

interface ClientProps {
  timeline: any[];
  app: any;
  pdfUrl: string;
  staffList: { id: string; name: string }[]; // <--- ADD THIS
}

export default function DeputyDirectorReviewClient({ timeline, app, pdfUrl,staffList }: ClientProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [recommendationNote, setRecommendationNote] = useState("");

  const isDDDTurn = app.currentPoint === 'Divisional Deputy Director';
  const comments = app.details?.comments || [];

  const handleApprove = async () => {
    if (!recommendationNote.trim()) {
      alert("Please provide a recommendation note.");
      return;
    }
    setIsPending(true);
    try {
      const result = await approveToDirector(app.id, recommendationNote);
      if (result.success) {
        router.refresh();
        router.push('/dashboard/ddd'); 
      }
    } catch (error) {
      alert("Transition error.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-white border-r relative">
        {pdfUrl ? (
          <iframe src={`${pdfUrl}#view=FitH`} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="italic text-[10px] font-black uppercase tracking-widest">Document Unavailable</p>
          </div>
        )}
      </div>

      {/* RIGHT: DDD PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto bg-slate-50/50">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">DDD Review</h1>
          <p className="text-slate-500 font-mono text-sm">Ref: {app.applicationNumber}</p>
        </header>

        {/* AUDIT TRAIL: Now using the Unified Array */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <History className="w-3 h-3" /> Unified Comment Trail
          </h2>
          <AuditTrail comments={comments} />
        </div>

        {/* ACTION PANEL */}
        <div className="mt-auto bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-1.5">
              <MessageSquare className="w-3 h-3" /> Recommendation to Director
            </label>
            <textarea
              className="w-full p-4 text-sm border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none italic bg-slate-50/50"
              placeholder="E.g., Recommended for approval based on VMD technical findings..."
              rows={3}
              value={recommendationNote}
              onChange={(e) => setRecommendationNote(e.target.value)}
              disabled={isPending || !isDDDTurn}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              disabled={isPending || !isDDDTurn || !recommendationNote.trim()}
              onClick={handleApprove}
              className="py-4 rounded-xl font-black uppercase text-[10px] bg-emerald-600 text-white shadow-lg disabled:bg-slate-100 disabled:text-slate-300 transition-all active:scale-95"
            >
              <Send className="w-4 h-4 inline mr-2" />
              {isPending ? "PROCESSING..." : "APPROVE TO DIRECTOR"}
            </button>

            <button 
              disabled={isPending || !isDDDTurn}
              onClick={() => setIsRejectionModalOpen(true)}
              className="py-4 rounded-xl font-black uppercase text-[10px] bg-rose-600 text-white shadow-lg disabled:bg-slate-50 transition-all active:scale-95"
            >
              <AlertCircle className="w-4 h-4 inline mr-2" />
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
        staffList={staffList} // <--- This will now work!
        onSuccess={() => { 
          router.refresh(); 
          router.push('/dashboard/ddd'); 
        }}
      />
    </div>
  );
}