"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  ClipboardList, FileSearch, ArrowRight, RotateCcw, 
  ShieldCheck, Loader2, History, UserPlus, Building2, Gavel, 
  ExternalLink, FileText, Award, Eye
} from 'lucide-react';

import { approveToDirector, assignToStaff } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

interface DDDReviewProps {
  app: any; 
  staffList: any[];
  pdfUrl: string; // This is the resolved Latest Report from the Server Page
  loggedInUserId: string;
}

type ViewMode = 'dossier' | 'report' | 'certificate';

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl, loggedInUserId }: DDDReviewProps) {
  // ✅ VIEW STATE: Toggle between document types
  const [viewMode, setViewMode] = useState<ViewMode>(pdfUrl ? 'report' : 'dossier');
  
  // ✅ DECOUPLED STATE: Independent inputs for Assignment vs Endorsement
  const [assignmentRemarks, setAssignmentRemarks] = useState(""); 
  const [endorsementRemarks, setEndorsementRemarks] = useState(""); 
  
  const [selectedStaffId, setSelectedStaffId] = useState("");
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const router = useRouter();

  // Data Extraction
  const appDetails = app.details || {};
  const dossierUrl = appDetails.inspectionReportUrl || appDetails.poaUrl || "";
  const certificateUrl = appDetails.draftCertificateUrl || "";
  const staffReportUrl = pdfUrl; // Passed from server resolution

  // Phase Checks
  const isInitialAssignment = app.currentPoint === 'Technical DD Review';
  const isHubStage = app.currentPoint === 'IRSD Hub Clearance';
  const isTechnicalReturn = app.currentPoint === 'Technical DD Review Return';
  const isReviewPhase = isTechnicalReturn || isHubStage;

  const appDivision = Array.isArray(appDetails.assignedDivisions) 
    ? appDetails.assignedDivisions[0] 
    : (appDetails.division || "VMD");

  const activeAssignmentDivision = isHubStage ? "IRSD" : appDivision;
  const trail = [...(app.narrativeHistory || [])].reverse();

  // --- Handlers ---
  const handleAssign = async () => {
    if (!selectedStaffId) return alert(`Select an officer.`);
    if (!assignmentRemarks.trim()) return alert("Instructions required.");
    startTransition(async () => {
      const res = await assignToStaff(app.id, selectedStaffId, assignmentRemarks);
      if (res.success) { router.push('/dashboard/ddd'); router.refresh(); }
      else alert(res.error);
    });
  };

  const handleEndorse = async () => {
    if (!endorsementRemarks.trim()) return alert("Concurrence notes required.");
    startTransition(async () => {
      const result = await approveToDirector(app.id, endorsementRemarks, loggedInUserId);
      if (result.success) { router.push('/dashboard/ddd'); router.refresh(); }
      else alert(result.error);
    });
  };

  // Helper to get active PDF
  const getActivePdf = () => {
    if (viewMode === 'certificate') return certificateUrl;
    if (viewMode === 'report') return staffReportUrl;
    return dossierUrl;
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* LEFT: MULTI-VIEW VIEWER PANEL */}
      <div className="col-span-7 space-y-4">
        
        {/* DOCUMENT VIEW SWITCHER */}
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode('dossier')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> Company Dossier
                </button>
                
                {staffReportUrl && (
                  <button 
                    onClick={() => setViewMode('report')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'report' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Staff Report
                  </button>
                )}

                {certificateUrl && (
                  <button 
                    onClick={() => setViewMode('certificate')}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'certificate' ? 'bg-amber-500 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <Award className="w-3.5 h-3.5" /> Draft Certificate
                  </button>
                )}
            </div>

            <div className="pr-4 flex items-center gap-2">
               <Eye className="w-3 h-3 text-slate-400" />
               <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">Review Mode</span>
            </div>
        </div>

        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[76vh] relative overflow-hidden">
          {getActivePdf() ? (
            <iframe 
              src={`${getActivePdf()}#toolbar=0`} 
              className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" 
              key={viewMode} // Forces iframe reload on toggle
              title="Review Viewer" 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-50 rounded-[2.2rem] border-2 border-dashed border-slate-200">
              <FileSearch className="w-12 h-12 text-slate-300 mb-4" />
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">
                {viewMode === 'certificate' ? "Draft Certificate Not Yet Generated" : "Document Not Found"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar pb-10">
        
        {/* 1. NARRATIVE HISTORY */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
           <div className="flex items-center gap-2 mb-6">
             <div className="bg-slate-100 p-2 rounded-lg"><History className="w-4 h-4 text-slate-500" /></div>
             <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900">Process Audit Trail</h3>
           </div>
           <div className="space-y-4">
             {trail.map((note: any, idx: number) => (
               <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 hover:border-blue-500 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100 group-hover:border-blue-500 transition-colors" />
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-black uppercase text-[9px] text-blue-600">
                      {note.role === 'Divisional Deputy Director' ? `Divisional Deputy Director (${note.division})` : note.from}
                    </span>
                    <span className="text-[8px] text-slate-400 font-mono">{note.timestamp ? new Date(note.timestamp).toLocaleString() : 'Pending'}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-blue-50/50 transition-colors relative">
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">"{note.text}"</p>
                    {note.reportUrl && (
                      <button 
                        onClick={() => { setViewMode('report'); }}
                        className="mt-2 inline-flex items-center gap-1 text-[8px] font-bold text-emerald-600 uppercase border border-emerald-100 px-2 py-1 rounded bg-white hover:bg-emerald-50 shadow-sm"
                      >
                        <Eye className="w-2 h-2" /> View Attached Evidence
                      </button>
                    )}
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* 2. ASSIGNMENT BOX */}
        {(isInitialAssignment || isHubStage) && (
          <div className={`p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden transition-all duration-500 ${isHubStage ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="relative z-10">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  {isHubStage ? <Gavel className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isHubStage ? "Delegate to IRSD Vetting" : `Dispatch to ${appDivision} Officer`}
                </h3>
                <div className="space-y-4">
                    <select 
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className={`w-full border border-white/20 p-5 rounded-3xl text-xs font-bold outline-none appearance-none transition-colors ${isHubStage ? 'bg-emerald-700/50 focus:bg-emerald-700' : 'bg-blue-700/50 focus:bg-blue-700'}`}
                    >
                      <option value="" className="text-slate-900">Select Officer...</option>
                      {staffList.filter(s => s.role === 'Staff' && s.division === activeAssignmentDivision).map(s => (
                        <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                      ))}
                    </select>
                    
                    <textarea 
                      value={assignmentRemarks} 
                      onChange={(e) => setAssignmentRemarks(e.target.value)}
                      placeholder={`Provide instructions...`}
                      className={`w-full h-24 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none placeholder:text-white/50 ${isHubStage ? 'bg-emerald-700/30' : 'bg-blue-700/30'}`}
                    />
                    
                    <button onClick={handleAssign} disabled={isPending} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] hover:shadow-2xl transition-all">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto text-blue-600" /> : `Initiate Review`}
                    </button>
                </div>
            </div>
            <Building2 className="absolute -right-4 -bottom-4 w-32 h-32 opacity-10" />
          </div>
        )}

        {/* 3. ENDORSEMENT / FORWARD BOX */}
        {isReviewPhase && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500 mb-4 block ml-2">
                Minute & Endorsement
              </label>
              
              <textarea 
                value={endorsementRemarks} 
                onChange={(e) => setEndorsementRemarks(e.target.value)}
                className="w-full h-32 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 italic outline-none focus:ring-2 focus:ring-blue-500 text-slate-200"
                placeholder="Final minute for this stage..."
              />
              
              <div className="space-y-3">
                <button onClick={handleEndorse} disabled={isPending} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all ${isHubStage ? 'bg-emerald-600 hover:bg-emerald-500' : 'bg-blue-600 hover:bg-blue-500'}`}>
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                    <>{isHubStage ? "Endorse to Director" : "Forward to IRSD Hub"} <ArrowRight className="w-4 h-4" /></>
                  )}
                </button>
                <button type="button" onClick={() => setIsReworkModalOpen(true)} className="w-full py-5 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-800 text-slate-500 hover:text-white hover:border-slate-600 transition-colors">
                  <RotateCcw className="w-3 h-3 inline mr-1" /> Return for Rework
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
        currentStaffId={appDetails.staff_reviewer_id || ""} 
        staffList={staffList} 
        onSuccess={() => { router.push('/dashboard/ddd'); router.refresh(); }} 
      />
    </div>
  );
}