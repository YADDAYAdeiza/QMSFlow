"use client"

import React, { useState, useTransition, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { pdf, BlobProvider } from '@react-pdf/renderer';
import { Loader2, RotateCcw } from 'lucide-react';
import { issueFinalClearance } from '@/lib/actions/director';
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { supabase } from "@/lib/supabase";
import RejectionModal from "@/components/RejectionModal";

export default function DirectorReviewClient({ app, usersList, stream, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'dossier' | 'staff' | 'draft'>('dossier');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const details = app.details || {};
  const activeStream = stream || "VMD";

  const docConfig = useMemo(() => {
    // Flatten nested productLines into simple strings for PDF
    const mappedProducts = details.productLines?.flatMap((line: any) => 
      line.products?.map((p: any) => `${p.name} (${line.lineName})`)
    ) || [];

    const templateData = { 
      appNumber: app.applicationNumber, 
      localApplicantName: details.companyName || app.localApplicant?.name || "Unspecified Entity", 
      localApplicantAddress: details.companyAddress || app.localApplicant?.address,
      factoryName: details.facilityName, // Now pulled directly from Step 4 fix
      factoryAddress: details.facilityAddress, // Now pulled directly from Step 4 fix
      date: new Date().toLocaleDateString('en-GB'),
      products: mappedProducts
    };

    return { 
      component: <ClearanceLetter data={templateData} />, 
      prefix: "CLEARANCE" 
    };
  }, [app, details]);

  const trail = useMemo(() => {
    const comments = app.commentsTrail || details.comments || [];
    return [...comments].filter((c: any) => {
      const isLOD = c.division === "LOD" || c.role === "LOD";
      const isStream = c.division === activeStream || c.division === "IRSD"; 
      return isLOD || c.role === "Director" || isStream;
    }).reverse();
  }, [app.commentsTrail, details.comments, activeStream]);

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
        } else { alert(res.error); setProcessing(false); }
      });
    } catch (err: any) { alert(err.message); setProcessing(false); }
  };

  return (
    <div className="fixed inset-0 flex bg-slate-100 overflow-hidden">
      <div className="w-1/2 p-6 h-full">
        <div className="bg-white rounded-[3rem] shadow-2xl border border-slate-200 w-full h-full overflow-hidden relative">
          <div className="absolute top-6 left-6 right-6 z-20 flex justify-center">
            <div className="bg-slate-900/90 backdrop-blur-xl p-1.5 rounded-full flex gap-1">
              <button onClick={() => setViewMode('dossier')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase ${viewMode === 'dossier' ? 'bg-blue-600 text-white' : 'text-slate-400'}`}>Dossier</button>
              <button onClick={() => setViewMode('draft')} className={`px-4 py-2 rounded-full text-[9px] font-black uppercase ${viewMode === 'draft' ? 'bg-rose-500 text-white' : 'text-slate-400'}`}>Draft Certificate</button>
            </div>
          </div>
          <div className="h-full w-full pt-4">
            {viewMode === 'draft' ? (
              <BlobProvider document={docConfig.component}>
                {({ url, loading }) => loading ? <div className="h-full flex items-center justify-center font-black uppercase text-[10px] text-slate-400">Compiling...</div> : <iframe src={`${url}#toolbar=0`} className="w-full h-full border-none" /> }
              </BlobProvider>
            ) : <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" /> }
          </div>
        </div>
      </div>

      <div className="w-1/2 p-10 overflow-y-auto">
        <div className="max-w-xl mx-auto space-y-8 pb-20">
          <header className="flex justify-between items-end">
            <div>
              <span className="text-[10px] font-black uppercase text-blue-600">Executive Phase</span>
              <h1 className="text-4xl font-black uppercase italic leading-none">#{app.applicationNumber}</h1>
            </div>
            <button onClick={() => setIsReturnModalOpen(true)} className="px-5 py-2.5 bg-white border rounded-2xl text-[10px] font-black uppercase flex items-center gap-2"><RotateCcw className="w-3 h-3 text-rose-500" /> Rework</button>
          </header>

          <div className="bg-blue-600 rounded-[2.5rem] p-8 text-white shadow-xl">
              <h3 className="text-[10px] font-black uppercase opacity-70 mb-3">Divisional Deputy Director Recommendation</h3>
              <p className="text-xl font-bold italic">"{app.dddInstruction || "Recommended for approval"}"</p>
          </div>

          <div className="bg-slate-900 rounded-[3rem] p-10 text-white shadow-2xl">
            <textarea 
              value={remarks} onChange={(e) => setRemarks(e.target.value)} 
              className="w-full h-40 bg-slate-800 border-none rounded-[2rem] p-6 text-sm mb-6 outline-none text-white" 
              placeholder="Final executive remarks..." 
            />
            <button onClick={handleApprove} disabled={processing || isPending} className="w-full py-5 bg-emerald-500 rounded-3xl font-black uppercase text-[11px] flex items-center justify-center gap-3">
              {processing ? <Loader2 className="animate-spin w-5 h-5" /> : "Authorize & Sign Certificate"}
            </button>
          </div>

          <div className="space-y-6">
            <h3 className="text-[11px] font-black uppercase text-slate-400">Full Audit Narrative</h3>
            {trail.map((note: any, idx: number) => (
              <div key={idx} className="pl-6 border-l-2 border-slate-200">
                <span className="text-[10px] font-black uppercase text-blue-600">
                  {/* Applied global instruction for 'Divisional Deputy Director' title */}
                  {note.from?.replace('DDD', 'Divisional Deputy Director') || (note.role === 'Director' ? 'Executive Director' : 'Officer')}
                </span>
                <div className="p-4 mt-2 bg-white rounded-2xl border text-[12px] italic">"{note.text}"</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <RejectionModal isOpen={isReturnModalOpen} onClose={() => setIsReturnModalOpen(false)} appId={app.id} currentDDId={currentUserId} staffList={usersList} onSuccess={() => router.push('/dashboard/director')} />
    </div>
  );
}