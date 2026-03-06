"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileSearch, ArrowRight, RotateCcw, ShieldCheck, Loader2, 
  History, UserPlus, Building2, Gavel, FileText, Award, Eye
} from 'lucide-react';
import { approveToDirector, assignToStaff } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl, loggedInUserId }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);

  // --- RESTORED STATES ---
  const [assignmentRemarks, setAssignmentRemarks] = useState(""); 
  const [endorsementRemarks, setEndorsementRemarks] = useState(""); 
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const appDetails = app?.details || {};
  const history = app?.narrativeHistory || [];

  // --- PDF RESOLUTION ---
  const dossierUrl = appDetails?.poaUrl || appDetails?.inspectionReportUrl || "";
  const staffReportUrl = pdfUrl; 
  const certificateUrl = appDetails?.draftCertificateUrl || "";

  const hasStaffSubmission = !!(appDetails?.verificationReportUrl || pdfUrl || history.some((c: any) => c?.attachmentUrl));
  const [viewMode, setViewMode] = useState<'dossier' | 'report' | 'certificate'>(hasStaffSubmission ? 'report' : 'dossier');

  const trail = [...history].reverse();

  // --- LOGIC HELPERS ---
  const isInitialAssignment = app?.currentPoint === 'Technical DD Review';
  const isHubStage = app?.currentPoint === 'IRSD Hub Clearance';
  const isReviewPhase = app?.currentPoint === 'Technical DD Review Return' || isHubStage;
  
  // Resolve which division list to show
  const appDivision = Array.isArray(appDetails?.assignedDivisions) ? appDetails.assignedDivisions[0] : (appDetails?.division || "VMD");
  const activeAssignmentDivision = isHubStage ? "IRSD" : appDivision;

  const getActivePdf = () => {
    if (viewMode === 'certificate') return certificateUrl;
    if (viewMode === 'report') return staffReportUrl;
    return dossierUrl;
  };

  // --- RESTORED ACTIONS ---
  const handleAssign = async () => {
    if (!selectedStaffId) return alert(`Please select an officer.`);
    if (!assignmentRemarks.trim()) return alert("QMS Requirement: Instructions are required.");
    startTransition(async () => {
      const res = await assignToStaff(app.id, selectedStaffId, assignmentRemarks);
      if (res.success) { router.push('/dashboard/ddd'); router.refresh(); }
      else alert(res.error);
    });
  };

  const handleEndorse = async () => {
    if (!endorsementRemarks.trim()) return alert("QMS Requirement: Concurrence notes required.");
    startTransition(async () => {
      const result = await approveToDirector(app.id, endorsementRemarks, loggedInUserId);
      if (result.success) { router.push('/dashboard/ddd'); router.refresh(); }
      else alert(result.error);
    });
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* LEFT: VIEWER PANEL */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-1">
                <button onClick={() => setViewMode('dossier')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                  <FileText className="w-3.5 h-3.5" /> Company Dossier
                </button>
                {hasStaffSubmission && (
                  <button onClick={() => setViewMode('report')} className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'report' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}>
                    <ShieldCheck className="w-3.5 h-3.5" /> Verification Evidence
                  </button>
                )}
            </div>
        </div>

        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[78vh] relative overflow-hidden">
          {getActivePdf() ? (
            <iframe src={`${getActivePdf()}#toolbar=0`} className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" key={viewMode} />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2.2rem]">
              <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">No Document Found</p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar pb-10">
        
        {/* 1. NARRATIVE HISTORY (Restored Full Logic) */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
             <History className="w-4 h-4 text-slate-500" /> Audit Narrative
           </h3>
           <div className="space-y-4">
             {trail.map((note: any, idx: number) => (
               <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100" />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black uppercase text-[9px] text-blue-600">{note?.from}</span>
                    <span className="text-[8px] text-slate-400 font-mono">{note?.timestamp ? new Date(note.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">"{note?.text}"</p>
                    {note?.attachmentUrl && (
                      <button onClick={() => setViewMode('report')} className="mt-2 inline-flex items-center gap-1 text-[8px] font-bold text-emerald-600 uppercase border border-emerald-100 px-2 py-1 rounded bg-white">
                        <Eye className="w-2 h-2" /> View Attached File
                      </button>
                    )}
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* 2. ASSIGNMENT BOX (Restored) */}
        {(isInitialAssignment || isHubStage) && (
          <div className={`p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden transition-all duration-500 ${isHubStage ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="relative z-10">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  {isHubStage ? <Gavel className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isHubStage ? "Hub Delegation" : `Dispatch to ${activeAssignmentDivision} Staff`}
                </h3>
                <div className="space-y-4">
                    <select 
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className={`w-full border border-white/20 p-5 rounded-3xl text-xs font-bold outline-none appearance-none ${isHubStage ? 'bg-emerald-700/50 text-white' : 'bg-blue-700/50 text-white'}`}
                    >
                      <option value="" className="text-slate-900">Select Officer...</option>
                      {staffList.filter((s: any) => s.role === 'Staff' && s.division === activeAssignmentDivision).map((s: any) => (
                        <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                      ))}
                    </select>
                    <textarea 
                      value={assignmentRemarks} 
                      onChange={(e) => setAssignmentRemarks(e.target.value)}
                      placeholder="Enter specific QMS instructions..."
                      className={`w-full h-24 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none placeholder:text-white/50 ${isHubStage ? 'bg-emerald-700/30' : 'bg-blue-700/30'}`}
                    />
                    <button onClick={handleAssign} disabled={isPending} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] hover:shadow-2xl transition-all flex items-center justify-center">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : `Execute Assignment`}
                    </button>
                </div>
            </div>
            <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </div>
        )}

        {/* 3. ENDORSEMENT BOX (Restored) */}
        {isReviewPhase && (
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-slate-800">
            <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 block ml-2">Executive Concurrence</label>
            <textarea 
              value={endorsementRemarks} 
              onChange={(e) => setEndorsementRemarks(e.target.value)}
              className="w-full h-32 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 italic outline-none text-slate-200"
              placeholder="Enter review minutes..."
            />
            <div className="space-y-3">
              <button onClick={handleEndorse} disabled={isPending} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all ${isHubStage ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>{isHubStage ? "Endorse to Director" : "Forward to IRSD Hub"} <ArrowRight className="w-4 h-4" /></>
                )}
              </button>
              <button type="button" onClick={() => setIsReworkModalOpen(true)} className="w-full py-5 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-800 text-slate-500 hover:text-white transition-colors">
                Return for Rework
              </button>
            </div>
          </div>
        )}
      </div>

      <RejectionModal 
        isOpen={isReworkModalOpen} 
        onClose={() => setIsReworkModalOpen(false)} 
        appId={app.id} 
        currentStaffId={appDetails.staff_reviewer_id || ""} 
        staffList={staffList} 
        onSuccess={() => { router.push('/dashboard/ddd'); router.refresh(); }} 
      />
    </div>
  );
}