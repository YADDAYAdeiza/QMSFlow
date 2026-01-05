"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { submitStaffReview } from '@/lib/actions/staff';

export default function StaffReviewForm({ appId, division }: { appId: number, division: string }) {
  const [isPending, startTransition] = useTransition();
  const [findings, setFindings] = useState("");
  const router = useRouter();

  const handleComplete = () => {
    if (!findings.trim()) return alert("Findings are required to complete review.");

    startTransition(async () => {
      await submitStaffReview(appId, division, findings);
      alert("Review Submitted. Clock Stopped.");
      router.push(`/dashboard/${division}`);
    });
  };

  return (
    <div className="mt-6 p-6 border-2 border-blue-100 rounded-xl bg-blue-50/30">
      <h2 className="font-bold text-gray-800 mb-4 text-lg">Your Technical Findings</h2>
      <textarea
        className="w-full h-48 p-4 border rounded-lg shadow-sm focus:ring-2 focus:ring-blue-500 outline-none"
        placeholder="Enter your detailed technical observations here..."
        value={findings}
        onChange={(e) => setFindings(e.target.value)}
        disabled={isPending}
      />
      <button
        onClick={handleComplete}
        disabled={isPending || !findings.trim()}
        className="w-full mt-4 bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 disabled:bg-gray-400 transition-colors"
      >
        {isPending ? "Closing Timer..." : "Submit to DDD & Stop Clock"}
      </button>
    </div>
  );
}