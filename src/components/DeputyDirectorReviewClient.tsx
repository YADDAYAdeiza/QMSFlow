"use client"

import React, { useState, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { 
  FileSearch, ArrowRight, ShieldCheck, Loader2, 
  History, UserPlus, Gavel, FileText, Zap, AlertCircle, ClipboardList,
  Building2, Landmark, Factory, FileCheck, Globe
} from 'lucide-react';
import { approveToDirector, assignToStaff, forwardToHub } from '@/lib/actions/ddd';
import RejectionModal from '@/components/RejectionModal';

export default function DeputyDirectorReviewClient({ app, staffList = [], loggedInUserId }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();
  const [isReworkModalOpen, setIsReworkModalOpen] = useState(false);
  const [showAllStaff, setShowAllStaff] = useState(false);

  const currentActingAs = searchParams.get('as') || 'vmd';

  const [assignmentRemarks, setAssignmentRemarks] = useState(""); 
  const [endorsementRemarks, setEndorsementRemarks] = useState(""); 
  const [selectedStaffId, setSelectedStaffId] = useState("");

  const appDetails = app?.details || {};
  const history = app?.narrativeHistory || [];

  // --- PASS LOGIC START ---
  
  // Identify if we are in Pass 2 (Compliance/Inspection Phase)
  const isPass2 = app?.isComplianceReview === true;
  
  const poaUrl = appDetails?.poaUrl || "";
  const verificationReportUrl = appDetails?.verificationReportUrl || "";
  const inspectionReportUrl = appDetails?.inspectionReportUrl || "";

  // Define which report is relevant for the CURRENT Pass
  // Pass 2 PRIORITIZES Inspection; Pass 1 PRIORITIZES Verification.
  const staffReportUrl = isPass2 ? inspectionReportUrl : verificationReportUrl;
  
  const hasStaffSubmission = !!staffReportUrl;
  
  // Default to showing the report if one has been submitted for this pass
  const [viewMode, setViewMode] = useState<'dossier' | 'report'>(
    hasStaffSubmission ? 'report' : 'dossier'
  );

  const iframeSrc = viewMode === 'report' ? staffReportUrl : poaUrl;

  // --- PASS LOGIC END ---

  const isTechnicalReturn = app?.currentPoint === 'Technical DD Review Return';
  const isIRSDStaffReturn = app?.currentPoint === 'IRSD Staff Vetting Return';
  const isHubEntry = app?.currentPoint === 'IRSD Hub Clearance';
  const isAssignmentPhase = app?.currentPoint === 'Technical DD Review' || isHubEntry;
  const isReviewPhase = isTechnicalReturn || isIRSDStaffReturn;

  const intrinsicLevel = app?.intrinsicLevel || "Low";
  const complianceLevel = app?.complianceLevel;
  const isSRA = appDetails?.is_sra === true;
  const findings = app?.findingsLedger || [];
  const summary = app?.complianceSummary || {};

  const appDivision = appDetails?.division || app?.division || "VMD";
  const activeAssignmentDivision = isHubEntry ? "IRSD" : appDivision;

  const filteredStaff = staffList.filter((s: any) => 
    showAllStaff ? true : s.division?.toUpperCase() === activeAssignmentDivision?.toUpperCase()
  );

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
      if (isTechnicalReturn) {
        result = await forwardToHub(app.id, endorsementRemarks);
      } else if (isIRSDStaffReturn) {
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
      
      {/* VIEWER PANEL */}
      <div className="col-span-7 space-y-4">
        <div className="flex items-center justify-between bg-white p-2 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex gap-1">
                <button 
                  onClick={() => setViewMode('dossier')} 
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                  <FileText className="w-3.5 h-3.5" /> Company Dossier / PoA
                </button>
                {hasStaffSubmission && (
                  <button 
                    onClick={() => setViewMode('report')} 
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase transition-all ${viewMode === 'report' ? 'bg-purple-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-50'}`}
                  >
                    <FileCheck className="w-3.5 h-3.5" /> 
                    {isPass2 ? 'Inspection Report' : 'Verification Report'}
                  </button>
                )}
            </div>

            <div className="flex items-center gap-4 pr-4">
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">SRA Status</span>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase shadow-sm ${isSRA ? 'bg-indigo-50 border-indigo-200 text-indigo-600' : 'bg-slate-50 border-slate-200 text-slate-400'}`}>
                   <Globe className={`w-2.5 h-2.5 ${isSRA ? 'animate-pulse' : ''}`} />
                   {isSRA ? "SRA Facility" : "Non-SRA"}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Intrinsic Risk</span>
                <div className={`px-3 py-1 rounded-full border text-[9px] font-bold uppercase ${getRiskStyles(intrinsicLevel)}`}>
                    {intrinsicLevel}
                </div>
              </div>
              <div className="flex flex-col items-end">
                <span className="text-[7px] font-black text-slate-400 uppercase tracking-tighter">Compliance Status</span>
                <div className={`flex items-center gap-1 px-3 py-1 rounded-full border text-[9px] font-bold uppercase shadow-sm ${complianceLevel ? getRiskStyles(complianceLevel) : 'bg-slate-100 text-slate-400'}`}>
                   {complianceLevel ? <Zap className="w-2.5 h-2.5 fill-current animate-pulse" /> : <AlertCircle className="w-2.5 h-2.5" />}
                   {complianceLevel || "PENDING"}
                </div>
              </div>
            </div>
        </div>

        <div className="bg-white p-3 rounded-[3rem] shadow-2xl border border-slate-200 h-[82vh] relative overflow-hidden">
          {iframeSrc ? (
            <iframe 
              src={`${iframeSrc}#toolbar=0`} 
              className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" 
              key={viewMode} 
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-[2.2rem] text-slate-400 gap-3">
              <FileSearch className="w-12 h-12 opacity-20" />
              <p className="text-xs font-bold uppercase tracking-widest text-center px-10">
                The requested {viewMode === 'report' ? (isPass2 ? 'Inspection Report' : 'Verification Report') : 'PoA/Dossier'} URL is missing.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* ACTION PANEL */}
      <div className="col-span-5 space-y-6 overflow-y-auto max-h-[90vh] pr-2 custom-scrollbar pb-10">
        
        {/* FINDINGS LEDGER */}
        {findings.length > 0 && (
          <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center justify-between">
              <span className="flex items-center gap-2"><ClipboardList className="w-4 h-4 text-rose-500" /> Compliance Findings</span>
              <span className="text-[10px] bg-rose-50 text-rose-600 px-3 py-1 rounded-full font-bold">
                {summary.criticalCount || 0} Critical | {summary.majorCount || 0} Major
              </span>
            </h3>
            <div className="space-y-3">
              {findings.map((f: any, idx: number) => (
                <div key={idx} className="p-4 rounded-2xl bg-slate-50 border border-slate-100 group">
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[8px] font-black uppercase text-slate-400 bg-white px-2 py-1 rounded shadow-sm">
                      {f.system}
                    </span>
                    <span className={`text-[9px] font-black uppercase ${f.severity === 'Critical' ? 'text-rose-600' : 'text-amber-600'}`}>
                      {f.severity}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-700 font-medium italic leading-relaxed">"{f.text}"</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* AUDIT NARRATIVE */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-xl border border-slate-100">
            <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-900 mb-6 flex items-center gap-2">
              <History className="w-4 h-4 text-slate-500" /> Audit Narrative
            </h3>
            <div className="space-y-4">
              {[...history].reverse().map((note: any, idx: number) => (
                <div key={idx} className="group relative pl-6 border-l-2 border-slate-100 pb-2">
                   <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-white border-4 border-slate-100" />
                   <div className="flex justify-between items-center mb-1 font-mono text-[8px] text-slate-400 uppercase font-black">
                     <span>{note?.from === 'DDD' ? 'Divisional Deputy Director' : note?.from}</span>
                     <span>{note?.timestamp ? new Date(note.timestamp).toLocaleTimeString() : ''}</span>
                   </div>
                   <div className="p-4 rounded-2xl bg-slate-50">
                     <p className="text-[11px] text-slate-600 italic leading-relaxed">"{note?.text}"</p>
                   </div>
                </div>
              ))}
            </div>
        </div>

        {/* ASSIGNMENT BOX */}
        {isAssignmentPhase && (
          <div className={`p-8 rounded-[2.5rem] shadow-xl text-white transition-all duration-500 ${isHubEntry ? 'bg-emerald-600' : 'bg-blue-600'}`}>
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                {isHubEntry ? <Gavel className="w-4 h-4" /> : <UserPlus className="w-4 h-4" />}
                {isHubEntry ? "Hub Delegation (IRSD)" : "Technical Assignment"}
              </h3>
              <button 
                onClick={() => setShowAllStaff(!showAllStaff)}
                className="text-[8px] font-bold bg-white/10 hover:bg-white/20 px-3 py-1 rounded-full transition-colors"
              >
                {showAllStaff ? "Reset Filter" : "Show All Divisions"}
              </button>
            </div>
            
            <div className="space-y-4">
              <select 
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full bg-black/20 border border-white/20 p-5 rounded-3xl text-xs font-bold text-white outline-none cursor-pointer appearance-none"
              >
                <option value="" className="text-slate-900">
                  Select {isHubEntry ? 'IRSD' : activeAssignmentDivision} Officer ({filteredStaff.length} available)
                </option>
                {filteredStaff.map((s: any) => (
                  <option key={s.id} value={s.id} className="text-slate-900">
                    {s.name} {showAllStaff ? `(${s.division})` : ''}
                  </option>
                ))}
              </select>

              <textarea 
                value={assignmentRemarks} 
                onChange={(e) => setAssignmentRemarks(e.target.value)}
                placeholder="Specific instructions for vetting..."
                className="w-full h-24 bg-black/10 border border-white/10 rounded-2xl p-4 text-xs text-white outline-none placeholder:text-white/40"
              />
              <button onClick={handleAssign} disabled={isPending || !selectedStaffId} className="w-full py-5 bg-white text-slate-900 rounded-3xl font-black uppercase text-[10px] disabled:opacity-50 transition-all hover:bg-slate-100 active:scale-95">
                {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : `Dispatch for Vetting`}
              </button>
            </div>
          </div>
        )}

        {/* FORWARDING BOX */}
        {isReviewPhase && (
          <div className="bg-slate-900 p-8 rounded-[3rem] text-white shadow-2xl border border-slate-800">
            <div className="flex items-center gap-2 mb-4 ml-2">
                {isTechnicalReturn ? <Building2 className="w-4 h-4 text-blue-400" /> : <ShieldCheck className="w-4 h-4 text-emerald-400" />}
                <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                    {isTechnicalReturn ? "Forward to DD(IRSD)" : "Final Hub Concurrence"}
                </label>
            </div>
            <textarea 
              value={endorsementRemarks} 
              onChange={(e) => setEndorsementRemarks(e.target.value)}
              className="w-full h-32 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 italic outline-none text-slate-200"
              placeholder={isTechnicalReturn ? "Notes for Hub Clearance..." : "Final concurrence for the Director..."}
            />
            <div className="space-y-3">
              <button onClick={handleEndorse} disabled={isPending} className={`w-full py-5 rounded-[2rem] font-black uppercase text-[11px] flex items-center justify-center gap-3 transition-all active:scale-95 ${isTechnicalReturn ? 'bg-blue-600 hover:bg-blue-700' : 'bg-emerald-600 hover:bg-emerald-700'}`}>
                {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                  <>
                    {isTechnicalReturn ? 'Send to Hub' : 'Approve to Director'} 
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
              <button type="button" onClick={() => setIsReworkModalOpen(true)} className="w-full py-5 rounded-[2rem] font-black uppercase text-[10px] border-2 border-slate-800 text-slate-500 hover:text-white transition-colors">
                Return to Staff for Correction
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
        onSuccess={() => { 
          router.push(`/dashboard/ddd?as=${currentActingAs.toLowerCase()}`); 
          router.refresh(); 
        }} 
      />
    </div>
  );
}