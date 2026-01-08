"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import dynamic from 'next/dynamic';

// 1. Dynamic Imports with SSR disabled
const PDFDownloadLink = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.PDFDownloadLink),
  { ssr: false }
);

const ClearanceLetter = dynamic(
  () => import('@react-pdf/renderer').then((mod) => mod.ClearanceLetter),
  { ssr: false }
);

export default function DirectorReviewClient({ history, app, pdfUrl }: any) {
  const [isPending, startTransition] = useTransition();
  const [comments, setComments] = useState("");
  const router = useRouter();
  
  // 2. The Mounted State
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    // If the app is already cleared, populate the comments from the DB
    if (app?.status === 'CLEARED' && app?.details?.director_final_notes) {
        setComments(app.details.director_final_notes);
    }
  }, [app]);

  const handleAction = async (decision: 'APPROVE' | 'REJECT') => {
    startTransition(async () => {
      const result = await issueFinalClearance(app.id, comments);
      if (result.success) {
        alert(decision === 'APPROVE' ? "Certificate Issued!" : "Application Rejected.");
        router.refresh(); 
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* LEFT: Dossier Preview */}
      <div className="w-1/2 h-full bg-white border-r">
        <iframe src={pdfUrl} className="w-full h-full border-none" />
      </div>

      {/* RIGHT: Director's Panel */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            FINAL CLEARANCE
          </h1>
          <p className="text-slate-500 font-medium italic">
            App ID: {app?.applicationNumber || '42'}
          </p>
        </div>

        {/* Audit Trail Section */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-6">
            Dossier Lifecycle Audit
          </h2>
          <AuditTrail segments={history || []} />
        </div>

        {/* Director's Decision Box */}
        <div className="mt-auto bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
          <label className="block text-xs font-bold uppercase text-slate-500 mb-2">
            Director's Final Notes
          </label>

          {app?.status === 'CLEARED' ? (
            <div className="w-full p-3 bg-slate-50 border rounded-lg mb-4 text-sm text-slate-600 italic border-dashed">
              {comments || "No final notes were provided during clearance."}
              <p className="mt-2 text-[10px] not-italic font-bold text-emerald-600 uppercase">
                ✓ Record Locked on Issuance
              </p>
            </div>
          ) : (
            <textarea 
              className="w-full p-3 border rounded-lg mb-4 text-sm focus:ring-2 focus:ring-blue-500 outline-none text-slate-800"
              placeholder="Enter final clearance remarks here..."
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
            />
          )}
          
          <div className="grid grid-cols-1 gap-4">
            {app?.status === 'CLEARED' ? (
              /* 3. Wrap with isMounted check to prevent Node.js errors */
              isMounted && (
                <PDFDownloadLink
                  document={
                    <ClearanceLetter data={{
                      appNumber: app.applicationNumber,
                      companyName: app.company?.name,
                      companyAddress: app.company?.address,
                      factoryName: app.details?.factory_name,
                      factoryAddress: app.details?.factory_address,
                      products: app.details?.products || []
                    }} />
                  }
                  fileName={`Clearance_${app.applicationNumber}.pdf`}
                  className="bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-lg font-black text-center transition-all shadow-lg flex items-center justify-center gap-2"
                >
                  {({ loading }) => (
                    loading ? "GENERATING DOCUMENT..." : "📥 DOWNLOAD CLEARANCE LETTER"
                  )}
                </PDFDownloadLink>
              )
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={isPending}
                  onClick={() => handleAction('APPROVE')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-lg font-black transition-all disabled:opacity-50"
                >
                  {isPending ? "PROCESSING..." : "ISSUE CERTIFICATE"}
                </button>
                <button 
                  disabled={isPending}
                  onClick={() => handleAction('REJECT')}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-lg font-black transition-all disabled:opacity-50"
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