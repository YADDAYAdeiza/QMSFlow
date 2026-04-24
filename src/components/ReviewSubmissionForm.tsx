"use client";

import React, { useState, useRef } from "react";
import { 
  ShieldAlert, CheckCircle2, FileText, 
  Loader2, Plus, Trash2, Upload, FileCheck, ChevronDown, ChevronUp,
  Info, Activity, History
} from "lucide-react";
import { submitToDDD } from "@/lib/actions/staff";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";

const GMP_SYSTEMS = [
  "Quality Management System",
  "Production System",
  "Facilities & Equipment System",
  "Laboratory Control System",
  "Materials System",
  "Packaging & Labeling System"
];

const SEVERITIES = ["Critical", "Major", "Other"];

interface Props {
  appId: number;
  staffId: string;
  staffName: string;
  currentDivision: string;
  comments: any[];
  isHubVetting: boolean;
  isComplianceReview: boolean; 
  riskId: string;
  previousFindings?: any[];
  previousIsSra?: boolean;
}

export default function ReviewSubmissionForm({
  appId, staffId, staffName, currentDivision, comments, isHubVetting, isComplianceReview, riskId, 
  previousFindings = [], 
  previousIsSra = false 
}: Props) {
  const router = useRouter();
  const supabase = createClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [loading, setLoading] = useState(false);
  const [isLedgerVisible, setIsLedgerVisible] = useState(true);
  const [isSra, setIsSra] = useState(previousIsSra);
  const [justification, setJustification] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  const [findings, setFindings] = useState<Array<{ id: string; system: string; severity: string; text: string }>>(
    previousFindings.length > 0 ? previousFindings.map(f => ({ ...f, id: Math.random().toString(36).substr(2, 9) })) : []
  );

  const counts = {
    critical: findings.filter(f => f.severity === "Critical" && f.text.trim()).length,
    major: findings.filter(f => f.severity === "Major" && f.text.trim()).length,
    other: findings.filter(f => f.severity === "Other" && f.text.trim()).length,
  };

  const addFinding = () => setFindings([...findings, { id: Math.random().toString(36).substr(2, 9), system: GMP_SYSTEMS[0], severity: "Other", text: "" }]);
  
  const updateFinding = (id: string, field: string, value: string) => {
    setFindings(findings.map(f => f.id === id ? { ...f, [field]: value } : f));
  };

  const removeFinding = (id: string) => setFindings(findings.filter(f => f.id !== id));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isComplianceReview && findings.length === 0 && !confirm("You are submitting a Compliance Audit with zero recorded deficiencies. Proceed?")) {
        return;
    }

    setLoading(true);

    try {
      let publicUrl = "";
      
      if (evidenceFile && !isComplianceReview) {
        const fileExt = evidenceFile.name.split('.').pop();
        const filePath = `verification_evidence/${appId}_report_${Date.now()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(filePath, evidenceFile);
        
        if (uploadError) throw uploadError;

        const { data: { publicUrl: url } } = supabase.storage
          .from('documents')
          .getPublicUrl(filePath);
          
        publicUrl = url;
      }

      const complianceData = {
        riskId,
        isSra,
        isComplianceReview,
        summary: { 
          criticalCount: counts.critical, 
          majorCount: counts.major, 
          otherCount: counts.other 
        },
        findings: findings.filter(f => f.text.trim() !== ""),
      };

      const res = await submitToDDD(
        appId, 
        staffId, 
        justification, 
        isHubVetting, 
        publicUrl, 
        complianceData
      );
      
      if (res.success) {
        // router.push(`/dashboard/${currentDivision.toLowerCase()}/review/${appId}`);
        router.push(`/dashboard/${currentDivision.toLowerCase()}`);
        router.refresh();
      } else {
        throw new Error(res.error); 
      }
    } catch (err: any) {
      alert(err.message || "Submission failed");
    } finally { 
      setLoading(false); 
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12 pb-20 max-w-4xl mx-auto">
      
      <div className="space-y-6">
        <div className="flex items-center gap-4 px-6 text-slate-900 border-l-4 border-amber-500">
          <History className="w-6 h-6 text-amber-600" />
          <h4 className="text-sm font-black uppercase tracking-[0.25em]">Workflow History</h4>
        </div>
        
        <div className="bg-slate-50 border border-slate-200 rounded-[2.5rem] overflow-hidden shadow-inner">
          {comments && comments.length > 0 ? (
            <div className="divide-y divide-slate-200">
              {comments.map((comment, idx) => (
                  <div key={idx} className={`p-6 flex gap-5 items-start transition-colors ${comment.action === 'REWORK_REQUIRED' ? 'bg-rose-50/50 border-l-4 border-rose-500' : 'hover:bg-white'}`}>
                    <div className={`w-10 h-10 rounded-full bg-white border flex items-center justify-center shrink-0 shadow-sm ${comment.action === 'REWORK_REQUIRED' ? 'border-rose-200' : 'border-slate-200'}`}>
                      {comment.action === 'REWORK_REQUIRED' ? (
                        <ShieldAlert className="w-4 h-4 text-rose-500" />
                      ) : (
                        <Activity className="w-4 h-4 text-slate-400" />
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] font-black uppercase text-slate-900 tracking-tight">
                          {comment.from}
                          {comment.action === 'REWORK_REQUIRED' && (
                            <span className="ml-2 text-[9px] bg-rose-600 text-white px-2 py-0.5 rounded-full">REWORK REQUIRED</span>
                          )}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed italic">
                        "{comment.text}"
                      </p>
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="p-10 text-center text-[10px] font-black uppercase text-slate-400 tracking-[0.2em]">
              No previous trail entries found
            </div>
          )}
        </div>
      </div>

      <div className="space-y-6">
        <div 
          onClick={() => setIsLedgerVisible(!isLedgerVisible)}
          className={`flex items-center justify-between p-8 rounded-[2.5rem] transition-all duration-500 border-2 shadow-sm cursor-pointer ${
            isLedgerVisible 
              ? isComplianceReview 
                ? "bg-gradient-to-br from-indigo-950 via-purple-950 to-purple-900 border-purple-500 shadow-xl shadow-purple-500/20" 
                : "bg-slate-900 border-slate-700 shadow-xl shadow-slate-900/40"
              : "bg-white border-slate-200 hover:border-blue-400 hover:shadow-md"
          } ${isComplianceReview ? 'ring-4 ring-purple-500/10' : ''}`}
        >
          <div className="flex items-center gap-6">
            <div className={`p-4 rounded-2xl ${isLedgerVisible ? 'bg-white/10' : 'bg-slate-100'}`}>
              <ShieldAlert className={`w-7 h-7 ${isLedgerVisible ? "text-rose-400" : "text-slate-500"}`} />
            </div>
            <div>
              <h4 className={`text-base font-black uppercase tracking-[0.2em] ${isLedgerVisible ? "text-white" : "text-slate-900"}`}>
                {isComplianceReview ? "Compliance Audit Ledger" : "Deficiency Ledger"}
              </h4>
              <p className={`text-[11px] font-bold uppercase tracking-widest mt-1 ${isLedgerVisible ? "text-purple-300" : "text-slate-500"}`}>
                {isComplianceReview ? "Mandatory Analysis & Scoring" : "Observations recorded during review"}
              </p>
            </div>
          </div>
          {isLedgerVisible ? <ChevronUp className={`w-6 h-6 ${isLedgerVisible ? 'text-white' : 'text-slate-400'}`} /> : <ChevronDown className="w-6 h-6 text-slate-400" />}
        </div>

        {isLedgerVisible && (
          <div className="space-y-8 pt-2 animate-in fade-in slide-in-from-top-4 duration-500">
            <div className="flex justify-between items-center px-4">
              <div className="flex items-center gap-3 text-blue-800 bg-blue-50 border border-blue-200 px-5 py-2.5 rounded-full shadow-sm">
                <Info className="w-5 h-5 text-blue-600" />
                <span className="text-[11px] font-black uppercase tracking-widest">Document specific findings below</span>
              </div>
              <label className="flex items-center gap-3 cursor-pointer group">
                <input 
                  type="checkbox" 
                  checked={isSra} 
                  onChange={(e) => setIsSra(e.target.checked)} 
                  className="rounded-md border-slate-300 text-blue-600 w-5 h-5 transition-all focus:ring-blue-500/20 cursor-pointer" 
                />
                <span className="text-[12px] font-black text-slate-600 uppercase tracking-widest group-hover:text-blue-600 transition-colors">SRA Origin</span>
              </label>
            </div>

            <div className="space-y-6">
              {findings.map((f) => (
              <div key={f.id} className="p-7 rounded-[2.5rem] border border-slate-200 bg-white shadow-md space-y-5 transition-all hover:border-blue-300">
                {/* Header area */}
                <div className="flex flex-row items-center gap-4">
                  <select 
                    value={f.system} 
                    onChange={(e) => updateFinding(f.id, 'system', e.target.value)} 
                    className="bg-slate-50 border border-slate-200 rounded-2xl px-5 py-2.5 text-xs font-bold text-slate-800 outline-none focus:ring-2 focus:ring-blue-500/10 transition-all cursor-pointer flex-grow"
                  >
                    {GMP_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                  
                  <select 
                    value={f.severity} 
                    onChange={(e) => updateFinding(f.id, 'severity', e.target.value)}
                    className={`rounded-2xl px-6 py-2.5 text-[11px] font-black uppercase outline-none transition-all shadow-sm cursor-pointer ${
                      f.severity === 'Critical' ? 'bg-rose-600 text-white' : 
                      f.severity === 'Major' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-800'
                    }`}
                  >
                    {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>

                {/* Textarea remains the primary focus */}
                <textarea 
                  value={f.text} 
                  onChange={(e) => updateFinding(f.id, 'text', e.target.value)} 
                  placeholder="Describe specific observation..." 
                  className="w-full bg-slate-50/50 p-5 rounded-2xl border border-slate-100 focus:border-blue-300 focus:bg-white text-sm text-slate-800 italic focus:outline-none min-h-[100px] resize-none transition-all shadow-inner placeholder:text-slate-400" 
                />

                {/* Centralized footer area for the delete button */}
                <div className="flex justify-center pt-2">
                  <button 
                    type="button" 
                    onClick={() => removeFinding(f.id)} 
                    className="flex items-center gap-2 text-[10px] font-black text-slate-400 hover:text-rose-600 uppercase tracking-widest transition-colors duration-200"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    Remove Entry
                  </button>
                </div>
              </div>
            ))}

              <button 
                type="button" 
                onClick={addFinding}
                className="w-full py-7 rounded-[2.5rem] border-2 border-dashed border-slate-300 text-xs font-black text-slate-600 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-all uppercase flex items-center justify-center gap-4 tracking-widest"
              >
                <Plus className="w-5 h-5" /> Add Observation Entry
              </button>
            </div>

            <div className="flex gap-10 px-8 py-6 bg-slate-100/50 rounded-[2.5rem] border border-slate-200 shadow-inner">
                <div className="text-xs font-black uppercase flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-pulse shadow-[0_0_8px_rgba(244,63,94,0.6)]" />
                    <span className="text-rose-700"><span className="text-lg mr-1">{counts.critical}</span> Critical</span>
                </div>
                <div className="text-xs font-black uppercase flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
                    <span className="text-amber-700"><span className="text-lg mr-1">{counts.major}</span> Major</span>
                </div>
                <div className="text-xs font-black uppercase flex items-center gap-3">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                    <span className="text-slate-600"><span className="text-lg mr-1">{counts.other}</span> Other</span>
                </div>
            </div>
          </div>
        )}
      </div>

      {!isComplianceReview && (
        <div className="space-y-6">
          <div className="flex items-center gap-4 px-6 text-slate-900 border-l-4 border-blue-600">
            <Upload className="w-6 h-6 text-blue-600" />
            <h4 className="text-sm font-black uppercase tracking-[0.25em]">Verification Report (Optional)</h4>
          </div>
          
          <div 
            onClick={() => fileInputRef.current?.click()}
            className={`p-14 rounded-[3.5rem] border-2 border-dashed cursor-pointer transition-all duration-300 flex flex-col items-center justify-center gap-5 shadow-sm ${
              evidenceFile 
                ? "border-emerald-500 bg-emerald-50/50 shadow-inner shadow-emerald-100" 
                : "border-slate-300 bg-slate-50/50 hover:border-blue-500 hover:bg-blue-50"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} 
              className="hidden" 
              accept=".pdf" 
            />
            {evidenceFile ? (
              <>
                <div className="p-5 bg-emerald-600 rounded-[1.5rem] shadow-xl shadow-emerald-600/20">
                  <FileCheck className="w-10 h-10 text-white" />
                </div>
                <div className="text-center">
                  <span className="text-sm font-black text-emerald-800 uppercase tracking-widest block">{evidenceFile.name}</span>
                  <span className="text-[11px] text-emerald-600 font-bold uppercase mt-2 block opacity-70">Click to replace PDF</span>
                </div>
              </>
            ) : (
              <>
                <div className="p-5 bg-white rounded-[1.5rem] shadow-sm border border-slate-200">
                  <Upload className="w-10 h-10 text-slate-400" />
                </div>
                <span className="text-xs font-black text-slate-600 uppercase tracking-[0.2em]">Select PDF if available</span>
              </>
            )}
          </div>
        </div>
      )}

      <div className="space-y-6">
        <div className="flex items-center gap-4 px-6 text-slate-900 border-l-4 border-blue-600">
          <FileText className="w-6 h-6 text-blue-600" />
          <h4 className="text-sm font-black uppercase tracking-[0.25em]">Executive Assessment</h4>
        </div>
        
        <textarea 
          required
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Final assessment summary for the Divisional Deputy Director..."
          className="w-full p-10 rounded-[3.5rem] border-2 border-slate-200 bg-white text-base text-slate-800 min-h-[220px] shadow-xl shadow-slate-200/30 focus:ring-8 focus:ring-blue-500/5 focus:border-blue-500 outline-none transition-all leading-relaxed placeholder:text-slate-400"
        />

        <button 
          disabled={loading}
          type="submit"
          className={`w-full py-7 rounded-full text-white text-sm font-black uppercase tracking-[0.4em] transition-all duration-300 flex items-center justify-center gap-5 shadow-2xl disabled:opacity-50 active:scale-[0.97] mt-4 ${
            isComplianceReview 
              ? "bg-purple-700 hover:bg-purple-800 shadow-purple-900/30 ring-4 ring-purple-500/10" 
              : "bg-slate-900 hover:bg-blue-700 shadow-slate-900/40"
          }`}
        >
          {loading ? (
            <Loader2 className="w-7 h-7 animate-spin" />
          ) : (
            <>
              <CheckCircle2 className="w-7 h-7" /> 
              SUBMIT TO {isHubVetting ? "IRSD HUB" : "DIVISIONAL DEPUTY DIRECTOR"}
            </>
          )}
        </button>
      </div>
    </form>
  );
}