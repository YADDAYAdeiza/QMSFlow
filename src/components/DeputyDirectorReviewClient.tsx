// @/components/DeputyDirectorReviewClient.tsx
"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, FileSearch, ArrowRight, RotateCcw, 
  ShieldCheck, Loader2, History, Activity, UserPlus, Building2
} from 'lucide-react';

import { approveToDirector, assignToStaff } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

interface DDDReviewProps {
  app: any; 
  staffList: any[];
  pdfUrl: string;
  loggedInUserId: string;
}

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl, loggedInUserId }: DDDReviewProps) {
  const [remarks, setRemarks] = useState("");
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const router = useRouter();

  // --- LOGIC PHASE CHECKS ---
  const isInitialAssignment = app.currentPoint === 'Technical DD Review';
  const isReviewPhase = app.currentPoint === 'Technical DD Review Return' || app.currentPoint === 'IRSD Hub Clearance';
  const isHubStage = app.currentPoint === 'IRSD Hub Clearance';

  console.log('isInitialAssignment:', isInitialAssignment)
  console.log('isReviewPhase:', isInitialAssignment)

  // --- DATA EXTRACTION ---
  const technicalCapas = Array.isArray(app.latestCapas) ? app.latestCapas : [];
  const currentStaffId = app.details?.staff_reviewer_id || "";
  const trail = Array.isArray(app.details?.comments) 
    ? [...app.details.comments].reverse() 
    : [];

  // --- HANDLERS ---
  const handleAssign = async () => {
    if (!selectedStaffId) return alert("Select a Technical Staff member.");
    if (!remarks.trim()) return alert("QMS: Provide instructions for the staff.");
    
    startTransition(async () => {
      const res = await assignToStaff(app.id, selectedStaffId, remarks);
      if (res.success) {
        router.push('/dashboard/ddd');
        router.refresh();
      }
    });
  };

  const handleEndorse = async () => {
    if (!remarks.trim()) return alert("QMS: Provide concurrence notes.");
    startTransition(async () => {
      const result = await approveToDirector(app.id, remarks, loggedInUserId);
      if (result.success) {
        router.push('/dashboard/ddd');
        router.refresh();
      }
    });
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center gap-2 px-4">
            <div className="bg-blue-600 p-1.5 rounded-lg">
                <ShieldCheck className="w-4 h-4 text-white" />
            </div>
            <h2 className="text-[10px] font-black uppercase tracking-widest text-slate-500">Dossier Verification Preview</h2>
        </div>
        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[82vh] relative overflow-hidden">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full rounded-[2.2rem] border-none" title="Dossier" />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2.2rem] border-2 border-dashed border-slate-200">
              <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Dossier File Not Found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar">
        
        {/* 1. HISTORY (Always Top) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
           <div className="flex items-center gap-2 mb-6">
             <div className="bg-slate-100 p-2 rounded-lg">
                <History className="w-4 h-4 text-slate-500" />
             </div>
             <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Dossier Narrative History</h3>
           </div>
           <div className="space-y-4">
             {trail.map((note: any, idx: number) => (
               <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 hover:border-blue-500 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100 group-hover:border-blue-500" />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black uppercase text-[9px] text-blue-600">{note.role}</span>
                    <span className="text-[8px] text-slate-400 font-mono">{new Date(note.timestamp).toLocaleString()}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-blue-50/50">
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">"{note.text}"</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* 2. ASSIGNMENT BOX (Sequence 3) */}
        {isInitialAssignment && (
          <div className="bg-blue-600 p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden">
            <div className="relative z-10">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  <UserPlus className="w-4 h-4" /> Dispatch to Technical Officer
                </h3>
                <div className="space-y-4">
                    <select 
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full bg-blue-700/50 border border-blue-400/30 text-white p-5 rounded-3xl text-xs font-bold outline-none focus:ring-2 focus:ring-white/50 appearance-none"
                    >
                      <option value="" className="text-slate-900">Select Technical Reviewer...</option>
                      {staffList.filter(s => s.role === 'Staff').map(s => (
                        <option key={s.id} value={s.id} className="text-slate-900">{s.name} ({s.division})</option>
                      ))}
                    </select>

                    <textarea 
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      placeholder="Enter processing instructions..."
                      className="w-full h-24 bg-blue-700/30 border border-blue-400/20 rounded-2xl p-4 text-xs text-white outline-none focus:ring-2 focus:ring-white/50"
                    />

                    <button onClick={handleAssign} disabled={isPending} className="w-full py-5 bg-white text-blue-600 rounded-3xl font-black uppercase text-[10px] hover:shadow-2xl transition-all flex items-center justify-center gap-2">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Initiate Staff Review"}
                    </button>
                </div>
            </div>
            <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 text-blue-500/20" />
          </div>
        )}

        {/* 3. REVIEW BOX (Sequence 5 & 6) */}
        {isReviewPhase && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-blue-50 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-400 flex items-center gap-2">
                <ClipboardList className="w-4 h-4" /> Staff Assessment Findings
              </h3>
              {technicalCapas.length > 0 ? technicalCapas.map((capa: any, i: number) => (
                <div key={i} className="p-5 bg-slate-50 rounded-3xl border border-slate-100 relative overflow-hidden">
                  <div className={`absolute top-0 left-0 bottom-0 w-1.5 ${capa.classification === 'Critical' ? 'bg-rose-600' : 'bg-amber-500'}`} />
                  <span className={`text-[8px] font-black uppercase px-2 py-1 rounded-md mb-3 inline-block ${capa.classification === 'Critical' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                    {capa.classification}
                  </span>
                  <p className="text-[11px] font-bold text-slate-800 leading-relaxed">{capa.deficiency}</p>
                </div>
              )) : (
                <div className="text-center py-8 border-2 border-dashed border-slate-100 rounded-3xl">
                    <Activity className="w-5 h-5 text-slate-200 mx-auto mb-2" />
                    <p className="text-[10px] text-slate-300 font-bold uppercase tracking-widest italic">Awaiting technical staff input</p>
                </div>
              )}
            </div>

            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 block ml-2">
                Divisional Deputy Director's Minute
              </label>
              <textarea 
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                className="w-full h-32 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 italic outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                placeholder={"Enter concurrence notes..."}
              />
              <div className="space-y-3">
                <button onClick={handleEndorse} disabled={isPending} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all ${technicalCapas.length > 0 ? 'bg-rose-600 hover:bg-rose-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>{isHubStage ? "Endorse to Director" : "Forward to Hub"} <ArrowRight className="w-4 h-4" /></>
                    // <>Forward to Hub<ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                <button type="button" onClick={() => setIsReworkModalOpen(true)} className="w-full py-5 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 flex items-center justify-center gap-2">
                  <RotateCcw className="w-3 h-3" /> Return for Rework
                </button>
              </div>
            </div>
          </div>
        )}
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