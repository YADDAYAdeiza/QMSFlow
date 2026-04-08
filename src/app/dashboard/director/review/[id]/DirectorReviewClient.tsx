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

// ... RiskExecutiveSummary component stays the same ...

export default function DirectorReviewClient({ app, usersList, pdfUrl, currentUserId }: any) {
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const [processing, setProcessing] = useState(false);
  const [viewMode, setViewMode] = useState<'dossier' | 'draft'>('dossier');
  const [isReturnModalOpen, setIsReturnModalOpen] = useState(false);
  const router = useRouter();

  const details = app.details || {};
  const isInspection = app.isInspection; // This is our primary switch
  const docTitle = isInspection ? "GMP Certificate" : "Clearance Letter";

  // 1. ROBUST DATA MAPPING FOR PDF GENERATION
  const docConfig = useMemo(() => {
    const appNumber = app.applicationNumber || details.appNumber;
    const today = new Date().toLocaleDateString('en-GB', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

    if (isInspection) {
      /** * PASS 2: GMP CERTIFICATE 
       * Requires: facilityName, facilityAddress, productLines [{lineName, riskCategory}]
       */
      const certData = {
        appNumber,
        date: today,
        facilityName: details.facilityName || details.factory_name || "N/A",
        facilityAddress: details.facilityAddress || details.factory_address || "N/A",
        productLines: details.productLines || [] 
      };
      return { 
        component: <GmpCertificate data={certData} />, 
        prefix: "GMP_CERTIFICATE",
        storageFolder: "Final_Certificates" 
      };
    } else {
      /** * PASS 1: CLEARANCE LETTER 
       * Requires: localApplicantName, localApplicantAddress, products (flattened string array)
       */
      // Flatten productLines to simple string array for ClearanceLetter
      const flattenedProducts = details.productLines 
        ? details.productLines.flatMap((lp: any) => lp.products?.map((p: any) => p.name) || [lp.lineName])
        : (details.products || []);

      const clearanceData = {
        appNumber,
        date: today,
        factoryName: details.facilityName || details.factory_name || "N/A",
        factoryAddress: details.facilityAddress || details.factory_address || "N/A",
        localApplicantName: details.companyName || details.applicant_name || "N/A",
        localApplicantAddress: details.companyAddress || details.applicant_address || "N/A",
        products: flattenedProducts
      };
      return { 
        component: <ClearanceLetter data={clearanceData} />, 
        prefix: "GMP_CLEARANCE",
        storageFolder: "Clearance_Letters"
      };
    }
  }, [app, details, isInspection]);

  // 2. ROBUST APPROVAL LOGIC
  const handleApprove = async () => {
    if (!remarks.trim()) return alert("Executive remarks required for authorization.");
    setProcessing(true);
    
    try {
      // Generate the PDF blob based on the active config
      const blob = await pdf(docConfig.component).toBlob();
      const filename = `${docConfig.prefix}_${app.applicationNumber.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
      const path = `Final_Outputs/${app.applicationNumber}/${filename}`;
      
      // Upload to Supabase 'Documents' bucket
      const { error: uploadError } = await supabase.storage.from('Documents').upload(path, blob);
      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage.from('Documents').getPublicUrl(path);

      startTransition(async () => {
        // Construct metadata updates specific to the Pass Type
        const metadataUpdate = isInspection 
          ? { 
              gmp_certificate_url: publicUrl, 
              archived_path: publicUrl,
              status: "CERTIFIED" 
            } 
          : { 
              gmp_clearance_url: publicUrl, 
              archived_path: publicUrl,
              status: "CLEARED_FOR_INSPECTION"
            };

        const res = await issueFinalClearance(
          app.id, 
          remarks, 
          publicUrl, 
          metadataUpdate, 
          currentUserId
        );
        
        if (res.success) { 
          router.push('/dashboard/director?view=final'); 
          router.refresh(); 
        } else { 
          alert(res.error); 
          setProcessing(false); 
        }
      });
    } catch (err: any) { 
      console.error("Approval Error:", err);
      alert(`Deployment Error: ${err.message}`); 
      setProcessing(false); 
    }
  };

  // ... Rest of the JSX (View Toggles & Sidebar) ...
  // Ensure "Authorize & Sign" button uses the dynamic docTitle

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