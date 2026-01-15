"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import { MessageSquare, ShieldCheck, Info, FileText, ExternalLink, Download, History } from "lucide-react"; 
import dynamic from 'next/dynamic';

// 1. DYNAMIC IMPORTS FOR PDF GENERATION
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const ClearanceLetter = dynamic(
  () => import('@/components/documents/ClearanceLetter'),
  { ssr: false }
);

const GmpCertificate = dynamic(
  () => import('@/components/documents/GmpCertificate'),
  { ssr: false }
);

export default function DirectorReviewClient({ history, app, pdfUrl }: any) {
  // --- SANITIZATION & DATA PREP ---
  const safeApp = JSON.parse(JSON.stringify(app));
  const safeHistory = JSON.parse(JSON.stringify(history));

  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // --- QMS LOGIC GATES ---
  const isCleared = safeApp.status === 'CLEARED';
  const isDirectorsTurn = safeApp.currentPoint === 'Director';
  
  const hasDivisionsReviewed = safeHistory?.some((seg: any) =>
    ["VMD", "AFPD", "PAD", "IRSD"].includes(seg.division) && seg.endTime !== null
  );

  const canIssue = isDirectorsTurn && hasDivisionsReviewed;

  // --- STORAGE URL HELPER ---
  const getArchiveUrl = (path: string) => {
    if (!path) return null;
    return `https://oaapzckmonddzdjtdvdm.supabase.co/storage/v1/object/public/documents/${path}`;
  };

  // --- ROBUST AUDIT TRAIL AUGMENTATION (Sync Logic) ---
  const techHistory = safeApp.details?.technical_history || [];
  const rejectHistory = safeApp.details?.rejection_history || [];
  const dddHistory = safeApp.details?.ddd_history || [];
  const dddToStaffHistory = safeApp.details?.ddd_to_staff_history || [];
  const directorHistory = safeApp.details?.director_history || [];
  const lodComments = safeApp.details?.comments || [];

  let directorIndex = 0;
  let assignIndex = 0;
  let techSeqIndex = 0; // Sequential fallback for tech findings

  const augmentedHistory = safeHistory.map((segment: any) => {
    let comment = null;

    // 1. CATCH LOD (Liaison Office Intake)
    if (segment.staff_id === 'LOD_OFFICER' || segment.division === 'LOD') {
      comment = lodComments[0]?.text || "Dossier Received by Liaison Office";
    }

    // 2. MATCH TECHNICAL REVIEW (Timestamp-First + Round Fallback)
    else if (segment.point === 'Technical Review') {
      let techMatch = techHistory.find((h: any) => {
        const subTime = new Date(h.submitted_at).getTime();
        const segStart = new Date(segment.startTime).getTime();
        const segEnd = segment.endTime ? new Date(segment.endTime).getTime() : null;
        return subTime >= segStart && (!segEnd || subTime <= segEnd + 5000);
      });

      if (!techMatch && segment.endTime && techHistory[techSeqIndex]) {
        techMatch = techHistory[techSeqIndex];
      }

      comment = techMatch?.findings || "Technical review in progress...";
      if (segment.endTime) techSeqIndex++;
    }

    // 3. MATCH DDD (Rejections, Recommendations, and Assignments)
    else if (segment.point === 'Divisional Deputy Director') {
      const segEndTime = segment.endTime ? new Date(segment.endTime).getTime() : null;

      const rejection = rejectHistory.find((r: any) => {
        const rejTime = new Date(r.rejected_at).getTime();
        return segEndTime && Math.abs(rejTime - segEndTime) < 5000;
      });

      const recommendation = dddHistory.find((d: any) => {
        const recTime = new Date(d.timestamp).getTime();
        return segEndTime && Math.abs(recTime - segEndTime) < 5000;
      });

      const assignment = dddToStaffHistory[assignIndex];
      comment = rejection?.reason || recommendation?.note || assignment?.instruction || null;
      
      if (!rejection && !recommendation && assignment) {
        assignIndex++;
      }
    }

    // 4. MATCH DIRECTOR (General instructions)
    else if (segment.point === 'Director' && segment.staff_id !== 'LOD_OFFICER') {
      comment = directorHistory[directorIndex]?.instruction || null;
      directorIndex++;
    }

    return { ...segment, comments: comment };
  });

  // Latest DDD Note for the summary box
  const latestDDDNote = safeApp.details?.ddd_history?.slice(-1)[0]?.note || 
                        safeApp.details?.ddd_to_staff_history?.slice(-1)[0]?.instruction;

  useEffect(() => {
    setIsMounted(true);
    if (isCleared && safeApp?.details?.director_final_notes) {
        setComments(safeApp.details.director_final_notes);
    }
  }, [safeApp, isCleared]);

  const handleAction = async (decision: 'APPROVE' | 'REJECT') => {
    if (decision === 'APPROVE' && !comments.trim()) {
      alert("Please enter final notes before issuing certificate.");
      return;
    }

    startTransition(async () => {
      const result = await issueFinalClearance(safeApp.id, comments);
      if (result.success) {
        alert(decision === 'APPROVE' ? "Authorization complete!" : "Application Rejected.");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-white border-r shadow-inner">
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full border-none" title="Dossier Preview" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 text-center px-10 italic text-sm">
            Reviewing Original Dossier Document
          </div>
        )}
      </div>

      {/* RIGHT: DIRECTOR'S PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto bg-slate-50/30">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tighter uppercase italic">
              {isCleared ? "Issuance Record" : "Final Authorization"}
            </h1>
            <p className="text-slate-500 font-medium font-mono text-xs">
              Ref: <span className="text-blue-600 font-bold">{safeApp?.applicationNumber}</span>
            </p>
          </div>
          {isCleared && (
            <span className="bg-emerald-500 text-white px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest">
              CLEARED
            </span>
          )}
        </header>

        {/* ARCHIVE LINK */}
        {isCleared && safeApp.details?.archived_path && (
          <div className="mb-6 p-4 bg-white border-2 border-emerald-500 rounded-2xl shadow-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-emerald-50 rounded-lg">
                <FileText className="w-5 h-5 text-emerald-600" />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1 text-emerald-600">Vault Access Enabled</p>
                <p className="text-xs text-slate-700 font-mono font-bold truncate max-w-[180px]">
                  {safeApp.details.archived_path}
                </p>
              </div>
            </div>
            <a 
              href={getArchiveUrl(safeApp.details.archived_path)} 
              target="_blank" 
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-[10px] font-black rounded-lg hover:bg-emerald-700 uppercase shadow-md active:scale-95"
            >
              Open PDF
            </a>
          </div>
        )}

        {/* Audit Trail Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6 flex items-center gap-2">
            <ShieldCheck className="w-3 h-3" /> Dossier Lifecycle Audit
          </h2>
          <AuditTrail segments={augmentedHistory} />
        </div>

        {/* DECISION BOX */}
        <div className="mt-auto bg-white p-6 rounded-2xl border-2 border-slate-900 shadow-2xl space-y-6">
          
          {!isCleared && latestDDDNote && (
            <div className="bg-blue-600 p-4 rounded-xl shadow-lg relative overflow-hidden">
              <label className="flex items-center gap-2 text-[10px] font-black text-blue-100 uppercase tracking-widest mb-2">
                <Info className="w-3 h-3" /> Technical Recommendation
              </label>
              <p className="text-sm text-white font-medium italic leading-relaxed">
                "{latestDDDNote}"
              </p>
            </div>
          )}

          <div className="space-y-2">
            <label className="block text-[10px] font-black uppercase text-slate-500 tracking-widest ml-1">
              Director's Final Minute
            </label>

            {isCleared ? (
              <div className="w-full p-4 bg-slate-50 border-2 border-dashed rounded-xl text-sm text-slate-600 italic">
                {comments || "No final notes were provided."}
                <div className="mt-3 flex items-center gap-2 text-emerald-600 font-black text-[9px] uppercase tracking-tighter">
                  <ShieldCheck className="w-3 h-3" /> Integrity Verified
                </div>
              </div>
            ) : (
              <textarea
                disabled={!canIssue || isPending}
                className="w-full p-4 border-2 border-slate-100 rounded-xl text-sm focus:border-blue-500 outline-none text-slate-800 disabled:bg-slate-50 italic transition-all"
                placeholder={canIssue ? "Enter final remarks..." : "Waiting for technical review..."}
                rows={3}
                value={comments}
                onChange={(e) => setComments(e.target.value)}
              />
            )}
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {isCleared ? (
              isMounted && (
                <PDFDownloadLink
                  document={
                    safeApp.type === "Facility Verification" ? (
                      <ClearanceLetter data={{
                        appNumber: safeApp.applicationNumber,
                        companyName: safeApp.company?.name,
                        companyAddress: safeApp.company?.address,
                        factoryName: safeApp.details?.factory_name,
                        factoryAddress: safeApp.details?.factory_address,
                        products: safeApp.details?.products || []
                      }} />
                    ) : (
                      <GmpCertificate data={{
                        factoryName: safeApp.details?.factory_name,
                        factoryAddress: safeApp.details?.factory_address,
                        productLines: safeApp.details?.products,
                        refNumber: safeApp.applicationNumber
                      }} />
                    )
                  }
                  fileName={`${safeApp.type}_${safeApp.applicationNumber}.pdf`}
                  className="bg-slate-900 hover:bg-black text-white py-4 rounded-xl font-black text-center transition-all shadow-xl flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  {({ loading }) => loading ? "GENERATING..." : <><Download className="w-4 h-4" /> Download Certificate</>}
                </PDFDownloadLink>
              )
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={isPending || !canIssue || !comments.trim()}
                  onClick={() => handleAction('APPROVE')}
                  className="py-4 rounded-xl font-black transition-all uppercase tracking-widest text-[10px] bg-emerald-600 hover:bg-emerald-700 text-white shadow-lg active:scale-95 disabled:bg-slate-100"
                >
                  {isPending ? "SIGNING..." : `ISSUE CERTIFICATE`}
                </button>
                <button
                  disabled={isPending || !canIssue}
                  onClick={() => handleAction('REJECT')}
                  className="py-4 rounded-xl font-black transition-all uppercase tracking-widest text-[10px] bg-rose-600 hover:bg-rose-700 text-white shadow-lg active:scale-95 disabled:bg-slate-50"
                >
                  REJECT
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}