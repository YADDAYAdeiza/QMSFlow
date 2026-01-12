"use client"

import { useState } from "react";
import { submitStaffReview } from "@/lib/actions/staff";
import { useRouter } from "next/navigation";

export default function ReviewSubmissionForm({ appId, division, staffId }: { appId: number, division: string, staffId:string }) {
  const [findings, setFindings] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

const handleComplete = async () => {
    if (!findings.trim()) return alert("Please enter your technical findings.");
    
    setIsSubmitting(true);
    try {
      const response = await submitStaffReview(appId, division, findings, staffId);
      
      if (response.success) {
        // Use window.location for a "hard" refresh if router.push feels glitchy
        // or keep router.push for the SPA feel.
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
    <div className="flex flex-col h-full gap-4">
      <div className="flex-grow">
        <label className="text-xs font-bold text-gray-400 uppercase mb-2 block">
          Technical Observations & Findings
        </label>
        {/* <textarea
          className="w-full h-64 p-4 border rounded-xl shadow-inner bg-gray-50 focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none transition-all resize-none"
          placeholder="Enter detailed technical review here..."
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
        /> */}
        <textarea
          className="w-full h-48 p-4 border rounded shadow-inner"
          placeholder="Enter your technical findings and recommendations here..."
          value={findings}
          onChange={(e) => setFindings(e.target.value)}
        />
      </div>

      <button
        onClick={handleComplete}
        disabled={isSubmitting}
        className={`w-full py-4 rounded-xl font-bold text-white transition-all shadow-lg ${
          isSubmitting ? 'bg-gray-400' : 'bg-slate-900 hover:bg-black active:scale-95'
        }`}
      >
        {isSubmitting ? "Processing..." : "Submit Final Review"}
      </button>
    </div>
  );
}