"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import { ShieldCheck, Download, Eye, CheckCircle2, FileText, Lock } from "lucide-react"; 

export default function DirectorReviewClient({ comments, app, pdfUrl }: any) {
  const [isPending, startTransition] = useTransition();
  const [remarks, setRemarks] = useState("");
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const isCleared = app.status === 'CLEARED';

  const handleIssueAndArchive = async () => {
    if (!remarks.trim()) return alert("QMS Requirement: Director's Final Minute is required.");
    
    startTransition(async () => {
      try {
        // Build folder path for archiving
        const cleanCo = (app.company?.name || "UNKNOWN_CO").replace(/[^a-z0-9]/gi, '_').toUpperCase();
        const appRef = app.applicationNumber || `ID-${app.id}`;
        const storagePath = `${cleanCo}/${appRef}/FINAL_CLEARANCE.txt`;

        const result = await issueFinalClearance(app.id, remarks, storagePath);
        
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      } catch (err: any) {
        alert("An unexpected error occurred.");
      }
    });
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* LEFT: PDF VIEWER */}
      <div className="w-1/2 h-full bg-slate-200 border-r border-slate-300">
        {pdfUrl ? (
          <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 font-black uppercase text-xs">
            No Document Available
          </div>
        )}
      </div>

      {/* RIGHT: REVIEW PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <span className="px-2 py-0.5 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded mb-2 inline-block">
              Directorate Office
            </span>
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              {isCleared ? "Archived Record" : "Final Authorization"}
            </h1>
            <p className="text-slate-400 font-mono text-[10px] mt-1">{app.applicationNumber}</p>
          </div>
          {isCleared && (
            <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-200">
              <CheckCircle2 className="w-4 h-4" /> System Cleared
            </div>
          )}
        </header>

        {/* AUDIT TRAIL - Using the same component as Staff/DDD */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 mb-8 shadow-sm">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Full Process Lifecycle
          </h2>
          <AuditTrail comments={comments} />
        </div>

        {/* ACTION PANEL */}
        <div className="mt-auto bg-slate-900 p-8 rounded-[2rem] text-white shadow-2xl space-y-6">
          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <Lock className="w-3 h-3 text-blue-400" />
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Final Director's Minute
              </label>
            </div>
            <textarea
              disabled={isPending || isCleared}
              className="w-full p-5 bg-slate-800 border-none rounded-2xl text-sm italic text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isCleared ? "This application has been closed." : "Enter final approval remarks..."}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {!isCleared && (
              <>
                <button
                  type="button"
                  onClick={() => setHasPreviewed(true)}
                  className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${
                    hasPreviewed ? "bg-blue-600/20 border-blue-500 text-blue-400" : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {hasPreviewed ? "Clearance Verified" : "1. Verification Preview"}
                </button>

                <button
                  disabled={isPending || !remarks.trim() || !hasPreviewed}
                  onClick={handleIssueAndArchive}
                  className="py-5 rounded-2xl font-black uppercase text-xs bg-white text-slate-900 shadow-xl active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 transition-all"
                >
                  {isPending ? "Processing..." : "2. Execute Final Authorization"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}