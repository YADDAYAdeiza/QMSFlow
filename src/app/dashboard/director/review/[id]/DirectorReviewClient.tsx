"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { pdf } from '@react-pdf/renderer';
import { createClient } from "@/utils/supabase/client";
import AuditTrail from "@/components/AuditTrail";
import { issueFinalClearance } from "@/lib/actions/director";
import { ClearanceLetter } from "@/components/documents/ClearanceLetter";
import { GmpCertificate } from "@/components/documents/GmpCertificate";
import { ShieldCheck, Download, Eye, CheckCircle2, Lock, FileCheck } from "lucide-react"; 

export default function DirectorReviewClient({ comments, app, pdfUrl }: any) {
  const supabase = createClient();
  const [isPending, startTransition] = useTransition();
  const [remarks, setRemarks] = useState("");
  const [hasPreviewed, setHasPreviewed] = useState(false);
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => { setIsMounted(true); }, []);

  const isCleared = app.status === 'CLEARED';
  const appDetails = app.details || {};
  
  // Logic to determine which document type to generate
  const isGmpType = appDetails.type?.toLowerCase().includes("inspection");

  const handleIssueAndArchive = async () => {
    if (!remarks.trim()) return alert("QMS Requirement: Director's Final Minute is required.");
    
    startTransition(async () => {
      try {
        // 1. Prepare Data for PDF Template
        // Normalizing data from LOD form and Technical Review for the PDF
        const docData = {
          appNumber: app.applicationNumber,
          companyName: app.company?.name || "N/A",
          companyAddress: appDetails.companyAddress || "",
          factoryName: appDetails.factoryName || app.company?.name,
          factoryAddress: appDetails.factoryAddress || appDetails.companyAddress,
          products: appDetails.products || [appDetails.productCategory],
          productLines: appDetails.products || [appDetails.productCategory],
          refNumber: app.applicationNumber
        };

        // 2. Generate PDF Blob based on Application Type
        const Template = isGmpType ? GmpCertificate : ClearanceLetter;
        const blob = await pdf(<Template data={docData} />).toBlob();

        // 3. Define Naming and Path
        const cleanCo = (app.company?.name || "CO").replace(/[^a-z0-9]/gi, '_').toUpperCase();
        const docName = isGmpType ? "GMP_NOTIFICATION" : "FACILITY_CLEARANCE";
        const storagePath = `${cleanCo}/App-${app.id}/${docName}.pdf`;

        // 4. Upload to Supabase 'Documents' bucket
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, blob, { 
            upsert: true, 
            contentType: 'application/pdf' 
          });

        if (uploadError) throw new Error(`Storage Error: ${uploadError.message}`);

        // 5. Update Database (Drizzle Action)
        const result = await issueFinalClearance(app.id, remarks, storagePath);
        
        if (result.success) {
          router.refresh();
        } else {
          alert(result.error);
        }
      } catch (err: any) {
        console.error(err);
        alert(err.message || "An unexpected error occurred.");
      }
    });
  };

  if (!isMounted) return null;

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden font-sans">
      {/* LEFT: DOSSIER PREVIEW */}
      <div className="w-1/2 h-full bg-slate-200 border-r border-slate-300">
        {pdfUrl ? (
          <iframe src={`${pdfUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-2">
            <FileCheck className="w-12 h-12 opacity-20" />
            <p className="font-black uppercase text-[10px] tracking-widest">No Preview Available</p>
          </div>
        )}
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <header className="mb-8 flex justify-between items-end">
          <div>
            <span className="px-2 py-0.5 bg-blue-600 text-white text-[9px] font-black uppercase tracking-[0.2em] rounded mb-2 inline-block">
              {isGmpType ? "GMP Audit Review" : "Facility Clearance"}
            </span>
            <h1 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">
              {isCleared ? "Issuance Complete" : "Final Authorization"}
            </h1>
            <p className="text-slate-400 font-mono text-[10px] mt-2">REF: {app.applicationNumber}</p>
          </div>
          {isCleared && (
            <div className="bg-emerald-500 text-white px-4 py-2 rounded-xl text-[10px] font-black uppercase flex items-center gap-2 shadow-lg shadow-emerald-100">
              <CheckCircle2 className="w-4 h-4" /> Cleared & Archived
            </div>
          )}
        </header>

        {/* UNIFIED AUDIT TRAIL */}
        <div className="bg-white rounded-3xl border border-slate-200 p-8 mb-8 shadow-sm">
          <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-blue-600" /> Full Process Lifecycle
          </h2>
          <AuditTrail comments={comments} />
        </div>

        {/* DIRECTOR EXECUTION BOX */}
        <div className="mt-auto bg-slate-900 p-8 rounded-[2.5rem] text-white shadow-2xl space-y-6 border-t border-white/10">
          <div className="space-y-3">
            <div className="flex items-center gap-2 ml-1">
              <Lock className="w-3 h-3 text-blue-400" />
              <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
                Director's Final Decision Minute
              </label>
            </div>
            <textarea
              disabled={isPending || isCleared}
              className="w-full p-5 bg-slate-800/50 border border-white/5 rounded-2xl text-sm italic text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-600 resize-none"
              rows={3}
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              placeholder={isCleared ? "Application closed." : "Enter final remarks for the certificate generation..."}
            />
          </div>
          
          <div className="grid grid-cols-1 gap-4">
            {isCleared ? (
               <button 
                onClick={() => {
                   const { data } = supabase.storage.from('documents').getPublicUrl(appDetails.archived_path);
                   window.open(data.publicUrl, '_blank');
                }}
                className="py-5 rounded-2xl font-black uppercase text-xs bg-emerald-600 text-white shadow-xl hover:bg-emerald-500 transition-all flex items-center justify-center gap-2"
              >
                <Download className="w-4 h-4" /> Download Generated Certificate
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => setHasPreviewed(true)}
                  className={`py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 transition-all ${
                    hasPreviewed ? "bg-blue-600 border-blue-600 text-white" : "bg-transparent border-slate-700 text-slate-400 hover:border-slate-500"
                  }`}
                >
                  {hasPreviewed ? "System Ready" : "1. Verify Draft Contents"}
                </button>

                <button
                  disabled={isPending || !remarks.trim() || !hasPreviewed}
                  onClick={handleIssueAndArchive}
                  className="py-5 rounded-2xl font-black uppercase text-xs bg-white text-slate-900 shadow-xl active:scale-95 disabled:bg-slate-800 disabled:text-slate-600 transition-all flex items-center justify-center"
                >
                  {isPending ? "Generating PDF & Archiving..." : "2. Execute & Issue Certificate"}
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}