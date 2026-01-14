"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitStaffReview } from '@/lib/actions/staff';
import { RotateCcw, MessageSquare, History } from 'lucide-react';

interface StaffReviewFormProps {
  appId: number;
  division: string;
  history: any[]; // Pass the history array here
}

export default function StaffReviewForm({ appId, division, history }: StaffReviewFormProps) {
  const [isPending, startTransition] = useTransition();
  const [findings, setFindings] = useState("");
  const router = useRouter();

  // --- QMS REWORK LOGIC ---
  // Filter for all DDD comments to show the staff why it was sent back
  const dddRejections = history
    .filter((s: any) => s.point === 'Divisional Deputy Director' && s.comments)
    .reverse();

  const handleComplete = () => {
    if (!findings.trim()) return alert("Findings are required to complete review.");

    startTransition(async () => {
      const result = await submitStaffReview(appId, division, findings);
      if (result.success) {
        alert("Review Submitted. Clock Stopped.");
        router.refresh(); // Refresh the data
        router.push(`/dashboard/${division.toLowerCase()}`);
      } else {
        alert("Failed to submit review.");
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* 1. THE REWORK INSTRUCTIONS BOX (Only shows if there are rejections) */}
      {dddRejections.length > 0 && (
        <div className="p-5 border-2 border-rose-100 rounded-xl bg-rose-50/50 shadow-sm">
          <div className="flex items-center gap-2 mb-4 text-rose-700">
            <History className="w-5 h-5" />
            <h3 className="text-sm font-black uppercase tracking-tight">
              DDD Rejection History ({dddRejections.length})
            </h3>
          </div>

          <div className="space-y-4 max-h-60 overflow-y-auto pr-2">
            {dddRejections.map((rej: any, i: number) => (
              <div key={rej.id || i} className="relative pl-6 border-l-2 border-rose-200 py-1">
                <div className="absolute -left-[5px] top-2 w-2 h-2 rounded-full bg-rose-400" />
                <div className="flex justify-between items-center mb-1">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">
                    Round {dddRejections.length - i}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    {new Date(rej.endTime).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-slate-800 italic leading-relaxed">
                  "{rej.comments.replace('REWORK TRIGGERED BY DDD: ', '').replace('REJECTED: ', '')}"
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 2. THE FINDINGS INPUT */}
      <div className="p-6 border-2 border-blue-100 rounded-xl bg-blue-50/30">
        <div className="flex items-center gap-2 mb-4 text-gray-800">
          <MessageSquare className="w-5 h-5 text-blue-600" />
          <h2 className="font-bold text-lg">Your Technical Findings</h2>
        </div>
        
        <textarea
          className="w-full h-64 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white"
          placeholder="Address the DDD's comments and enter your updated technical observations..."
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
          disabled={isPending}
        />

        <button
          onClick={handleComplete}
          disabled={isPending || !findings.trim()}
          className="w-full mt-4 bg-green-600 text-white font-black py-4 rounded-xl hover:bg-green-700 disabled:bg-gray-400 transition-all active:scale-[0.98] shadow-lg shadow-green-900/20"
        >
          {isPending ? "Closing QMS Timer..." : "SUBMIT TO DDD & STOP CLOCK"}
        </button>
        
        <p className="text-center text-[10px] text-slate-400 mt-3 font-medium uppercase tracking-widest">
          Action will be logged in the QMS Audit Trail
        </p>
      </div>
    </div>
  );
}