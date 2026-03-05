"use client";

import { useState } from "react";
import { submitToDDD } from "@/lib/actions/staff"; // You will need to create/update this action
import { useRouter } from "next/navigation";
import { Send, Loader2, MessageSquareText } from "lucide-react";

export default function ReviewSubmissionForm({ 
  appId, 
  division, 
  staffId, 
  comments,
  isHubVetting 
}: { 
  appId: number; 
  division: string; 
  staffId: string; 
  comments: any[];
  isHubVetting: boolean;
}) {
  const [remarks, setRemarks] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit() {
    if (!remarks) return alert("Please provide your assessment remarks.");
    
    setLoading(true);
    try {
      // This action will handle both Technical and IRSD returns
      const res = await submitToDDD(appId, staffId, remarks, isHubVetting);
      if (res.success) {
        router.push(`/dashboard/staff?division=${division.toLowerCase()}`);
        router.refresh();
      } else {
        alert(res.error);
      }
    } catch (e) {
      alert("Submission failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Conversation History (Last 3 comments) */}
      <div className="space-y-4 mb-8">
        <h4 className="text-[10px] font-black uppercase text-slate-400 tracking-widest flex items-center gap-2">
          <MessageSquareText className="w-3 h-3" /> History
        </h4>
        {comments.slice(-3).map((c, i) => (
          <div key={i} className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
            <p className="text-[9px] font-bold text-blue-600 uppercase mb-1">{c.from} ({c.role})</p>
            <p className="text-xs text-slate-600 italic">"{c.text}"</p>
          </div>
        ))}
      </div>

      <div className="space-y-2">
        <label className="text-[10px] font-black uppercase tracking-widest text-slate-900">
          {isHubVetting ? "Hub Vetting Findings" : "Technical Assessment Remarks"}
        </label>
        <textarea
          value={remarks}
          onChange={(e) => setRemarks(e.target.value)}
          className="w-full h-40 p-4 bg-slate-50 border-2 border-slate-100 rounded-[1.5rem] text-sm focus:border-blue-400 focus:outline-none transition-all"
          placeholder={isHubVetting ? "Enter your verification notes for the DD IRSD..." : "Enter your technical findings..."}
        />
      </div>

      <button
        onClick={handleSubmit}
        disabled={loading}
        className="w-full bg-slate-900 hover:bg-blue-600 text-white font-black uppercase tracking-tighter italic p-5 rounded-[1.5rem] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
      >
        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
        {isHubVetting ? "Complete Vetting & Revert to DD IRSD" : "Submit to Divisional Deputy Director"}
      </button>
    </div>
  );
}