"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Upload, FileCheck, ExternalLink, Loader2, Send, MessageSquare, History } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { submitToDDD } from "@/lib/actions/staff";

interface Props {
  appId: number;
  division: string;
  staffId: string;
  comments: any[];
  isHubVetting: boolean;
}

export default function ReviewSubmissionForm({ 
  appId, 
  division, 
  staffId, 
  comments, 
  isHubVetting 
}: Props) {
  const [uploading, setUploading] = useState(false);
  const [reportUrl, setReportUrl] = useState("");
  const [remarks, setRemarks] = useState("");
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  const themeColor = isHubVetting ? "emerald" : "blue";
  const bgClass = isHubVetting ? "bg-emerald-50 border-emerald-100" : "bg-slate-50 border-slate-100";
  const iconBg = isHubVetting ? "bg-emerald-600" : "bg-blue-600";
  const btnClass = isHubVetting ? "bg-emerald-600 hover:bg-emerald-700" : "bg-slate-900 hover:bg-slate-800";

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      setUploading(true);
      const file = e.target.files?.[0];
      if (!file) return;

      const fileExt = file.name.split('.').pop();
      const fileName = `${isHubVetting ? 'verification' : 'tech_report'}_${appId}_${Date.now()}.${fileExt}`;
      const filePath = `${isHubVetting ? 'hub_vetting' : 'technical_reviews'}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
      setReportUrl(data.publicUrl);
    } catch (error: any) {
      alert("Upload failed: " + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async () => {
    if (!remarks.trim()) return alert("Please provide your findings/remarks.");
    if (isHubVetting && !reportUrl) {
      return alert("QMS Requirement: A signed verification report must be attached for Hub Vetting.");
    }

    startTransition(async () => {
      const res = await submitToDDD(appId, staffId, remarks, isHubVetting, reportUrl);
      if (res.success) {
        router.push(`/dashboard/staff?division=${division.toLowerCase()}`);
        router.refresh();
      } else {
        alert(res.error || "Submission failed. Please try again.");
      }
    });
  };

  return (
    <div className="space-y-8">
      {/* 1. AUDIT TRAIL SECTION (Added this) */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <History className="w-4 h-4 text-slate-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Application Narrative</h4>
        </div>
        
        <div className="space-y-4">
          {comments && comments.length > 0 ? (
            comments.slice().reverse().map((c: any, i: number) => (
              <div key={i} className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm relative overflow-hidden">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter">
                    {c.from} <span className="text-slate-300 mx-1">•</span> {c.role}
                  </span>
                  <span className="text-[8px] font-medium text-slate-400 font-mono">
                    {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : ''}
                  </span>
                </div>
                <p className="text-[11px] text-slate-600 italic leading-relaxed">"{c.text}"</p>
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-slate-100" />
              </div>
            ))
          ) : (
            <div className="text-center py-6 border-2 border-dashed border-slate-100 rounded-[2rem]">
              <p className="text-[9px] font-bold text-slate-300 uppercase tracking-widest">No previous remarks found</p>
            </div>
          )}
        </div>
      </div>

      {/* 2. SUBMISSION FORM SECTION */}
      <div className={`rounded-[2.5rem] p-8 space-y-6 border-2 transition-all duration-500 ${bgClass}`}>
        <div className="flex items-center gap-3">
          <div className={`${iconBg} p-2 rounded-xl shadow-md transition-colors`}>
            {isHubVetting ? <FileCheck className="w-5 h-5 text-white" /> : <MessageSquare className="w-5 h-5 text-white" />}
          </div>
          <h3 className={`text-sm font-black uppercase tracking-tight ${isHubVetting ? 'text-emerald-900' : 'text-slate-900'}`}>
            {isHubVetting ? 'Finalize Verification' : 'Current Review Action'}
          </h3>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {/* UPLOAD ZONE */}
          <div className="relative group">
            <input 
              type="file" 
              onChange={handleFileUpload}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 disabled:cursor-not-allowed"
              accept=".pdf"
              disabled={uploading || isPending}
            />
            <div className={`border-2 border-dashed rounded-3xl p-8 flex flex-col items-center justify-center transition-all bg-white ${
              reportUrl ? `border-${themeColor}-500 shadow-sm` : `border-slate-200 group-hover:border-${themeColor}-400`
            }`}>
              {uploading ? (
                <Loader2 className={`w-8 h-8 animate-spin text-blue-600`} />
              ) : reportUrl ? (
                <>
                  <FileCheck className={`w-8 h-8 mb-2 text-emerald-600`} />
                  <p className="text-[10px] font-bold uppercase text-emerald-700">Report Attached</p>
                </>
              ) : (
                <>
                  <Upload className="w-8 h-8 text-slate-300 mb-2 group-hover:scale-110 transition-transform" />
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-tight">
                    Attach {isHubVetting ? 'Verification' : 'Technical'} PDF
                  </p>
                </>
              )}
            </div>
          </div>

          <textarea 
            placeholder={isHubVetting ? "Enter final hub vetting remarks..." : "Enter technical findings..."}
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            disabled={isPending}
            className="w-full h-40 bg-white border border-slate-100 rounded-3xl p-5 text-xs outline-none focus:ring-2 focus:ring-blue-500 shadow-inner resize-none"
          />

          <button 
            onClick={handleSubmit}
            disabled={isPending || uploading || (isHubVetting && !reportUrl)}
            className={`w-full py-5 rounded-3xl font-black uppercase text-[10px] tracking-widest transition-all shadow-lg flex items-center justify-center gap-2 text-white ${btnClass} disabled:opacity-50`}
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Submit To Superior"} 
            <Send className="w-3 h-3" />
          </button>
        </div>

        <p className="text-center text-[8px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          QMS Secure Transmission • Part of {division} Workflow
        </p>
      </div>
    </div>
  );
}