"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { 
  Loader2, RotateCcw, ShieldCheck, 
  FileText, CheckCircle2, FileSearch, AlertTriangle, ShieldAlert, CheckCircle, Cpu, Play, Calendar, DollarSign, Sparkles
} from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { ClearanceLetterAMS } from "@/components/documents/ClearanceLetter-AMS";
import { GmpCertificate } from "@/components/documents/GmpCertificate";
import { createClient } from "@/utils/supabase/client";
import RejectionModal from "@/components/RejectionModal";
import { RiskExecutiveSummary } from "@/components/analytics/RiskExecutiveSummary";
import { executeForensicAuditAction } from "@/lib/actions/forensicAction";

const supabase = createClient();

export default function DirectorReviewClient({ app, usersList, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'dossier' | 'draft' | 'preview'>('dossier');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  
  // --- ON-DEMAND FORENSIC STATES ---
  const [isAuditing, setIsAuditing] = useState(false);
  const [forensicResult, setForensicResult] = useState<any>(null);
  const [auditAttempted, setAuditAttempted] = useState(false);

  // --- TOGGLE INJECTION STATE (Defaults to false, using human date) ---
  const [isInjected, setIsInjected] = useState(false);

  const router = useRouter();

  const details = app.details || {};
  const isInspection = app.isInspection;
  const docTitle = app.docTitle;

  const handleRunAudit = async () => {
    setIsAuditing(true);
    setAuditAttempted(true);
    try {
      const result = await executeForensicAuditAction(details);
      setForensicResult(result);
    } catch (err) {
      console.error("Forensic audit execution failed:", err);
    } finally {
      setIsAuditing(false);
    }
  };

  const complianceRisk = useMemo(() => {
    const baseRisk = app?.complianceRisk || {};
    const ledger = details.findings_ledger || [];
    const summarySource = details.compliance_summary || baseRisk.summary || {};

    return {
      ...baseRisk,
      summary: {
        criticalCount: summarySource.criticalCount ?? 0,
        majorCount: summarySource.majorCount ?? 0,
        otherCount: summarySource.otherCount ?? 0,
      },
      findings: baseRisk.findings?.length > 0 ? baseRisk.findings : ledger,
      intrinsicLevel: baseRisk.intrinsicLevel || details.intrinsic_level || "N/A",
      overallRating: baseRisk.overallRating || details.overall_risk_rating || "N/A",
      isSra: baseRisk.isSra ?? (details.sra_status === "TRUE" || details.is_sra === true)
    };
  }, [app, details]);

  const trail = useMemo(() => {
    const comments = details.comments || [];
    return [...comments].map(c => ({
      ...c,
      roleDisplay: (c.role === "DDD" || c.role === "Divisional Deputy Director") 
        ? "Divisional Deputy Director" 
        : (c.role === "Director" ? "Executive Director" : c.role)
    })).reverse();
  }, [details.comments]);

  const docConfig = useMemo(() => {
    const appNumber = app.applicationNumber;
    const date = new Date().toLocaleDateString('en-GB');

    const factory = details.facilityName || details.factory_name || "N/A";
    const address = details.facilityAddress || details.factory_address || "N/A";
    const rawLines = details.productLines || [];

    const manualPaymentDate = details.fullPaymentDate;
    const aiPaymentDate = forensicResult?.fullPaymentDate;
    const aiExpiryDate = forensicResult?.expiryDate;

    let fullPaymentDate = undefined;
    let expiryDate = undefined;
    let isDeskReview = false;

    // OVERRIDE LOGIC: If toggle is ON and AI result exists, AI overrides. Otherwise, defaults to human input.
    if (isInjected && aiPaymentDate) {
      fullPaymentDate = aiPaymentDate;
      expiryDate = aiExpiryDate;
      isDeskReview = true;
    } else if (manualPaymentDate) {
      const parsedDate = new Date(manualPaymentDate);
      fullPaymentDate = !isNaN(parsedDate.getTime()) 
        ? parsedDate.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
        : manualPaymentDate;

      const expiryObj = new Date(manualPaymentDate);
      expiryObj.setFullYear(expiryObj.getFullYear() + 3);
      expiryDate = expiryObj.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      isDeskReview = true;
    }

    if (isInspection) {
      const certData = {
        appNumber,
        date,
        facilityName: factory,
        facilityAddress: address,
        productLines: rawLines.map((line: any) => ({
          lineName: line.lineName,
          riskCategory: line.riskCategory || complianceRisk.overallRating || "Compliant"
        }))
      };
      return { component: <GmpCertificate data={certData} userRole="Director" />, prefix: "GMP_CERTIFICATE" };
    } else {
      const flatProducts = rawLines.flatMap((line: any) => 
        (line.products || []).map((p: any) => p.name)
      );

      const clearanceData = {
        appNumber,
        date,
        factoryName: factory,
        factoryAddress: address,
        localApplicantName: details.companyName || "N/A",
        localApplicantAddress: details.companyAddress || "N/A",
        products: flatProducts.length > 0 ? flatProducts : (details.products || []),
        isDeskReview,
        fullPaymentDate,
        expiryDate
      };

      const isAdditionalSite = details.siteScope === "Additional Manufacturing Site";
      const SelectedComponent = isAdditionalSite ? ClearanceLetterAMS : ClearanceLetter;

      return { 
        component: <SelectedComponent data={clearanceData} userRole="Director" />, 
        prefix: isAdditionalSite ? "GMP_CLEARANCE_AMS" : "GMP_CLEARANCE" 
      };
    }
  }, [app, details, isInspection, complianceRisk, forensicResult, isInjected]);

  const iframeSrc = useMemo(() => {
    let rawUrl = '';
    if (viewMode === 'dossier') {
      rawUrl = pdfUrl || details.poaUrl || '';
    } else if (viewMode === 'preview') {
      rawUrl = details.verificationReportUrl || details.finalRecommendationReport || details.technicalAssessmentUrl || '';
    }

    if (rawUrl && !rawUrl.startsWith('http')) {
      const { data } = supabase.storage.from('documents').getPublicUrl(rawUrl);
      return data.publicUrl;
    }
    return rawUrl;
  }, [viewMode, pdfUrl, details]);

  const handleApprove = async () => {
    if (!remarks.trim()) return alert("Executive remarks required.");
    
    const hasCriticalFlags = forensicResult?.flags?.some((f: any) => f.severity === "CRITICAL");
    if (hasCriticalFlags) {
      return alert("ACTION BLOCKED: Critical forensic flags have been detected. Please review the advisory panel or return for rework.");
    }

    setProcessing(true);
    try {
      const blob = await pdf(docConfig.component).toBlob();
      
      const fileName = `${docConfig.prefix}_SIGNED_${Date.now()}.pdf`;
      const targetFolder = isInspection ? '03_Certificates' : '06_Facility_Verification';
      
      const sanitize = (val: string) => val.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
      const cleanCompanyId = app.companyId ? sanitize(String(app.companyId)) : 'unassigned';
      const path = `companies/${cleanCompanyId}/${app.applicationNumber}/${targetFolder}/${fileName}`;
      
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      startTransition(async () => {
        const metadataUpdate = isInspection 
          ? { gmp_certificate_url: publicUrl, archived_path: publicUrl } 
          : { gmp_clearance_url: publicUrl, archived_path: publicUrl };

        const res = await issueFinalClearance(app.id, remarks, publicUrl, metadataUpdate, currentUserId);
        
        if (res.success) { 
          router.push('/dashboard/director?view=final'); 
          router.refresh(); 
        } else { 
          alert(res.error); 
          setProcessing(false); 
        }
      });
    } catch (err: any) { 
      alert(err.message); 
      setProcessing(false); 
    }
  };

  return (
    <div className="fixed top-20 bottom-0 left-0 right-0 flex bg-slate-100 overflow-hidden font-sans">
      
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative flex flex-col">
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-center">
            <div className="bg-slate-900/95 backdrop-blur-xl p-1.5 rounded-full flex gap-1 shadow-2xl">
              <button 
                onClick={() => setViewMode('dossier')} 
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <FileText className="w-3 h-3" /> {isInspection ? "Inspection Report" : "Dossier"}
              </button>
              <button 
                onClick={() => setViewMode('draft')} 
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${viewMode === 'draft' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <CheckCircle2 className="w-3 h-3" /> Draft {isInspection ? "Certificate" : "Letter"}
              </button>
              <button 
                onClick={() => setViewMode('preview')} 
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${viewMode === 'preview' ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <ShieldCheck className="w-3 h-3" /> Verification Report
              </button>
            </div>
          </div>

          <div className="h-full w-full pt-20 p-6 flex-1">
            <div className="bg-white p-2 rounded-[3rem] shadow-inner border border-slate-200 h-full relative overflow-hidden flex flex-col">
              {viewMode === 'draft' ? (
                <BlobProvider document={docConfig.component}>
                  {({ url, loading }) => loading ? (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-[2.2rem] text-slate-400 gap-2">
                      <Loader2 className="w-6 h-6 animate-spin text-slate-400" />
                      <p className="text-[10px] font-black uppercase tracking-widest italic">Compiling Executive Draft...</p>
                    </div>
                  ) : (
                    <iframe src={`${url}#toolbar=0`} className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" key="draft-pdf" />
                  )}
                </BlobProvider>
              ) : iframeSrc ? (
                <iframe src={`${iframeSrc}#toolbar=0`} className="w-full h-full rounded-[2.2rem] border-none bg-slate-50" key={viewMode} />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-slate-100 rounded-[2.2rem] text-slate-400 gap-3">
                  <FileSearch className="w-12 h-12 opacity-20" />
                  <p className="text-xs font-bold uppercase tracking-widest text-center px-10">The requested verification report URL is missing.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar h-full">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <header className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Regulatory Decision Panel</span>
              <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter">#{app.applicationNumber}</h1>
            </div>
            <button 
              onClick={() => setIsReturnModalOpen(true)} 
              className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-50 transition-all shadow-sm"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" /> Rework
            </button>
          </header>

          <RiskExecutiveSummary complianceRisk={complianceRisk} isInspection={isInspection} />

          {/* --- ON-DEMAND EXECUTIVE FORENSIC ADVISORY PANEL --- */}
          <div className="bg-slate-900 rounded-[2.5rem] p-8 text-white shadow-xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Cpu className="w-4 h-4 text-emerald-400" />
                <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Executive Forensic Advisory Panel</h3>
              </div>
              {!auditAttempted ? (
                <button 
                  onClick={handleRunAudit}
                  disabled={isAuditing}
                  className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-[9px] uppercase tracking-wider rounded-full transition-all flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  {isAuditing ? <Loader2 className="w-3 h-3 animate-spin" /> : <Play className="w-3 h-3 fill-current" />}
                  Run AI Forensic Audit
                </button>
              ) : (
                <span className={`text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider ${
                  forensicResult?.flags?.some((f: any) => f.severity === 'CRITICAL') ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30' : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {forensicResult?.isDeskReview ? "Desk Review (Half-Payment)" : "Full Payment Review"}
                </span>
              )}
            </div>

            {/* Display Human-Inputted IRSD Payment Date If Available */}
            {details.fullPaymentDate && (
              <div className="p-4 bg-blue-950/40 border border-blue-800/50 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-black uppercase tracking-widest text-blue-300 block mb-0.5">IRSD Staff Logged Payment Date (Default)</span>
                  <p className="text-xs text-blue-100 font-semibold">{details.fullPaymentDate}</p>
                </div>
                <Calendar className="w-5 h-5 text-blue-400 opacity-80" />
              </div>
            )}

            {!auditAttempted ? (
              <div className="p-6 text-center bg-slate-800/40 border border-slate-800 rounded-2xl space-y-3">
                <p className="text-xs text-slate-300 font-medium">
                  AI Forensic Audit is on standby to conserve API quota and ensure instant page loading. Click above to analyze receipts.
                </p>
              </div>
            ) : isAuditing ? (
              <div className="flex items-center justify-center gap-3 py-8 text-slate-400 text-xs italic">
                <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
                <span>Gemini Vision parsing payment receipts & checking compliance baselines...</span>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-[9px] font-black uppercase tracking-wider">Detected Amount</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {forensicResult?.detectedAmount ? `₦${forensicResult.detectedAmount.toLocaleString()}` : "N/A"}
                    </p>
                  </div>

                  <div className="bg-slate-800/60 border border-slate-700/50 p-4 rounded-2xl space-y-1">
                    <div className="flex items-center gap-1.5 text-slate-400">
                      <Calendar className="w-3.5 h-3.5 text-blue-400" />
                      <span className="text-[9px] font-black uppercase tracking-wider">AI Parsed Date</span>
                    </div>
                    <p className="text-sm font-bold text-white">
                      {forensicResult?.fullPaymentDate || "Not Extracted"}
                    </p>
                  </div>
                </div>

                {forensicResult?.expiryDate && (
                  <div className="bg-indigo-950/40 border border-indigo-800/50 p-4 rounded-2xl flex items-center justify-between">
                    <div>
                      <span className="text-[9px] font-black uppercase tracking-widest text-indigo-300 block mb-0.5">3-Year Lifecycle Expiry (AI)</span>
                      <p className="text-xs text-indigo-100 font-semibold">Status active through {forensicResult.expiryDate}</p>
                    </div>
                    <ShieldCheck className="w-6 h-6 text-indigo-400 opacity-80" />
                  </div>
                )}

                {forensicResult?.flags?.length === 0 ? (
                  <div className="flex items-center gap-3 p-4 bg-emerald-950/40 border border-emerald-800/50 rounded-2xl">
                    <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />
                    <p className="text-xs text-emerald-200 font-medium leading-relaxed">
                      No fraud flags or anomalies detected. Payment receipt validation and validity baselines are fully compliant.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {forensicResult?.flags?.map((flag: any, idx: number) => (
                      <div key={idx} className={`p-4 rounded-2xl border flex items-start gap-3 ${
                        flag.severity === 'CRITICAL' ? 'bg-rose-950/40 border-rose-800/60 text-rose-200' :
                        flag.severity === 'WARNING' ? 'bg-amber-950/40 border-amber-800/60 text-amber-200' :
                        'bg-blue-950/40 border-blue-800/60 text-blue-200'
                      }`}>
                        {flag.severity === 'CRITICAL' ? <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" /> : <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />}
                        <div>
                          <span className="text-[9px] font-black uppercase tracking-widest block opacity-70 mb-0.5">{flag.code}</span>
                          <p className="text-xs font-medium leading-relaxed">{flag.message}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* --- TOGGLE INJECTION CONTROL --- */}
            <div className="pt-4 border-t border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold block">
                  {isInjected ? "AI Forensic Override: Active" : "Human Input Date: Default Active"}
                </span>
                <span className="text-[9px] text-slate-500 block">
                  Toggle ON to override human date with AI parsed date
                </span>
              </div>
              
              <button
                type="button"
                onClick={() => {
                  const nextState = !isInjected;
                  setIsInjected(nextState);
                  if (nextState) setViewMode('draft');
                }}
                className={`relative inline-flex h-7 w-14 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-300 ease-in-out focus:outline-none ring-4 ring-emerald-500/5 ${
                  isInjected ? 'bg-emerald-600' : 'bg-slate-700'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-300 ease-in-out ${
                    isInjected ? 'translate-x-7' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>
          </div>

          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden border-b-8 border-blue-700">
              <ShieldCheck className="absolute -top-4 -right-4 p-4 w-24 h-24 opacity-10 rotate-12" />
              <h3 className="text-[10px] font-black uppercase opacity-70 mb-3 tracking-[0.2em]">Divisional Deputy Director Recommendation</h3>
              <p className="text-xl font-bold italic leading-relaxed tracking-tight">"{app.dddInstruction || 'Final approval recommended.'}"</p>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800 relative">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Final Executive Authorization</h3>
            <textarea 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800/50 border-none rounded-[2.2rem] p-6 text-sm mb-6 outline-none text-white italic placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/20 transition-all" 
              placeholder={`Enter final executive decision remarks...`} 
            />
            <button 
              onClick={handleApprove} 
              disabled={processing || isPending} 
              className="w-full py-5 bg-emerald-500 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all disabled:opacity-50"
            >
              {processing ? <Loader2 className="animate-spin w-5 h-5" /> : `Authorize & Sign ${docTitle}`}
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-slate-400 tracking-widest border-b border-slate-200 pb-2">Full Audit Narrative</h3>
            {trail.map((note: any, idx: number) => (
              <div key={note.timestamp || `note-${idx}`} className="pl-6 border-l-2 border-slate-200 relative pb-4">
                <div className="absolute -left-[5px] top-0 w-2 h-2 rounded-full bg-slate-300" />
                <span className="text-[10px] font-black uppercase text-blue-600 tracking-tighter">
                  {note.roleDisplay}
                </span>
                <div className="p-4 mt-2 bg-white rounded-2xl border border-slate-100 text-[12px] italic text-slate-600 shadow-sm leading-relaxed">
                  "{note.text}"
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RejectionModal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        appId={app.id} 
        currentDDId={currentUserId} 
        staffList={usersList} 
        onSuccess={() => router.push('/dashboard/director')} 
      />
    </div>
  );
}