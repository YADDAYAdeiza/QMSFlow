"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { 
  ShieldCheck, Loader2, MessageSquare, Award, RotateCcw, FileWarning, Eye, EyeOff
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
  const [isPreviewMode, setIsPreviewMode] = useState(false);
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const activeStream = stream || "VMD";
  const details = app.details || {};

  /**
   * ✅ DOCUMENT DECISION LOGIC
   * Memoized to ensure the Preview and the Final Upload use the exact same data.
   */
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
      // 1. Generate the actual PDF blob from the same template used in preview
      const blob = await pdf(docConfig.component).toBlob();
      const path = `${app.applicationNumber}/${activeStream}/${docConfig.prefix}_${Date.now()}.pdf`;
      
      // 2. Upload to 'Documents' bucket as per QMS naming convention
      const { error: uploadError } = await supabase.storage.from('documents').upload(path, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('documents').getPublicUrl(path);

      // 3. Trigger Server Action to update DB status and stop QMS clocks
      startTransition(async () => {
        const res = await issueFinalClearance(app.id, remarks, publicUrl);
        if (res.success) { 
            router.push('/director?view=final'); 
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
      
      {/* LEFT SIDE: PDF VIEWER (Swaps between Dossier and Draft Preview) */}
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
          
          {/* Header Toggle Controls */}
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-between items-center">
            <div className="bg-slate-900/80 backdrop-blur-md text-white px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest border border-white/10">
              {isPreviewMode ? `${docConfig.prefix} Draft Preview` : `${activeStream} Technical Evidence`}
            </div>
            
            <button 
              onClick={() => setIsPreviewMode(!isPreviewMode)}
              className={`flex items-center gap-2 px-4 py-2 rounded-full text-[9px] font-black uppercase transition-all shadow-lg ${
                isPreviewMode ? 'bg-rose-500 text-white' : 'bg-blue-600 text-white hover:bg-blue-700'
              }`}
            >
              {isPreviewMode ? <><EyeOff className="w-3 h-3" /> Close Preview</> : <><Eye className="w-3 h-3" /> Preview Certificate</>}
            </button>
          </div>

          {isPreviewMode ? (
            <BlobProvider document={docConfig.component}>
              {({ url, loading }) => (
                loading ? (
                  <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
                    <Loader2 className="animate-spin w-8 h-8 text-blue-600 mb-4" />
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-400">Generating Draft Document...</p>
                  </div>
                ) : (
                  <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" title="Draft Preview" />
                )
              )}
            </BlobProvider>
          ) : (
            pdfUrl && pdfUrl.startsWith('http') ? (
              <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
            ) : (
              <div className="h-full w-full flex flex-col items-center justify-center bg-slate-50">
                <FileWarning className="w-12 h-12 text-slate-200 mb-2" />
                <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest">Dossier URL Missing</p>
              </div>
            )
          )}
        </div>
      </div>

      {/* RIGHT SIDE: ACTION PANEL */}
      <div className="w-1/2 p-10 overflow-y-auto custom-scrollbar">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <div className="flex justify-between items-end">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <div className="h-1.5 w-8 bg-blue-600 rounded-full" />
                <span className="text-[10px] font-black uppercase tracking-widest text-blue-600">Executive Directorate</span>
              </div>
              <h1 className="text-4xl font-black uppercase italic tracking-tighter text-slate-900 leading-none">#{app.applicationNumber}</h1>
            </div>
            <button 
              onClick={() => setIsReturnModalOpen(true)} 
              className="flex items-center gap-2 px-5 py-2.5 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase shadow-sm hover:bg-slate-50 transition-all"
            >
              <RotateCcw className="w-3 h-3 text-rose-500" /> Return for Rework
            </button>
          </div>

          {/* DDD Instructions Section */}
          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h3 className="text-[10px] font-black uppercase tracking-widest opacity-70 mb-3 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4" /> Final Recommendation
              </h3>
              <p className="text-xl font-bold italic">"{app.dddInstruction || "Technical review endorsed for approval."}"</p>
          </div>

          {/* Signature & Remarks Section */}
          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl border border-slate-800">
            <h3 className="text-blue-400 text-[10px] font-black uppercase tracking-widest mb-6 flex items-center gap-2">
              <Award className="w-5 h-5" /> Executive Sign-off
            </h3>
            <textarea 
              value={remarks} 
              onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800/50 border border-slate-700 rounded-[2rem] p-6 text-sm focus:ring-2 focus:ring-blue-500 outline-none mb-6" 
              placeholder="Enter final executive remarks for the audit trail..." 
            />
            <button 
              onClick={handleApprove} 
              disabled={processing || isPending} 
              className="w-full py-5 bg-emerald-500 hover:bg-emerald-600 rounded-3xl font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 disabled:opacity-50 transition-all shadow-lg"
            >
              {(processing || isPending) ? <Loader2 className="animate-spin w-5 h-5" /> : "Sign & Finalize Document"}
            </button>
          </div>

          {/* ACTIVITY TRAIL */}
          <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-200">
            <h3 className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2 text-slate-400 mb-8">
                <MessageSquare className="w-4 h-4" /> Audit Trail (LOD to Present)
            </h3>
            <div className="space-y-8 relative">
                <div className="absolute left-3 top-2 bottom-2 w-0.5 bg-slate-100" />
                {trail.map((note: any, idx: number) => (
                    <div key={idx} className="relative pl-10">
                        <div className="absolute left-1.5 top-1 w-3 h-3 bg-white border-2 border-blue-500 rounded-full z-10" />
                        
                        <span className={`font-black text-[10px] uppercase tracking-tight ${note.role === 'Director' ? 'text-emerald-600' : 'text-blue-600'}`}>
                          {note.role === 'Director' 
                            ? '✦ Executive Director' 
                            : note.role === 'Divisional Deputy Director' 
                            ? `Divisional Deputy Director (${note.division || 'Tech'})` 
                            : note.from}
                        </span>

                        <span className="ml-2 text-[8px] font-medium text-slate-400 font-mono">
                            {note.timestamp ? new Date(note.timestamp).toLocaleString() : ''}
                        </span>

                        <div className={`p-4 mt-2 rounded-2xl text-[12px] italic border ${note.role === 'Director' ? 'bg-emerald-50/50 border-emerald-100 text-emerald-900' : 'bg-slate-50 border-slate-100 text-slate-700'}`}>
                            "{note.text}"
                        </div>
                    </div>
                ))}
            </div>
          </div>
        </div>
      </div>

      {/* Rework Modal */}
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
