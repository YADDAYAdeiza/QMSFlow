"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { 
  ShieldCheck, Loader2, MessageSquare, Award, RotateCcw, 
  FileWarning, Eye, EyeOff, FileText, Download, LayoutDashboard
} from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';

// Document Templates
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { CapaLetter } from "@/components/documents/CapaLetter";
import { GmpCertificate } from "@/components/documents/GmpCertificate";

import { supabase } from "@/lib/supabase";
import RejectionModal from "@/components/RejectionModal";

export default function DirectorReviewClient({ app, usersList, stream, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'dossier' | 'staff' | 'draft'>('dossier');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const activeStream = stream || "VMD";
  const details = app.details || {};

  // Memoized Document Logic for absolute consistency between Preview and Final Upload
  const docConfig = useMemo(() => {
    const hasCapas = Array.isArray(details.capas) && details.capas.length > 0;
    const isInspectionReview = !!details.inspectionReportUrl;
    
    const templateData = { 
      appNumber: app.applicationNumber, 
      companyName: app.company?.name || details.factory_name, 
      address: details.factory_address,
      date: new Date().toLocaleDateString('en-GB'),
      products: details.products || []
    };

    if (hasCapas) {
      return { 
        component: <CapaLetter data={{ ...templateData, capas: details.capas }} />, 
        prefix: "CAPA" 
      };
    }
    
    if (isInspectionReview) {
      return { 
        component: <GmpCertificate data={templateData} />, 
        prefix: "GMP" 
      };
    }

    return { 
      component: <ClearanceLetter data={templateData} />, 
      prefix: "CLEARANCE" 
    };
  }, [app, details]);

  const trail = useMemo(() => {
    const comments = app.commentsTrail || app.details?.comments || [];
    return [...comments]
      .filter((c: any) => {
        const isLOD = c.division === "LOD" || c.role === "LOD";
        const isGlobal = c.role === "Director";
        const isStream = c.division === activeStream || c.division === "IRSD"; 
        return isLOD || isGlobal || isStream;
      })
      .reverse();
  }, [app.commentsTrail, app.details?.comments, activeStream]);

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
        const res = await issueFinalClearance(app.id, remarks, publicUrl);
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
      
      {/* LEFT SIDE: MULTI-MODE PDF VIEWER */}
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
          
          {/* Evidence Toggle Header */}
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-center">
            <div className="bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full flex gap-1 border border-white/10 shadow-2xl">
              <button 
                onClick={() => setViewMode('dossier')}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'dossier' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <LayoutDashboard className="w-3 h-3" /> Company Dossier
              </button>
              
              {(app.staffReports?.verification || app.staffReports?.technical) && (
                <button 
                  onClick={() => setViewMode('staff')}
                  className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'staff' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
                >
                  <FileText className="w-3 h-3" /> Staff Report
                </button>
              )}

              <button 
                onClick={() => setViewMode('draft')}
                className={`px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all flex items-center gap-2 ${viewMode === 'draft' ? 'bg-rose-500 text-white shadow-lg' : 'text-slate-400 hover:text-white'}`}
              >
                <Award className="w-3 h-3" /> Draft Certificate
              </button>
            </div>
          </div>

          <div className="h-full w-full pt-4">
            {viewMode === 'draft' ? (
              <BlobProvider document={docConfig.component}>
                {({ url, loading }) => (
                  loading ? (
                    <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                      <Loader2 className="animate-spin w-8 h-8 text-rose-500 mb-4" />
                      <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compiling Draft...</p>
                    </div>
                  ) : <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" title="Draft" />
                )}
              </BlobProvider>
            ) : viewMode === 'staff' ? (
              <iframe src={`${app.staffReports.verification || app.staffReports.technical}#toolbar=0`} className="w-full h-full border-none" title="Evidence" />
            ) : (
              pdfUrl ? <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" /> : (
                <div className="h-full flex flex-col items-center justify-center bg-slate-50">
                  <FileWarning className="w-12 h-12 text-slate-200 mb-2" />
                  <p className="text-[10px] text-slate-400 font-black tracking-widest uppercase">No Source File Available</p>
                </div>
              )
            )}
          </div>
        </div>
      </div>

      {/* RIGHT SIDE: EXECUTIVE ACTION PANEL */}
      <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-8 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Executive Decision Phase</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">#{app.applicationNumber}</h1>
            </div>
            <button 
              onClick={() => setIsReturnModalOpen(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:border-rose-300 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" /> Rework Required
            </button>
          </div>

          {/* DDD Minute */}
          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl relative overflow-hidden group">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Divisional Deputy Director Recommendation
              </h3>
              <p className="text-xl font-bold italic leading-relaxed">"{app.dddInstruction}"</p>
              <ShieldCheck className="absolute -right-4 -bottom-4 w-24 h-24 opacity-10 group-hover:scale-110 transition-transform" />
          </div>

          {/* Executive Signature */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800">
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" /> Executive Sign-off
            </h3>
            <textarea 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-[2rem] p-6 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-6 placeholder:text-slate-600" 
              placeholder="Enter final executive remarks..." 
            />
            <button 
              onClick={handleApprove} 
              disabled={processing || isPending} 
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg shadow-emerald-900/20"
            >
              {(processing || isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : "Authorize & Sign Final Certificate"}
            </button>
          </div>

          {/* Audit Trail */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400 mb-8">
                <MessageSquare className="w-4 h-4" /> Full Audit Narrative
            </h3>
            <div className="space-y-8 relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />
                {trail.map((note: any, idx: number) => (
                    <div key={idx} className="relative pl-10">
                        <div className="absolute left-1.5 top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10" />
                        <span className={`font-black text-[10px] uppercase tracking-tight ${note.role === 'Director' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {note.role === 'Director' ? '✦ Executive Director' : note.from}
                        </span>
                        <span className="ml-2 text-[8px] font-medium text-slate-400 font-mono">
                            {note.timestamp ? new Date(note.timestamp).toLocaleString() : ''}
                        </span>
                        <div className={`p-4 mt-2 rounded-2xl text-[12px] italic border ${note.role === 'Director' ? 'bg-emerald-50/50 border-emerald-100' : 'bg-slate-50 border-slate-100'}`}>
                            "{note.text}"
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      <RejectionModal 
        isOpen={isReturnModalOpen} 
        onClose={() => setIsReturnModalOpen(false)} 
        appId={app.id} 
        currentDDId={currentUserId} 
        currentStaffId={app.details?.staff_reviewer_id} 
        staffList={usersList} 
        onSuccess={() => { router.push('/dashboard/director?view=final'); router.refresh(); }} 
      />
    </div>
  );
}