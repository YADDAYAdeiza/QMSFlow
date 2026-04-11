"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { 
  Loader2, RotateCcw, ShieldCheck, 
  FileText, CheckCircle2
} from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { GmpCertificate } from "@/components/documents/GmpCertificate";
import { supabase } from "@/lib/supabase";
import RejectionModal from "@/components/RejectionModal";

// Import the newly created component
import { RiskExecutiveSummary } from "@/components/analytics/RiskExecutiveSummary";

export default function DirectorReviewClient({ app, usersList, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'dossier' | 'draft'>('dossier');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const details = app.details || {};
  const isInspection = app.isInspection;
  const docTitle = app.docTitle;

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

    if (isInspection) {
      const certData = {
        appNumber,
        date,
        facilityName: details.factory_name || details.facilityName || "N/A",
        facilityAddress: details.factory_address || details.facilityAddress || "N/A",
        productLines: details.productLines || (details.products || []).map((p: string) => ({
          lineName: p,
          riskCategory: "Compliant"
        }))
      };
      return { component: <GmpCertificate data={certData} />, prefix: "GMP_CERTIFICATE" };
    } else {
      const clearanceData = {
        appNumber,
        date,
        factoryName: details.factory_name || details.facilityName || "N/A",
        factoryAddress: details.factory_address || details.facilityAddress || "N/A",
        localApplicantName: details.companyName || details.applicant_name || "N/A",
        localApplicantAddress: details.companyAddress || details.applicant_address || "N/A",
        products: details.products || []
      };
      return { component: <ClearanceLetter data={clearanceData} />, prefix: "GMP_CLEARANCE" };
    }
  }, [app, details, isInspection]);

  const handleApprove = async () => {
    if (!remarks.trim()) return alert("Executive remarks required.");
    setProcessing(true);
    try {
      const blob = await pdf(docConfig.component).toBlob();
      const path = `Final_Outputs/${app.applicationNumber}/${docConfig.prefix}_SIGNED_${Date.now()}.pdf`;
      
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
    <div className="fixed inset-0 flex bg-slate-100 overflow-hidden font-sans">
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-center">
            <div className="bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full flex gap-1 shadow-2xl">
              <button onClick={() => setViewMode('dossier')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                <FileText className="w-3 h-3" /> {isInspection ? "Inspection Report" : "Dossier"}
              </button>
              <button onClick={() => setViewMode('draft')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase flex items-center gap-2 transition-all duration-300 ${viewMode === 'draft' ? 'bg-emerald-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                <CheckCircle2 className="w-3 h-3" /> Draft {isInspection ? "Certificate" : "Letter"}
              </button>
            </div>
          </div>
          <div className="h-full w-full pt-4">
            {viewMode === 'draft' ? (
              <BlobProvider document={docConfig.component}>
                {({ url, loading }) => loading ? (
                  <div className="h-full flex items-center justify-center font-black uppercase text-[10px] text-slate-400 italic">Compiling Executive Draft...</div>
                ) : <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" /> }
              </BlobProvider>
            ) : <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" /> }
          </div>
        </div>
      </div>

      <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <header className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600 tracking-widest">Regulatory Decision Panel</span>
              <h1 className="text-4xl font-black uppercase italic leading-none tracking-tighter">#{app.applicationNumber}</h1>
            </div>
            <button onClick={() => setIsReturnModalOpen(true)} className="px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:bg-rose-50 transition-all shadow-sm">
              <RotateCcw className="w-3 h-3 text-rose-500" /> Rework
            </button>
          </header>

          <RiskExecutiveSummary complianceRisk={complianceRisk} isInspection={isInspection} />

          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden border-b-8 border-blue-700">
              <ShieldCheck className="absolute -top-4 -right-4 p-4 w-24 h-24 opacity-10 rotate-12" />
              <h3 className="text-[10px] font-black uppercase opacity-70 mb-3 tracking-[0.2em]">Divisional Deputy Director Recommendation</h3>
              <p className="text-xl font-bold italic leading-relaxed tracking-tight">"{app.dddInstruction}"</p>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800 relative">
            <h3 className="text-[10px] font-black uppercase text-slate-500 mb-4 tracking-[0.2em]">Final Executive Authorization</h3>
            <textarea 
              value={remarks} onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800/50 border-none rounded-[2rem] p-6 text-sm mb-6 outline-none text-white italic placeholder:text-slate-600 focus:ring-2 focus:ring-emerald-500/20 transition-all" 
              placeholder={`Enter final executive decision remarks...`} 
            />
            <button onClick={handleApprove} disabled={processing || isPending} className="w-full py-5 bg-emerald-500 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-emerald-400 shadow-lg shadow-emerald-500/20 transition-all">
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