"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import { ShieldCheck, Info, FileText, Download, Eye, CheckCircle2 } from "lucide-react"; 
import { createClient } from "@/utils/supabase/client"; 
import dynamic from 'next/dynamic';

// Dynamic imports for PDF components
const ClearanceLetter = dynamic(() => import('@/components/documents/ClearanceLetter'), { ssr: false });
const GmpCertificate = dynamic(() => import('@/components/documents/GmpCertificate'), { ssr: false });

export default function DirectorReviewClient({ history, app, pdfUrl }: any) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  const safeApp = JSON.parse(JSON.stringify(app));
  const safeHistory = JSON.parse(JSON.stringify(history));
  const isCleared = safeApp.status === 'CLEARED';
  const isDirectorsTurn = safeApp.currentPoint === 'Director';
  
  const hasDivisionsReviewed = safeHistory?.some((seg: any) =>
    ["VMD", "AFPD", "PAD", "IRSD"].includes(seg.division) && seg.endTime !== null
  );

  const canIssue = isDirectorsTurn && hasDivisionsReviewed;

  // --- HELPER: CONSTRUCT ARCHIVE URL ---
  const getArchiveUrl = (path: string) => {
    if (!path) return null;
    return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/documents/${path}`;
  };

  // --- NEW: DYNAMIC PREVIEW GENERATOR ---
  const handlePreviewCertificate = async () => {
    try {
      const { pdf } = await import('@react-pdf/renderer');
      const doc = safeApp.type === "Facility Verification" ? 
        <ClearanceLetter data={safeApp} /> : <GmpCertificate data={safeApp} />;
      
      const blob = await pdf(doc).toBlob();
      const url = URL.createObjectURL(blob);
      
      window.open(url, '_blank');
      setHasPreviewed(true);
    } catch (err) {
      console.error("Preview failed:", err);
      alert("Error generating preview. Please check console.");
    }
  };

  // --- OPTION AB: SILENT UPLOAD & DATABASE UPDATE ---
  const handleIssueAndArchive = async () => {
    if (!comments.trim()) return alert("QMS Requirement: Director's Final Minute is required.");
    if (!hasPreviewed) return alert("Please preview the draft certificate before issuing.");
    
    startTransition(async () => {
      try {
        const { pdf } = await import('@react-pdf/renderer');
        const doc = safeApp.type === "Facility Verification" ? 
          <ClearanceLetter data={safeApp} /> : <GmpCertificate data={safeApp} />;
        const blob = await pdf(doc).toBlob();

        const cleanCo = safeApp.company?.name.replace(/[^a-z0-9]/gi, '_').toUpperCase();
        const cleanApp = safeApp.applicationNumber.replace(/\//g, '-');
        const folderType = safeApp.type === "Facility Verification" ? "Facility_Verification" : "Inspection_Report";
        const fileName = `${cleanApp}_FINAL.pdf`;
        
        const storagePath = `${cleanCo}/${cleanApp}/${folderType}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('documents') 
          .upload(storagePath, blob, { 
            upsert: true, 
            contentType: 'application/pdf' 
          });

        if (uploadError) throw new Error(`Storage Archival Failed: ${uploadError.message}`);

        const result = await issueFinalClearance(safeApp.id, comments, storagePath);
        
        if (result.success) {
          alert("Application Cleared. Certificate successfully archived in the Vault.");
          router.refresh();
        } else {
          throw new Error(result.error || "Database update failed.");
        }
      } catch (err: any) {
        console.error("Issuance Error:", err);
        alert(err.message || "An unexpected error occurred.");
      }
    });
  };

  // --- AUDIT TRAIL LOGIC (Remains the same) ---
  const techHistory = safeApp.details?.technical_history || [];
  const rejectHistory = safeApp.details?.rejection_history || [];
  const dddHistory = safeApp.details?.ddd_history || [];
  const dddToStaffHistory = safeApp.details?.ddd_to_staff_history || [];
  const directorHistory = safeApp.details?.director_history || [];
  const lodComments = safeApp.details?.comments || [];

  let assignIndex = 0;
  let techSeqIndex = 0;

  const augmentedHistory = safeHistory.map((segment: any) => {
    let comment = null;
    const segStart = new Date(segment.startTime).getTime();
    const segEnd = segment.endTime ? new Date(segment.endTime).getTime() : Date.now();
    const grace = 5000;

    if (segment.staff_id === 'LOD_OFFICER' || segment.division === 'LOD') {
      comment = lodComments[0]?.text || "Dossier Received by Liaison Office";
    } else if (segment.point === 'Director' && segment.staff_id !== 'LOD_OFFICER') {
      const match = directorHistory.find((d: any) => {
        const t = new Date(d.timestamp || d.created_at).getTime();
        return t >= (segStart - grace) && t <= (segEnd + grace);
      });
      comment = match?.instruction || segment.comments || null;
    } else if (segment.point === 'Technical Review') {
      let match = techHistory.find((h: any) => {
        const t = new Date(h.submitted_at).getTime();
        return t >= (segStart - grace) && t <= (segEnd + grace);
      });
      if (!match && segment.endTime && techHistory[techSeqIndex]) match = techHistory[techSeqIndex];
      comment = match?.findings || "Technical review in progress...";
      if (segment.endTime) techSeqIndex++;
    } else if (segment.point === 'Divisional Deputy Director') {
      const rej = rejectHistory.find((r: any) => {
        const t = new Date(r.rejected_at).getTime();
        return t >= (segStart - grace) && t <= (segEnd + grace);
      });
      const rec = dddHistory.find((d: any) => {
        const t = new Date(d.timestamp).getTime();
        return t >= (segStart - grace) && t <= (segEnd + grace);
      });
      const assign = dddToStaffHistory[assignIndex];
      comment = rej?.reason || rec?.note || assign?.instruction || null;
      if (!rej && !rec && assign) assignIndex++;
    }
    return { ...segment, comments: comment };
  });

  useEffect(() => { setIsMounted(true); }, []);

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* LEFT SIDE: DOSSIER VIEW (Original File) */}
      <div className="w-1/2 h-full bg-white border-r">
        <iframe src={pdfUrl} className="w-full h-full border-none" title="Dossier" />
      </div>

      {/* RIGHT SIDE: REVIEW PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto bg-slate-50/30">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 uppercase italic tracking-tighter">
              {isCleared ? "Issuance Record" : "Final Authorization"}
            </h1>
            <p className="text-slate-500 font-mono text-[10px]">Reference ID: {safeApp?.applicationNumber}</p>
          </div>
          {isCleared && (
            <div className="flex items-center gap-1 bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase">
              <CheckCircle2 className="w-3 h-3" /> Cleared
            </div>
          )}
        </header>

        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Process Lifecycle
          </h2>
          <AuditTrail segments={augmentedHistory} />
        </div>

        <div className="mt-auto bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-2xl space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Director's Final Minute
            </label>
            <textarea
              disabled={!canIssue || isPending || isCleared}
              className="w-full p-4 border-2 rounded-xl text-sm italic focus:border-blue-500 outline-none transition-all"
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              placeholder={isCleared ? "Archived record" : "Enter final remarks for the record..."}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {isCleared ? (
              <div className="flex flex-col gap-3">
                <p className="text-center text-emerald-600 font-black text-[10px] uppercase tracking-widest">
                  Document stored in secure vault
                </p>
                <button 
                  onClick={() => window.open(getArchiveUrl(safeApp.details?.archived_path), '_blank')}
                  className="w-full py-4 bg-white border-2 border-slate-900 rounded-xl font-black uppercase text-xs flex items-center justify-center gap-2 hover:bg-slate-50 transition-all shadow-[4px_4px_0px_0px_rgba(15,23,42,1)]"
                >
                  <Download className="w-4 h-4" /> Download Archived Certificate
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                <button
                  type="button"
                  onClick={handlePreviewCertificate}
                  className={`py-3 rounded-xl font-bold uppercase text-[10px] flex items-center justify-center gap-2 transition-all ${
                    hasPreviewed ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-slate-200 text-slate-700 hover:bg-slate-300"
                  }`}
                >
                  <Eye className="w-4 h-4" /> 
                  {hasPreviewed ? "Draft Verified (Click to Re-view)" : "Preview Draft Certificate"}
                </button>

                <button
                  disabled={isPending || !canIssue || !comments.trim() || !hasPreviewed}
                  onClick={handleIssueAndArchive}
                  className="py-4 rounded-xl font-black uppercase text-xs bg-emerald-600 text-white shadow-lg active:scale-95 disabled:bg-slate-100 disabled:text-slate-400 disabled:shadow-none transition-all"
                >
                  {isPending ? "ARCHIVING..." : "ISSUE & ARCHIVE CERTIFICATE"}
                </button>
                
                {!hasPreviewed && canIssue && (
                  <p className="text-[9px] text-center text-rose-500 font-bold uppercase italic animate-pulse">
                    Preview Certificate required before final issuance
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}