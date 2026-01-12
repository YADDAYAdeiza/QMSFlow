"use client"

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import AuditTrail from "@/components/AuditTrail";
import { processDDRecommendation } from "@/lib/actions/workflow"; // We'll create this next
import StaffSelector from "@/components/StaffSelector";

export default function DeputyDirectorReviewClient({ app, history, staffWork, mode, pdfUrl }: any) {
  const [isPending, startTransition] = useTransition();
  const [ddComments, setDdComments] = useState("");
  const router = useRouter();

  const handleDecision = async (decision: 'FORWARD' | 'RETURN') => {
    startTransition(async () => {
      const result = await processDDRecommendation(app.id, decision, ddComments);
      if (result.success) {
        alert(decision === 'FORWARD' ? "Recommended to Director!" : "Returned to Staff for rework.");
        router.push('/dashboard/ddd');
        router.refresh();
      }
    });
  };

  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
      {/* LEFT: THE DOSSIER */}
      <div className="w-1/2 h-full bg-white border-r shadow-inner">
        {pdfUrl ? (
          <iframe src={pdfUrl} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">No PDF Preview Available</div>
        )}
      </div>

      {/* RIGHT: THE CONTROL PANEL */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight uppercase">
            {mode === "VETTING" ? "Management Vetting" : "Initial Assignment"}
          </h1>
          <p className="text-slate-500 font-medium italic">App ID: {app.applicationNumber}</p>
        </div>

        {/* Audit Trail - Crucial for DD to see the timeline */}
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 mb-8">
          <h2 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4">Dossier History</h2>
          <AuditTrail segments={history || []} />
        </div>

        {/* DYNAMIC MODE SWITCHER */}
        <div className="mt-auto bg-white p-6 rounded-xl border-2 border-slate-900 shadow-xl">
          {mode === "VETTING" ? (
            <div className="space-y-6">
              {/* Staff Findings Display */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100">
                <label className="block text-[10px] font-bold text-blue-600 uppercase mb-2">Technical Staff Findings</label>
                <p className="text-sm text-slate-700 italic leading-relaxed">
                  "{staffWork?.comments || "No technical comments were logged."}"
                </p>
                <p className="mt-2 text-[9px] font-bold text-slate-400">Reviewed by: {staffWork?.staffName || 'Division Staff'}</p>
              </div>

              {/* DD Vetting Input */}
              <div>
                <label className="block text-xs font-bold uppercase text-slate-500 mb-2">DD Vetting Remarks</label>
                <textarea 
                  className="w-full p-3 border rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                  placeholder="Add your comments for the Director or instructions for Staff rework..."
                  rows={3}
                  value={ddComments}
                  onChange={(e) => setDdComments(e.target.value)}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button 
                  disabled={isPending}
                  onClick={() => handleDecision('FORWARD')}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white py-4 rounded-lg font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  FORWARD TO DIRECTOR
                </button>
                <button 
                  disabled={isPending}
                  onClick={() => handleDecision('RETURN')}
                  className="bg-rose-600 hover:bg-rose-700 text-white py-4 rounded-lg font-black transition-all shadow-md active:scale-95 disabled:opacity-50"
                >
                  RETURN FOR REWORK
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <p className="text-xs text-amber-700 font-medium">
                  This dossier has no technical review history. It must be assigned to a staff member first.
                </p>
              </div>
              <StaffSelector 
                appId={app.id} 
                division={app.currentDivision || 'VMD'} 
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}