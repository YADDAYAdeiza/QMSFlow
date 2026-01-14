"use client"

import { useState } from "react";
import { submitStaffReview } from "@/lib/actions/staff";
import { useRouter } from "next/navigation";
import { History, MessageSquare, AlertCircle, Clock } from "lucide-react";

interface ReviewSubmissionFormProps {
  appId: number;
  division: string;
  staffId: string;
  app: any; // Passed from page.tsx to access app.details
}

export default function ReviewSubmissionForm({ appId, division, staffId, app }: ReviewSubmissionFormProps) {
  const [findings, setFindings] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  // --- QMS REWORK LOGIC ---
  // We pull directly from the JSONB rejection_history array we created
  const rejectionHistory = app?.details?.rejection_history || [];
  
  // Fallback for the very first rework if the array hasn't been initialized yet
  const latestReason = app?.details?.last_rejection_reason;

  const handleComplete = async () => {
    if (!findings.trim()) return alert("Please enter your technical findings.");
    
    setIsSubmitting(true);
    try {
      const response = await submitStaffReview(appId, division, findings, staffId);
      
      if (response.success) {
        alert("Review Submitted. QMS Timer Stopped.");
        router.push(`/dashboard/${division.toLowerCase()}`);
        router.refresh();
      }
    } catch (error) {
      console.error(error);
      alert("Failed to save review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col h-full gap-6">
      
      {/* 1. REWORK HISTORY SECTION */}
      {(rejectionHistory.length > 0 || latestReason) && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-5 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-rose-700">
            <History className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              DDD Rejection History
            </span>
          </div>
          
          <div className="space-y-4 max-h-56 overflow-y-auto pr-2 custom-scrollbar">
            {rejectionHistory.length > 0 ? (
              [...rejectionHistory].reverse().map((rej, i) => (
                <div key={i} className="bg-white/80 p-3 rounded-xl border border-rose-200/50 shadow-sm">
                  <div className="flex justify-between items-center mb-1">
                    <span className="text-[9px] font-bold text-rose-600 uppercase">
                      Round {rej.round}
                    </span>
                    <span className="text-[9px] text-slate-400 font-mono">
                      {rej.rejected_at ? new Date(rej.rejected_at).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-700 italic leading-relaxed">
                    "{rej.reason}"
                  </p>
                </div>
              ))
            ) : (
              // Fallback for existing legacy reworks or first-time transitions
              <div className="bg-white/80 p-3 rounded-xl border border-rose-200/50">
                <span className="text-[9px] font-bold text-rose-600 uppercase">Latest Remark</span>
                <p className="text-xs text-slate-700 italic leading-relaxed">"{latestReason}"</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 2. FINDINGS INPUT AREA */}
      <div className="flex-grow flex flex-col gap-2">
        <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 px-1">
          <MessageSquare className="w-3 h-3 text-blue-500" />
          Technical Observations & Findings
        </label>
        
        <textarea
          className="flex-grow w-full min-h-[200px] p-5 border-2 border-slate-100 rounded-2xl shadow-inner bg-slate-50/50 focus:bg-white focus:ring-4 focus:ring-blue-500/10 focus:border-blue-500 outline-none transition-all resize-none text-sm leading-relaxed text-slate-800"
          placeholder="Enter your detailed technical review. Address all points raised by the DDD above..."
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          disabled={isSubmitting}
        />
      </div>

      {/* 3. SUBMISSION ACTION */}
      <div className="space-y-4">
        <button
          onClick={handleComplete}
          disabled={isSubmitting}
          className={`w-full py-4 rounded-2xl font-black text-white transition-all shadow-xl uppercase tracking-widest text-xs flex items-center justify-center gap-3 ${
            isSubmitting 
              ? 'bg-slate-300 cursor-not-allowed' 
              : 'bg-slate-900 hover:bg-black active:scale-[0.98] shadow-slate-200'
          }`}
        >
          {isSubmitting ? (
            <>
              <Clock className="w-4 h-4 animate-spin" />
              Finalizing QMS Entry...
            </>
          ) : (
            "Submit Final Review"
          )}
        </button>
        
        <div className="flex items-center justify-center gap-2 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
          <AlertCircle className="w-3 h-3" />
          Stopping Net QMS Timer for this segment
        </div>
      </div>
    </div>
  );
}