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

export default function ReviewSubmissionForm({ appId, division, staffId, comments }: any) {
  const [findings, setFindings] = useState("");
  const router = useRouter();

  // Filter for only rejection/return actions to show "Rework History"
  const reworks = comments.filter((c: any) => c.action === "RETURNED_FOR_REWORK");

  return (
    <div className="space-y-6">
      {reworks.length > 0 && (
        <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4">
          <span className="text-[10px] font-black text-rose-600 uppercase">Rework History</span>
          <div className="mt-2 space-y-3">
            {reworks.map((r: any, i: number) => (
              <div key={i} className="text-xs bg-white p-2 rounded border border-rose-100">
                <p className="font-bold text-rose-500">Round {r.round}</p>
                <p className="italic">"{r.text}"</p>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea 
        className="w-full h-40 p-4 border-2 rounded-2xl outline-none focus:border-blue-500 bg-slate-50"
        placeholder="Enter technical findings..."
        value={findings}
        onChange={(e) => setFindings(e.target.value)}
      />

      <button 
        onClick={() => submitStaffReview(appId, division, findings, staffId).then(() => router.refresh())}
        className="w-full py-4 bg-slate-900 text-white font-black rounded-2xl"
      >
        SUBMIT FINAL REVIEW
      </button>
    </div>
  );
}