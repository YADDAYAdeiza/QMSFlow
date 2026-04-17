"use client"

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileSearch, ArrowRight, ShieldCheck, Loader2, 
  History, UserPlus, Gavel, FileText, Zap, AlertCircle, ClipboardList,
  Building2, FileCheck, Globe, Diff
} from 'lucide-react';
import { approveToDirector, assignToStaff, forwardToHub } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

export default function DeputyDirectorReviewClient({ app, staffList = [], loggedInUserId }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [showAllStaff, setShowAllStaff] = useState(false);
  
  // State for the Delta/Comparison feature
  const [showDelta, setShowDelta] = useState(false);

  const currentActingAs = searchParams.get('as') || 'vmd';

  const [assignmentRemarks, setAssignmentRemarks] = useState(""); 
  const [endorsementRemarks, setEndorsementRemarks] = useState(""); 
  const [selectedStaffId, setSelectedStaffId] = useState("");

  // Extract from your specific JSON structure
  const appDetails = app?.details || {};
  const comments = appDetails?.comments || [];
  
  // Identify the last "Rework" snapshot to compare against
  const lastRework = [...comments].reverse().find(c => c.action === "REWORK_REQUIRED");

  const isPass2 = app?.isComplianceReview === true;
  const staffReportUrl = isPass2 ? appDetails?.inspectionReportUrl : appDetails?.verificationReportUrl;
  const poaUrl = appDetails?.poaUrl || "";
  const hasStaffSubmission = !!staffReportUrl;
  
  const [viewMode, setViewMode] = useState<'dossier' | 'report'>(
    hasStaffSubmission ? 'report' : 'dossier'
  );

  const iframeSrc = viewMode === 'report' ? staffReportUrl : poaUrl;

  // Workflow Points
  const isTechnicalReview = app?.currentPoint === 'Staff Technical Review' || app?.currentPoint === 'Technical DD Review';
  const isHubReview = app?.currentPoint === 'IRSD Staff Vetting' || app?.currentPoint === 'IRSD Hub Clearance';
  
  // Logic for showing assignment vs endorsement
  const isAssignmentPhase = app?.status === 'PENDING' || app?.status === 'HUB_ASSIGNMENT';
  const isReviewPhase = app?.status === 'PENDING_REWORK' || app?.status === 'HUB_VETTING_REWORK' || app?.status === 'SUBMITTED_FOR_REVIEW';

  const intrinsicLevel = app?.intrinsicLevel || "Low";
  const complianceLevel = app?.complianceLevel;
  const isSRA = appDetails?.is_sra === true;
  
  // Current Live Ledger
  const currentFindings = appDetails?.findings_ledger || [];
  // Snapshot Findings from the last rejection
  const rejectedFindings = lastRework?.frozenFindings || [];

  const handleAssign = async () => {
    if (!selectedStaffId) return alert(`Please select an officer.`);
    startTransition(async () => {
      const res = await assignToStaff(app.id, selectedStaffId, assignmentRemarks);
      if (res.success) { 
        router.push(`/dashboard/ddd?as=${currentActingAs.toLowerCase()}`); 
        router.refresh(); 
      }
    });
  };

  const handleEndorse = async () => {
    if (!endorsementRemarks.trim()) return alert("Concurrence notes required.");
    startTransition(async () => {
      let result;
      // Use your specific logic to route to Hub or Director
      if (currentActingAs.toLowerCase() === 'vmd') {
        result = await forwardToHub(app.id, endorsementRemarks);
      } else {
        result = await approveToDirector(app.id, endorsementRemarks, loggedInUserId);
      }
      if (result?.success) { 
        router.push(`/dashboard/ddd?as=${currentActingAs.toLowerCase()}`); 
        router.refresh(); 
      }
    });
  };

  const getRiskStyles = (level: string) => {
    if (level === 'High') return 'bg-rose-50 border-rose-200 text-rose-600';
    if (level === 'Medium') return 'bg-amber-50 border-amber-200 text-amber-600';
    return 'bg-emerald-50 border-emerald-200 text-emerald-600';
  };

  return (
    <div className="grid grid-cols-12 gap-6 p-8 bg-slate-50 min-h-screen font-sans">
      
      {/* LEFT: VIEWER PANEL */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode('dossier')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> Company Dossier
                </button>
                {hasStaffSubmission && (
                  <button 
                    onClick={() => setViewMode('report')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'report' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> Staff Submission
                  </button>
                )}
            </div>

            <div className="flex items-center gap-4 pr-4">
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">SRA</span>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase shadow-sm ${isSRA ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                   {isSRA ? "SRA" : "NON-SRA"}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Intrinsic Risk</span>
                <div className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase ${getRiskStyles(intrinsicLevel)}`}>
                    {intrinsicLevel}
                </div>
              </div>
            </div>
        </div>

        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[82vh] relative">
          <iframe 
            src={`${iframeSrc}#toolbar=0`} 
            className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" 
            key={viewMode} 
          />
        </div>
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar pb-10">
        
        {/* COMPLIANCE FINDINGS LEDGER WITH DELTA TOGGLE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-rose-500" /> 
              {showDelta ? "Snapshot: Rejected Findings" : "Current Compliance Findings"}
            </h3>
            
            {/* DELTA BUTTON: Only shows if there was a previous rejection */}
            {lastRework && (
              <button 
                onClick={() => setShowDelta(!showDelta)}
                className={`text-[9px] font-bold px-3 py-1.5 rounded-full border flex items-center gap-2 transition-all shadow-sm ${showDelta ? 'bg-amber-500 border-amber-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
              >
                <Diff className="w-3.5 h-3.5" /> 
                {showDelta ? "View Current" : "Compare Changes"}
              </button>
            )}
          </div>

          <div className="space-y-3">
            {(showDelta ? rejectedFindings : currentFindings).map((f: any, idx: number) => (
              <div key={idx} className={`p-4 rounded-2xl border transition-all ${showDelta ? 'bg-amber-50/50 border-amber-200 opacity-80' : 'bg-slate-50 border-slate-100 shadow-sm'}`}>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-[8px] font-black uppercase text-slate-400 bg-white px-2 py-1 rounded shadow-sm border border-slate-50">
                    {f.system}
                  </span>
                  <span className={`text-[9px] font-black uppercase ${f.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                    {f.severity}
                  </span>
                </div>
                <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed">
                   {showDelta && <span className="text-amber-600 font-bold mr-1">[PREVIOUS]</span>}
                   "{f.text}"
                </p>
              </div>
            ))}
            
            {!showDelta && currentFindings.length === 0 && (
              <p className="text-[10px] text-slate-400 italic text-center py-4 bg-slate-50 rounded-2xl">No findings recorded in current version.</p>
            )}

            {showDelta && rejectedFindings.length === 0 && (
              <p className="text-[10px] text-amber-600 italic text-center py-4 bg-amber-50 rounded-2xl">No findings existed in the rejected version.</p>
            )}
          </div>
        </div>

        {/* AUDIT NARRATIVE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" /> Minute History
            </h3>
            <div className="space-y-4">
              {[...comments].reverse().map((note: any, idx: number) => (
                <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 pb-2">
                   <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100" />
                   <div className="flex justify-between items-center mb-1 font-mono text-[8px] text-slate-400 uppercase font-black">
                     <span>{note?.from} ({note?.role || 'User'})</span>
                     <span>{note?.timestamp ? new Date(note.timestamp).toLocaleTimeString() : ''}</span>
                   </div>
                   <div className={`p-4 rounded-2xl ${note.action === 'REWORK_REQUIRED' ? 'bg-rose-50 border border-rose-100' : 'bg-slate-50 border border-slate-100'}`}>
                     <p className={`text-[11px] leading-relaxed ${note.action === 'REWORK_REQUIRED' ? 'text-rose-700 font-bold' : 'text-slate-600'}`}>
                       "{note?.text}"
                     </p>
                     {note.action === 'REWORK_REQUIRED' && (
                       <div className="mt-2 text-[8px] font-black text-rose-400 uppercase flex items-center gap-1">
                          <AlertCircle className="w-3 h-3" /> Findings snapshotted for comparison
                       </div>
                     )}
                   </div>
                </div>
              ))}
            </div>
        </div>

        {/* ACTION BOX: ASSIGNMENT */}
        {isAssignmentPhase && (
          <div className={`p-8 rounded-[2.5rem] shadow-xl text-white bg-blue-600`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                <UserPlus className="w-4 h-4" /> Technical Assignment
              </h3>
              <button 
                onClick={() => setShowAllStaff(!showAllStaff)}
                className="text-[8px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
              >
                {showAllStaff ? "Reset" : "Show All Divisions"}
              </button>
            </div>
            
            <div className="space-y-4">
              <select 
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-black/20 border border-white/20 p-5 rounded-3xl text-xs font-bold text-white outline-none cursor-pointer appearance-none"
              >
                <option value="" className="text-slate-900">Select Officer...</option>
                {staffList.filter((s: any) => showAllStaff || s.division?.toUpperCase() === currentActingAs.toUpperCase()).map((s: any) => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.name} ({s.division})
                  </option>
                ))}
              </select>

              <textarea 
                value={assignmentRemarks} 
                onChange={(e) => setAssignmentRemarks(e.target.value)}
                placeholder="Directives for the officer..."
                className="w-full h-24 bg-black/10 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none placeholder:text-white/40"
              />
              <button onClick={handleAssign} disabled={isPending || !selectedStaffId} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] shadow-lg flex items-center justify-center">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Dispatch File"}
              </button>
            </div>
          </div>
        )}

        {/* ACTION BOX: ENDORSEMENT / RETURN */}
        {isReviewPhase && (
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4 ml-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    Directorate Concurrence
                </label>
            </div>
            <textarea 
              value={endorsementRemarks} 
              onChange={(e) => setEndorsementRemarks(e.target.value)}
              className="w-full h-32 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 italic outline-none text-slate-200"
              placeholder="Final minute before sign-off..."
            />
            <div className="space-y-3">
              <button onClick={handleEndorse} disabled={isPending} className="w-full py-5 rounded-[2rem] font-black uppercase text-[11px] flex items-center justify-center gap-3 bg-emerald-600 hover:bg-emerald-700 shadow-xl transition-all">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Approve & Forward <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button 
                type="button" 
                onClick={() => setIsReworkModalOpen(true)} 
                className="w-full py-5 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-800 text-slate-500 hover:text-white hover:border-rose-500 transition-all"
              >
                Return for Correction
              </button>
            </div>
          </div>
        )}
      </div>

      {/* MODAL FOR RETURNING TO STAFF */}
      <RejectionModal 
        isOpen={isReworkModalOpen} 
        onClose={() => setIsReworkModalOpen(false)} 
        appId={app.id} 
        currentDDId={loggedInUserId} 
        currentStaffId={app?.assignedToId} 
        staffList={staffList} 
        onSuccess={() => { 
          router.push(`/dashboard/ddd?as=${currentActingAs.toLowerCase()}`); 
          router.refresh(); 
        }} 
      />
    </div>
  );
}