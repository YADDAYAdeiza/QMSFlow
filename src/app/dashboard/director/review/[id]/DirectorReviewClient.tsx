"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { 
  ShieldCheck, FileText, CheckCircle2, XCircle, AlertTriangle, 
  Loader2, MessageSquare, Award, ClipboardList, RotateCcw 
} from 'lucide-react';

// Actions
import { issueFinalClearance, rejectAndIssueCAPA } from '@/lib/actions/director';
// ✅ Import updated return action (using the relative path you specified)
import { returnToStaff } from '@/lib/actions/ddd'; 

// Document Templates
import { CapaLetter } from "@/components/documents/CapaLetter"; 
import { GmpCertificate } from "@/components/documents/GmpCertificate";
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";

// Components
import { supabase } from "@/lib/supabase";
import AuditTrail from "@/components/AuditTrail";
import RejectionModal from "@/components/RejectionModal";

export default function DirectorReviewClient({ app, usersList }: { app: any, usersList: any[] }) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  // --- 1. DATA EXTRACTION ---
  const fullTrail = Array.isArray(app.commentsTrail) ? app.commentsTrail : [];
  
  // ✅ FIX: In App 88, we look for the last staff technical review submission
  const latestSubmission = [...fullTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_TO_DDD");

  const technicalCapas = latestSubmission?.observations?.capas || [];
  const appType = app.type || "";

  // QMS Check: Resolve Critical/Major deficiencies before final sign-off
  const hasCriticalFindings = technicalCapas.some((c: any) => 
    ["Critical", "Major"].includes(c.classification)
  );

  const isFacilityVerification = appType.includes("Facility Verification");
  const pdfUrl = app.details?.technicalReportUrl || app.details?.inspectionReportUrl || app.details?.poaUrl || "";
  const sanitize = (str: string) => str?.replace(/[^a-z0-9]/gi, '_').toUpperCase() || "UNKNOWN";

  // --- 2. HANDLERS ---

  const handleRejectWithCapa = async () => {
    if (!remarks.trim()) return alert("Director: Executive remarks are required for CAPA issuance.");
    setProcessing(true);
    try {
      const formattedObservations = technicalCapas.map((c: any) => ({
        severity: c.classification,
        finding: c.deficiency,
      }));

      const blob = await pdf(
        <CapaLetter 
          data={{
            appNumber: app.applicationNumber,
            date: new Date().toLocaleDateString('en-GB'),
            companyName: app.company?.name,
            companyAddress: app.details?.factory_address || app.company?.address
          }} 
          observations={formattedObservations} 
        />
      ).toBlob();

      // QMS Requirement: Store in 'Documents' bucket as per Saved Info
      const path = `${sanitize(app.company?.name)}/${sanitize(app.applicationNumber)}/CAPA/CAPA_LETTER_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('documents').upload(path, blob);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      startTransition(async () => {
        // This action closes the 'Director Review' or 'Director Final Review' QMS clock
        const res = await rejectAndIssueCAPA(app.id, remarks, publicUrl);
        if (res.success) { router.push('/dashboard/director'); router.refresh(); }
      });
    } catch (err: any) {
      alert("System Error: " + err.message);
    } finally { setProcessing(false); }
  };

  const handleApprove = async () => {
    if (!remarks.trim()) return alert("QMS Requirement: Executive concurrence remarks required.");
    if (hasCriticalFindings) return alert("Workflow Blocked: Resolve Critical/Major deficiencies via CAPA or Rework.");

    setProcessing(true);
    try {
      let documentBlob;
      let folderName = isFacilityVerification ? "CLEARANCE" : "CERTIFICATE";
      let filePrefix = isFacilityVerification ? "GMP_CLEARANCE" : "GMP_CERT";

      const templateData = {
        appNumber: app.applicationNumber,
        companyName: app.company?.name,
        factoryName: app.details?.factory_name || app.company?.name,
        factoryAddress: app.details?.factory_address || app.company?.address,
        date: new Date().toLocaleDateString('en-GB'),
        expiryDate: new Date(new Date().setFullYear(new Date().getFullYear() + 2)).toLocaleDateString('en-GB')
      };

      if (isFacilityVerification) {
        documentBlob = await pdf(<ClearanceLetter data={templateData} />).toBlob();
      } else {
        documentBlob = await pdf(<GmpCertificate data={templateData} />).toBlob();
      }

      const path = `${sanitize(app.company?.name)}/${sanitize(app.applicationNumber)}/${folderName}/${filePrefix}_${Date.now()}.pdf`;
      const { error } = await supabase.storage.from('documents').upload(path, documentBlob);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      startTransition(async () => {
        const res = await issueFinalClearance(app.id, remarks, publicUrl);
        if (res.success) { router.push('/dashboard/director'); router.refresh(); }
      });
    } catch (err: any) {
      alert("System Error: " + err.message);
    } finally { setProcessing(false); }
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* LEFT: TECHNICAL PREVIEW */}
      <div className="w-1/2 h-full border-r border-slate-200 p-6">
        <div className="bg-white rounded-[2rem] shadow-2xl border border-slate-200 h-full overflow-hidden">
          {pdfUrl ? (
            <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" />
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-slate-300 italic text-xs">
               <FileText className="w-12 h-12 opacity-10 mb-2" />
               Technical Dossier / Report Not Available
            </div>
          )}
        </div>
      </div>

      {/* RIGHT: EXECUTIVE PANEL */}
      <div className="w-1/2 h-full p-8 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-4xl font-black text-slate-900 tracking-tighter uppercase italic">#{app.applicationNumber}</h1>
              <p className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">{appType}</p>
            </div>
            <button 
              onClick={() => setIsReturnModalOpen(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-[10px] font-black uppercase transition-all shadow-sm"
            >
              <RotateCcw className="w-3 h-3" /> Return for Rework
            </button>
          </div>

          {/* DIVISIONAL RECOMMENDATION (LATEST FROM IRSD HUB) */}
          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden">
             <div className="relative z-10">
               <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-blue-100 mb-3 flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4" /> Divisional Deputy Director Minute
               </h3>
               <p className="text-lg font-bold italic leading-relaxed">"{app.dddInstruction}"</p>
             </div>
             <ShieldCheck className="absolute -bottom-6 -right-6 w-40 h-40 text-blue-500 opacity-20 rotate-12" />
          </div>

          {/* TECHNICAL SUMMARY TABLE */}
          <div className="space-y-4">
            <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
              <ClipboardList className="w-4 h-4" /> Technical Findings
            </h3>
            <div className="bg-white border border-slate-200 rounded-[2rem] overflow-hidden shadow-sm">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-100">
                  <tr>
                    <th className="px-6 py-3 font-black uppercase text-[9px] text-slate-500 tracking-wider">Severity</th>
                    <th className="px-6 py-3 font-black uppercase text-[9px] text-slate-500 tracking-wider">Finding</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {technicalCapas.length > 0 ? technicalCapas.map((c: any, i: number) => (
                    <tr key={i} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <span className={`px-2 py-1 rounded-md text-[8px] font-black uppercase ${
                          c.classification === 'Critical' ? 'bg-rose-100 text-rose-600' :
                          c.classification === 'Major' ? 'bg-orange-100 text-orange-600' :
                          'bg-blue-100 text-blue-600'
                        }`}>
                          {c.classification}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-slate-600 italic leading-relaxed">{c.deficiency}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={2} className="px-6 py-10 text-center text-slate-400 italic text-xs">No technical deficiencies found. Proceed with approval.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* INTERNAL NARRATIVE TRAIL */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400 px-2 flex items-center gap-2">
                <MessageSquare className="w-4 h-4" /> Audit Trail & Comments
             </h3>
             <div className="space-y-3">
               {fullTrail.slice().reverse().map((c: any, i: number) => (
                  <div key={i} className={`p-5 rounded-[2rem] border transition-all ${c.role === 'Divisional Deputy Director' ? 'bg-blue-50 border-blue-100' : 'bg-white border-slate-100'}`}>
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-[9px] font-black uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-500">{c.role}</span>
                      <span className="text-[8px] text-slate-400 font-mono">{new Date(c.timestamp).toLocaleString()}</span>
                    </div>
                    <p className="text-xs text-slate-700 italic leading-relaxed">"{c.text}"</p>
                  </div>
               ))}
             </div>
          </div>

          {/* FINAL DECISION ENGINE */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl sticky bottom-0 border-t border-slate-800">
            <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-blue-400 mb-6 flex items-center gap-2">
              <Award className="w-4 h-4" /> Executive Verdict
            </h3>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-32 bg-slate-800 border-none rounded-3xl p-6 text-sm italic text-slate-200 outline-none focus:ring-2 focus:ring-blue-500 mb-8 resize-none shadow-inner"
              placeholder="Enter final executive remarks..."
            />
            <div className="grid grid-cols-2 gap-4">
              <button 
                onClick={handleApprove} 
                disabled={isPending || processing || hasCriticalFindings} 
                className={`py-5 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all 
                  ${hasCriticalFindings ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg active:scale-95'}`}
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : (
                   <><CheckCircle2 className="w-4 h-4" /> Issue {isFacilityVerification ? 'Clearance' : 'Certificate'}</>
                )}
              </button>
              <button 
                onClick={handleRejectWithCapa} 
                disabled={isPending || processing} 
                className="py-5 bg-rose-600 hover:bg-rose-500 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg shadow-rose-900/20"
              >
                {processing ? <Loader2 className="w-4 h-4 animate-spin" /> : <><XCircle className="w-4 h-4" /> Reject & CAPA</>}
              </button>
            </div>
            {hasCriticalFindings && (
              <p className="text-[9px] text-rose-400 mt-4 text-center font-bold uppercase tracking-widest italic animate-pulse">
                * Workflow Alert: Resolve Critical deficiencies via CAPA or Rework before signing.
              </p>
            )}
          </div>
        </div>
      </div>

      {/* RE-INITIALIZED RETURN MODAL */}
      <RejectionModal 
        isOpen={isReturnModalOpen}
        onClose={() => setIsReturnModalOpen(false)}
        appId={app.id}
        currentDDId={app.assignedToId} // QMS: This stops the Director's clock
        staffList={usersList}
        onSuccess={() => {
          setIsReturnModalOpen(false);
          router.push('/dashboard/director');
          router.refresh();
        }}
      />
    </div>
  );
}