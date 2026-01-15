"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import RejectionModal from "@/components/RejectionModal";
import { approveToDirector } from "@/lib/actions/ddd"; 
import { 
  History, 
  CheckCircle2, 
  AlertCircle, 
  FileText, 
  MessageSquare,
  Send
} from "lucide-react";

export default function DeputyDirectorReviewClient({ history, app, pdfUrl }: any) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);
  const [recommendationNote, setRecommendationNote] = useState("");

  // --- QMS LOGIC GATES ---
  const isDDDTurn = app.currentPoint === 'Divisional Deputy Director';
  const isCleared = app.status === 'CLEARED';

  // --- ROBUST DATA MAPPING (App 65 JSON Logic) ---
  const techHistory = app.details?.technical_history || [];
  const rejectHistory = app.details?.rejection_history || [];
  const dddHistory = app.details?.ddd_history || [];
  const dddToStaffHistory = app.details?.ddd_to_staff_history || [];
  const directorHistory = app.details?.director_history || [];
  const lodComments = app.details?.comments || [];

  // Index counters for sequential fallbacks
  let assignIndex = 0;
  let techSeqIndex = 0; 

  const augmentedHistory = history.map((segment: any) => {
    let comment = null;

    // 1. CATCH LOD (Liaison Office Intake)
    if (segment.staff_id === 'LOD_OFFICER' || segment.division === 'LOD') {
      comment = lodComments[0]?.text || "Dossier Received by Liaison Office";
    }

    // 2. MATCH DIRECTOR (Using Timestamp to fix the "Initial Minute" placement)
    else if (segment.point === 'Director' && segment.staff_id !== 'LOD_OFFICER') {
      const segEndTime = segment.endTime ? new Date(segment.endTime).getTime() : null;
      
      // Match the director's instruction that was logged when this segment ended
      const directorMatch = directorHistory.find((d: any) => {
        const actionTime = new Date(d.timestamp || d.created_at).getTime();
        return segEndTime && Math.abs(actionTime - segEndTime) < 5000;
      });

      comment = directorMatch?.instruction || segment.comments || null;
    }

    // 3. MATCH TECHNICAL REVIEW (Timestamp-First + Round Fallback)
    else if (segment.point === 'Technical Review') {
      let techMatch = techHistory.find((h: any) => {
        const subTime = new Date(h.submitted_at).getTime();
        const segStart = new Date(segment.startTime).getTime();
        const segEnd = segment.endTime ? new Date(segment.endTime).getTime() : null;
        return subTime >= segStart && (!segEnd || subTime <= segEnd + 5000);
      });

      if (!techMatch && segment.endTime && techHistory[techSeqIndex]) {
        techMatch = techHistory[techSeqIndex];
      }

      comment = techMatch?.findings || "Technical review in progress...";
      if (segment.endTime) techSeqIndex++;
    }

    // 4. MATCH DDD (Rejections, Recommendations, and Assignments)
    else if (segment.point === 'Divisional Deputy Director') {
      const segEndTime = segment.endTime ? new Date(segment.endTime).getTime() : null;

      const rejection = rejectHistory.find((r: any) => {
        const rejTime = new Date(r.rejected_at).getTime();
        return segEndTime && Math.abs(rejTime - segEndTime) < 5000;
      });

      const recommendation = dddHistory.find((d: any) => {
        const recTime = new Date(d.timestamp).getTime();
        return segEndTime && Math.abs(recTime - segEndTime) < 5000;
      });

      const assignment = dddToStaffHistory[assignIndex];
      comment = rejection?.reason || recommendation?.note || assignment?.instruction || null;
      
      if (!rejection && !recommendation && assignment) {
        assignIndex++;
      }
    }

    return { ...segment, comments: comment };
  });

  const technicalHistoryDisplay = [...techHistory].reverse();

  const handleApprove = async () => {
    if (!recommendationNote.trim()) {
      alert("Please provide a recommendation note for the Director.");
      return;
    }
    if (!confirm("Forward this application to the Director for final issuance?")) return;
    
    setIsPending(true);
    try {
      const result = await approveToDirector(app.id, recommendationNote);
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
      <div className="w-1/2 h-full bg-white border-r shadow-inner relative">
        {pdfUrl ? (
          <iframe 
            src={`${pdfUrl}#view=FitH`} 
            className="w-full h-full border-none" 
            title="Dossier Preview" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
            <FileText className="w-12 h-12 opacity-20" />
            <p className="italic text-[10px] font-black uppercase tracking-widest">Document Unavailable</p>
          </div>
        )}
      </div>

      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto bg-slate-50/50">
        <header className="mb-6">
          <div className="flex items-center gap-2 mb-1">
             <div className="h-2 w-2 rounded-full bg-blue-600 animate-pulse" />
             <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Technical Recommendation Phase</span>
          </div>
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase italic">
            DDD Review
          </h1>
          <p className="text-slate-500 font-medium font-mono text-sm">
            Ref: <span className="text-blue-600 font-bold">{app.applicationNumber}</span>
          </p>
        </header>

        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <History className="w-3 h-3" /> Dossier Lifecycle Audit
          </h2>
          <AuditTrail segments={augmentedHistory} />
        </div>

        <div className="mt-auto bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-2xl space-y-6">
          <div className="bg-blue-50/30 p-4 rounded-xl border border-blue-100 shadow-inner">
            <div className="flex items-center gap-2 mb-4">
               <History className="w-4 h-4 text-blue-600" />
               <label className="text-[10px] font-black text-blue-600 uppercase tracking-tighter">
                Latest Staff Findings
              </label>
            </div>
            
            <div className="space-y-4 max-h-32 overflow-y-auto pr-2 custom-scrollbar">
              {technicalHistoryDisplay.length > 0 ? (
                technicalHistoryDisplay.map((entry: any, i: number) => (
                  <div key={i} className="relative pl-4 border-l-2 border-blue-200 py-1">
                    <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-blue-400" />
                    <span className="text-[9px] font-black text-blue-500 uppercase tracking-tighter">Round {entry.round}</span>
                    <p className="text-xs text-slate-700 italic leading-relaxed">"{entry.findings}"</p>
                  </div>
                ))
              ) : (
                <p className="text-xs text-slate-400 italic">No technical findings logged yet.</p>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                <MessageSquare className="w-3 h-3" /> Note to Director
              </label>
              {!recommendationNote && isDDDTurn && (
                <span className="text-[9px] font-bold text-rose-500 animate-bounce uppercase">Required for Approval</span>
              )}
            </div>
            <textarea
              className="w-full p-4 text-sm border-2 border-slate-100 rounded-xl focus:border-blue-500 outline-none transition-all italic text-slate-700 bg-slate-50/50"
              placeholder="Provide your technical recommendation for the Director..."
              rows={3}
              value={recommendationNote}
              onChange={(e) => setRecommendationNote(e.target.value)}
              disabled={isPending || !isDDDTurn || isCleared}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              disabled={isPending || !isDDDTurn || isCleared || !recommendationNote.trim()}
              onClick={handleApprove}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 disabled:bg-slate-100"
            >
              <Send className="w-4 h-4" />
              {isPending ? "PROCESSING..." : "APPROVE TO DIRECTOR"}
            </button>

            <button 
              disabled={isPending || !isDDDTurn || isCleared}
              onClick={() => setIsRejectionModalOpen(true)}
              className="flex items-center justify-center gap-2 py-4 rounded-xl font-black transition-all uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 disabled:bg-slate-50"
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