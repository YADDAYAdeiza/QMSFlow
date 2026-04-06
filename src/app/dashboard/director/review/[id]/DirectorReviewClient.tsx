"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { 
  Loader2, RotateCcw, Activity, ShieldCheck, 
  FileText, CheckCircle2, ChevronDown, Beaker, ListFilter, Globe2
} from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { GmpCertificate } from "@/components/documents/GmpCertificate";
import { supabase } from "@/lib/supabase";
import RejectionModal from "@/components/RejectionModal";

function RiskExecutiveSummary({ complianceRisk, isInspection }: { complianceRisk: any; isInspection: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!complianceRisk) return null;

  const { summary, isSra, findings = [], intrinsicLevel, overallRating } = complianceRisk;
  
  const getRatingColor = (level: string) => {
    const l = level?.toUpperCase();
    if (l === "A" || l === "LOW" || l === "COMPLIANT") return "bg-emerald-600 text-white border-emerald-400";
    if (l === "B" || l === "MEDIUM") return "bg-amber-500 text-white border-amber-300";
    return "bg-rose-600 text-white border-rose-400";
  };

  const springTransition = { transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };

  return (
    <div className="space-y-4 mb-8">
      <div className="w-full">
        <div className={`p-8 rounded-[2.5rem] border-4 shadow-2xl flex items-center justify-between transition-all duration-500 ${getRatingColor(overallRating)}`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1 text-white/80">
                {isInspection ? "Inspection Compliance Rating" : "Overall Risk Rating"}
            </p>
            <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">{overallRating}</h2>
          </div>
          <div className="text-right">
             <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl inline-block border border-white/30">
                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/90 leading-none mb-1">Status</p>
                <p className="text-sm font-black uppercase italic leading-none tracking-tight text-white">
                    {isInspection ? "Full Certification" : "Full Approval"}
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Beaker className="w-4 h-4 text-slate-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">
                {isInspection ? "Inspection Audit Details" : "Technical Validation Details"}
            </span>
          </div>
          <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`} style={springTransition}>
            <ChevronDown className="w-5 h-5 text-slate-300" />
          </div>
        </button>

        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-8 pt-2 space-y-8 border-t border-slate-50">
              <div className="flex gap-3 h-32">
                <div className="w-1/4 bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center p-4 text-center border-b-4 border-blue-500 shadow-xl shadow-slate-900/10">
                  <Activity className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter leading-none mb-1">Intrinsic Risk</p>
                  <p className="text-xl font-black text-white uppercase italic leading-none tracking-tighter">{intrinsicLevel}</p>
                </div>

                <div className={`flex-1 rounded-[2rem] p-6 border-2 flex items-center gap-5 relative overflow-hidden transition-colors ${isSra ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`p-4 rounded-2xl shrink-0 shadow-lg ${isSra ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-amber-500 text-white shadow-amber-500/30'}`}>
                    {isSra ? <Globe2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6 opacity-60" />}
                  </div>
                  <div className="relative z-10">
                    <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1.5 ${isSra ? 'text-blue-900' : 'text-amber-900'}`}>
                      {isSra ? "SRA Recognized Facility" : "Non-SRA / Local Oversight"}
                    </h4>
                    <p className={`text-[10px] font-medium leading-tight max-w-[220px] italic ${isSra ? 'text-blue-700/80' : 'text-amber-700/80'}`}>
                      {isSra 
                        ? "Validated by a Stringent Regulatory Authority. High data confidence tier." 
                        : "Regulatory oversight verified via local site audit and national standards."}
                    </p>
                  </div>
                  {isSra && <ShieldCheck className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-500 opacity-10 -rotate-12" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Critical", val: summary.criticalCount, color: "text-rose-500", bg: "bg-rose-50" },
                  { label: "Major", val: summary.majorCount, color: "text-amber-500", bg: "bg-amber-50" },
                  { label: "Other", val: summary.otherCount, color: "text-slate-400", bg: "bg-slate-50" }
                ].map(t => (
                  <div key={t.label} className={`${t.bg} rounded-2xl p-5 text-center border border-black/5`}>
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-tighter">{t.label}</p>
                    <p className={`text-2xl font-black ${t.color}`}>{t.val}</p>
                  </div>
                ))}
              </div>

              {findings.length > 0 && (
                <div className="space-y-3 pb-4">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-3 h-3 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observations Ledger</span>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar font-sans">
                    {findings.map((f: any, i: number) => (
                      <div key={f.id || `obs-${i}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 italic leading-relaxed shadow-inner">
                        <span className="text-blue-500 font-black mr-2 uppercase">Obs {i+1}</span>
                        {typeof f === 'string' ? f : (f.text || f.finding)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

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
      // PASS 2 DATA MAPPING
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
      // PASS 1 DATA MAPPING
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