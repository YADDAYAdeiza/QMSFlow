"use client"

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import RejectionModal from "@/components/RejectionModal";
import { approveToDirector } from "@/lib/actions/ddd"; // Adjust based on your actual action file

export default function DeputyDirectorReviewClient({ history, app, pdfUrl }: any) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);
  const [isRejectionModalOpen, setIsRejectionModalOpen] = useState(false);

  // --- QMS LOGIC GATES ---
  // These use the "Clean" data we passed from the Page.tsx
  const isDDDTurn = app.currentPoint === 'Divisional Deputy Director';
  const isCleared = app.status === 'CLEARED';

  // --- THE FINDINGS LOGIC ---
  // We look through the history array to find the comments we injected in Page.tsx
  const technicalFindings = history.find((s: any) => s.point === 'Technical Review')?.comments 
    || "No technical comments were logged.";

  const handleApprove = async () => {
    if (!confirm("Forward this application to the Director for final issuance?")) return;
    
    setIsPending(true);
    try {
      const result = await approveToDirector(app.id);
      if (result.success) {
        alert("Application forwarded to Director.");
        router.refresh();
        router.push('/dashboard/ddd'); // Redirect back to task list
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during transition.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-white border-r shadow-inner">
        {pdfUrl ? (
          <iframe 
            src={pdfUrl} 
            className="w-full h-full border-none" 
            title="Dossier Preview" 
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 italic">
            Dossier Document Preview
          </div>
        )}
      </div>

      {/* RIGHT: DDD PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <header className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            DDD Technical Review
          </h1>
          <p className="text-slate-500 font-medium">
            Reference: <span className="font-mono text-blue-600 font-bold">{app.applicationNumber}</span>
          </p>
        </header>

        {/* Audit Trail (Receives the clean history) */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            Dossier Lifecycle Audit
          </h2>
          <AuditTrail segments={history} />
        </div>

        {/* DECISION AREA */}
        <div className="mt-auto bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
          
          {/* THE FINDINGS BOX: This is the part you were asking about */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
            <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">
              Forwarded Technical Findings
            </label>
            <p className="text-sm text-slate-700 italic leading-relaxed">
              "{technicalFindings}"
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button 
              disabled={isPending || !isDDDTurn || isCleared}
              onClick={handleApprove}
              className={`py-4 rounded-lg font-black transition-all ${
                !isDDDTurn || isCleared
                ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
              }`}
            >
              {isPending ? "PROCESSING..." : "APPROVE TO DIRECTOR"}
            </button>

            <button 
              disabled={isPending || !isDDDTurn || isCleared}
              onClick={() => setIsRejectionModalOpen(true)}
              className={`py-4 rounded-lg font-black transition-all ${
                !isDDDTurn || isCleared
                ? 'bg-slate-100 text-slate-300 cursor-not-allowed' 
                : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95'
              }`}
            >
              RETURN FOR REWORK
            </button>
          </div>

          {!isDDDTurn && !isCleared && (
             <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg text-center">
                <p className="text-[10px] font-bold text-amber-700 uppercase">
                  Currently at point: {app.currentPoint}
                </p>
             </div>
          )}
        </div>
      </div>

      {/* REJECTION MODAL */}
      {/* <RejectionModal 
        isOpen={isRejectionModalOpen} 
        onClose={() => setIsRejectionModalOpen(false)} 
        appId={app.id}
      /> */}

      <RejectionModal 
        isOpen={isRejectionModalOpen} 
        onClose={() => setIsRejectionModalOpen(false)} 
        appId={app.id}
        // FIX 1: Pass the staff ID (needed for the "Return to original" logic)
        currentStaffId={app.details?.staff_reviewer_id || ""}
        // FIX 2: Define what happens when the server action finishes
        onSuccess={() => {
          setIsRejectionModalOpen(false);
          router.refresh(); // Tells Next.js to fetch the new data (Status: PENDING_REWORK)
          router.push('/dashboard/ddd'); // Sends the DDD back to their list
       }}
      />
    </div>
  );
}