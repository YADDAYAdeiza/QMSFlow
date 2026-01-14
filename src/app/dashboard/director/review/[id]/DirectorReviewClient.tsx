"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import dynamic from 'next/dynamic';

// 1. DYNAMIC IMPORTS
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
  // --- SANITIZATION: Strips hidden Drizzle methods to prevent "su is not a function" ---
  const safeApp = JSON.parse(JSON.stringify(app));
  const safeHistory = JSON.parse(JSON.stringify(history));

  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  // --- QMS LOGIC GATES ---
  const isCleared = safeApp.status === 'CLEARED';
 
  const hasDivisionsReviewed = safeHistory?.some((seg: any) =>
    ["VMD", "AFPD", "PAD", "IRSD"].includes(seg.division) && seg.endTime !== null
  );

  const isDirectorsTurn = safeApp.currentPoint === 'Director';
  const canIssue = isDirectorsTurn && hasDivisionsReviewed;

  useEffect(() => {
    setIsMounted(true);
    if (isCleared && safeApp?.details?.director_final_notes) {
        setComments(safeApp.details.director_final_notes);
    }
  }, [safeApp, isCleared]);

  const handleAction = async (decision: 'APPROVE' | 'REJECT') => {
    startTransition(async () => {
      const result = await issueFinalClearance(safeApp.id, comments);
      if (result.success) {
        alert(decision === 'APPROVE' ? "Authorization complete! Download link is now available." : "Application Rejected.");
        router.refresh();
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
     
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-white border-r shadow-inner">
        {pdfUrl ? (
          <iframe
            src={pdfUrl}
            className="w-full h-full border-none"
            title="Dossier Preview"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 flex-col space-y-2 text-center px-10">
             <p className="italic text-sm">Reviewing Original Dossier Document</p>
          </div>
        )}
      </div>

      {/* RIGHT: DIRECTOR'S PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <header className="mb-6 flex justify-between items-start">
          <div>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
              {isCleared ? "Issuance Record" : "Final Authorization"}
            </h1>
            <p className="text-slate-500 font-medium">
              Reference: <span className="font-mono text-blue-600 font-bold">{safeApp?.applicationNumber || 'N/A'}</span>
            </p>
          </div>
          {isCleared && (
            <span className="bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full text-[10px] font-black uppercase border border-emerald-200">
              Archived & Cleared
            </span>
          )}
        </header>

        {/* Audit Trail Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            Dossier Lifecycle Audit
          </h2>
          <AuditTrail segments={safeHistory || []} />
        </div>

        {/* DECISION BOX */}
        <div className="mt-auto bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
         
          {/* STAFF FINDINGS DISPLAY */}
          {!isCleared && (
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6">
              <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Technical Staff Findings</label>
              <p className="text-sm text-slate-700 italic leading-relaxed">
                "{safeHistory?.find((s: any) => s.point === 'Technical Review')?.comments || "No technical comments were logged."}"
              </p>
            </div>
          )}

          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Director's Final Notes
          </label>

          {isCleared ? (
            <div className="w-full p-3 bg-slate-50 border rounded-lg mb-4 text-sm text-slate-600 italic border-dashed">
              {comments || "No final notes were provided."}
              <p className="mt-2 text-[10px] not-italic font-bold text-emerald-600 uppercase">
                ✓ Document Integrity Verified
              </p>
            </div>
          ) : (
            <textarea
              disabled={!canIssue || isPending}
              className="w-full p-3 border rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800 disabled:bg-slate-50 disabled:cursor-not-allowed"
              placeholder={canIssue ? "Enter final remarks for the certificate..." : "Waiting for Technical divisions..."}
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          )}
         
          <div className="grid grid-cols-1 gap-4">
            {isCleared ? (
              /* THE PDF DOWNLOAD LINK */
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
                  className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-black text-center transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {({ loading }) => (
                    loading ? "GENERATING FILE..." : `📥 DOWNLOAD ${safeApp.type.toUpperCase()}`
                  )}
                </PDFDownloadLink>
              )
            ) : (
              /* THE ACTION BUTTONS */
              <div className="grid grid-cols-2 gap-4">
                <button
                  disabled={isPending || !canIssue}
                  onClick={() => handleAction('APPROVE')}
                  className={`py-4 rounded-lg font-black transition-all ${
                    !canIssue
                    ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                    : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-md active:scale-95'
                  }`}
                >
                  {isPending ? "PROCESSING..." : `ISSUE CERTIFICATE`}
                </button>
                <button
                  disabled={isPending || !canIssue}
                  onClick={() => handleAction('REJECT')}
                  className={`py-4 rounded-lg font-black transition-all ${
                    !canIssue
                    ? 'bg-slate-100 text-slate-300 cursor-not-allowed border border-slate-200'
                    : 'bg-rose-600 hover:bg-rose-700 text-white shadow-md active:scale-95'
                  }`}
                >
                  REJECT
                </button>
              </div>
            )}
          </div>

          {!canIssue && !isCleared && (
             <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-lg flex items-center gap-3">
                <div className="animate-pulse w-2 h-2 bg-amber-500 rounded-full"></div>
                <p className="text-[10px] font-bold text-amber-700 uppercase tracking-tight">
                  {isDirectorsTurn ? "Awaiting Technical Recommendation" : "Not yet at Director Desk"}
                </p>
             </div>
          )}
        </div>
      </div>
    </div>
  );
}