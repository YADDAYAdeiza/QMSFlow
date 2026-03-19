"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { 
  FileSearch, ArrowRight, ShieldCheck, Loader2, 
  History, UserPlus, Gavel, FileText, Eye, Zap, AlertCircle, ClipboardList
} from 'lucide-react';
import { approveToDirector, assignToStaff } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

export default function DeputyDirectorReviewClient({ app, staffList, pdfUrl, loggedInUserId }: any) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);

  const [assignmentRemarks, setAssignmentRemarks] = useState(""); 
  const [endorsementRemarks, setEndorsementRemarks] = useState(""); 
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const appDetails = app?.details || {};
  const history = app?.narrativeHistory || [];

  // Risk & Findings Logic
  const intrinsicLevel = app?.intrinsicLevel || "Low";
  const complianceLevel = app?.complianceLevel;
  const findings = app?.findingsLedger || [];
  const summary = app?.complianceSummary || {};

  const dossierUrl = appDetails?.poaUrl || "";
  const staffReportUrl = pdfUrl; 

  const hasStaffSubmission = !!(appDetails?.verificationReportUrl || appDetails?.technicalAssessmentUrl);
  const [viewMode, setViewMode] = useState<'dossier' | 'report'>(hasStaffSubmission ? 'report' : 'dossier');

  const isInitialAssignment = app?.currentPoint === 'Technical DD Review';
  const isHubStage = app?.currentPoint === 'IRSD Hub Clearance';
  const isReviewPhase = app?.currentPoint === 'Technical DD Review Return' || isHubStage;
  
  const appDivision = Array.isArray(appDetails?.assignedDivisions) ? appDetails.assignedDivisions[0] : (appDetails?.division || "VMD");
  const activeAssignmentDivision = isHubStage ? "IRSD" : appDivision;

  const getRiskStyles = (level: string) => {
    if (level === 'High') return 'bg-rose-50 border-rose-200 text-rose-600';
    if (level === 'Medium') return 'bg-amber-50 border-amber-200 text-amber-600';
    return 'bg-emerald-50 border-emerald-200 text-emerald-600';
  };

  const handleAssign = async () => {
    if (!selectedStaffId) return alert(`Please select an officer.`);
    startTransition(async () => {
      const res = await assignToStaff(app.id, selectedStaffId, assignmentRemarks);
      if (res.success) { router.push('/dashboard/ddd'); router.refresh(); }
    });
  };

  const handleEndorse = async () => {
    if (!endorsementRemarks.trim()) return alert("Concurrence notes required.");
    startTransition(async () => {
      const result = await approveToDirector(app.id, endorsementRemarks, loggedInUserId);
      if (result.success) { router.push('/dashboard/ddd'); router.refresh(); }
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
                    <ShieldCheck className="w-3.5 h-3.5" /> Staff Assessment
                  </button>
                )}
            </div>

            <div className="flex items-center gap-4 pr-4">
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Baseline</span>
                <div className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase ${getRiskStyles(intrinsicLevel)}`}>
                   {intrinsicLevel}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Compliance</span>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase shadow-sm ${complianceLevel ? getRiskStyles(complianceLevel) : 'bg-slate-100 text-slate-400'}`}>
                   {complianceLevel ? <Zap className="w-2.5 h-2.5 fill-current animate-pulse" /> : <AlertCircle className="w-2.5 h-2.5" />}
                   {complianceLevel || "PENDING"}
                </div>
              </div>
            </div>
        </div>

        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[82vh] relative overflow-hidden">
          <iframe 
            src={`${viewMode === 'report' ? staffReportUrl : dossierUrl}#toolbar=0`} 
            className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" 
            key={viewMode} 
          />
        </div>
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar pb-10">
        
        {/* FINDINGS EVIDENCE BOX */}
        {findings.length > 0 && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-rose-500" /> Compliance Findings</span>
              <span className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1 rounded-full">
                {summary.criticalCount} Critical | {summary.majorCount} Major
              </span>
            </h3>
            <div className="space-y-3">
              {findings.map((f: any) => (
                <div key={f.id} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black uppercase text-slate-400 bg-white px-2 py-1 rounded shadow-sm">
                      {f.system}
                    </span>
                    <span className={`text-[9px] font-black uppercase ${f.classification === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {f.classification}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed">"{f.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* NARRATIVE HISTORY */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
           <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
             <History className="w-4 h-4 text-slate-500" /> Audit Narrative
           </h3>
           <div className="space-y-4">
             {[...history].reverse().map((note: any, idx: number) => (
               <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 pb-2">
                  <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100" />
                  <div className="flex justify-between items-center mb-1 font-mono text-[8px] text-slate-400 uppercase font-black">
                    <span>{note?.from}</span>
                    <span>{note?.timestamp ? new Date(note.timestamp).toLocaleTimeString() : ''}</span>
                  </div>
                  <div className="p-4 rounded-2xl bg-slate-50 group-hover:bg-blue-50 transition-colors">
                    <p className="text-[11px] text-slate-600 italic leading-relaxed">"{note?.text}"</p>
                  </div>
               </div>
             ))}
           </div>
        </div>

        {/* ASSIGNMENT BOX */}
        {(isInitialAssignment || isHubStage) && (
          <div className={`p-8 rounded-[2.5rem] shadow-xl text-white relative overflow-hidden transition-all duration-500 ${isHubStage ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="relative z-10">
                <h3 className="text-[11px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
                  {isHubStage ? <Gavel className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                  {isHubStage ? "Hub Delegation" : "Dispatch to Staff"}
                </h3>
                <div className="space-y-4">
                    <select 
                      value={selectedStaffId}
                      onChange={(e) => setSelectedStaffId(e.target.value)}
                      className="w-full bg-white/20 border border-white/20 p-5 rounded-3xl text-xs font-bold outline-none appearance-none text-white"
                    >
                      <option value="" className="text-slate-900">Select Officer...</option>
                      {staffList.filter((s: any) => s.role === 'Staff' && s.division === activeAssignmentDivision).map((s: any) => (
                        <option key={s.id} value={s.id} className="text-slate-900">{s.name}</option>
                      ))}
                    </select>
                    <textarea 
                      value={assignmentRemarks} 
                      onChange={(e) => setAssignmentRemarks(e.target.value)}
                      placeholder="Enter specific instructions..."
                      className="w-full h-24 bg-white/10 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none placeholder:text-white/50"
                    />
                    <button onClick={handleAssign} disabled={isPending} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] hover:shadow-2xl transition-all">
                      {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Execute Assignment`}
                    </button>
                </div>
            </div>
          </div>
        )}

        {/* EXECUTIVE CONCURRENCE */}
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
              <button onClick={handleEndorse} disabled={isPending} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 transition-all ${isHubStage ? 'bg-emerald-600' : 'bg-blue-600'}`}>
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
        staffList={staffList} 
        onSuccess={() => { router.push('/dashboard/ddd'); router.refresh(); }} 
      />
    </div>
  );
}