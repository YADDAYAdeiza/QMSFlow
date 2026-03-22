"use client";

import React, { useState, useRef, useEffect } from "react";
import { 
  ShieldAlert, CheckCircle2, FileText, 
  Loader2, Plus, Trash2, Upload, FileCheck, ChevronDown, ChevronUp,
  AlertTriangle, Info
} from "lucide-react";
import { submitToDDD } from "@/lib/actions/staff";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

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
  comments: any[];
  isHubVetting: boolean;
  isComplianceReview: boolean; // Context from Page
  riskId: string;
  previousFindings?: any[];
  previousIsSra?: boolean;
}

export default function ReviewSubmissionForm({
  appId, staffId, staffName, comments, isHubVetting, isComplianceReview, riskId, 
  previousFindings = [], 
  previousIsSra = false 
}: Props) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  
  // Logic: In Compliance Review, the ledger MUST be visible.
  const [isLedgerVisible, setIsLedgerVisible] = useState(isComplianceReview || previousFindings.length > 0);
  
  const [isSra, setIsSra] = useState(previousIsSra);
  const [justification, setJustification] = useState("");
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);
  
  const [findings, setFindings] = useState<Array<{ system: string; severity: string; text: string }>>(
    previousFindings.length > 0 ? previousFindings : []
  );

  const counts = {
    critical: findings.filter(f => f.severity === "Critical" && f.text.trim()).length,
    major: findings.filter(f => f.severity === "Major" && f.text.trim()).length,
    other: findings.filter(f => f.severity === "Other" && f.text.trim()).length,
  };

  const addFinding = () => setFindings([...findings, { system: GMP_SYSTEMS[0], severity: "Other", text: "" }]);
  
  const updateFinding = (index: number, field: string, value: string) => {
    const next = [...findings];
    (next[index] as any)[field] = value;
    setFindings(next);
  };

  const removeFinding = (index: number) => setFindings(findings.filter((_, i) => i !== index));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (isComplianceReview && findings.length === 0 && !confirm("You are submitting a Compliance Audit with zero recorded deficiencies. Proceed?")) {
        return;
    }

    setLoading(true);

    let uploadedUrl = "";
    try {
      if (evidenceFile) {
        const fileExt = evidenceFile.name.split('.').pop();
        const fileName = `${appId}_evidence_${Date.now()}.${fileExt}`;
        const filePath = `verification_evidence/${fileName}`;
        // Note: Using 'Documents' bucket as per Saved Info
        const { error: uploadError } = await supabase.storage.from('documents').upload(filePath, evidenceFile);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('documents').getPublicUrl(filePath);
        uploadedUrl = data.publicUrl;
      }

      const complianceData = {
        riskId,
        isSra,
        isComplianceReview,
        summary: isLedgerVisible ? { 
          criticalCount: counts.critical, 
          majorCount: counts.major, 
          otherCount: counts.other 
        } : { criticalCount: 0, majorCount: 0, otherCount: 0 },
        findings: isLedgerVisible ? findings.filter(f => f.text.trim() !== "") : [],
        evidenceUrl: uploadedUrl
      };

      const res = await submitToDDD(appId, staffId, justification, isHubVetting, uploadedUrl, complianceData);
      
      if (res.success) {
        router.push('/dashboard/staff');
        router.refresh();
      } else { throw new Error(res.error); }
    } catch (err: any) {
      alert(err.message || "Submission failed");
    } finally { setLoading(false); }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      
      {/* 1. DEFICIENCY / AUDIT LEDGER */}
      <div className="space-y-4">
        <div 
          onClick={() => !isComplianceReview && setIsLedgerVisible(!isLedgerVisible)}
          className={`flex items-center justify-between p-6 rounded-[2rem] transition-all border ${
            isLedgerVisible 
              ? isComplianceReview ? "bg-purple-900 border-purple-800 shadow-xl" : "bg-slate-900 border-slate-900 shadow-xl"
              : "bg-white border-slate-100 hover:border-blue-200 cursor-pointer"
          } ${isComplianceReview ? 'cursor-default ring-4 ring-purple-500/10' : ''}`}
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className={`w-4 h-4 ${isLedgerVisible ? "text-rose-400" : "text-slate-400"}`} />
            <div>
              <h4 className={`text-[10px] font-black uppercase tracking-widest ${isLedgerVisible ? "text-white" : "text-slate-900"}`}>
                {isComplianceReview ? "Compliance Audit Ledger" : "Deficiency Ledger"}
              </h4>
              <p className={`text-[8px] font-bold uppercase ${isLedgerVisible ? "text-slate-400" : "text-slate-300"}`}>
                {isComplianceReview ? "Mandatory Analysis" : "Optional Observations"}
              </p>
            </div>
          </div>
          {!isComplianceReview && (isLedgerVisible ? <ChevronUp className="w-4 h-4 text-white" /> : <ChevronDown className="w-4 h-4 text-slate-300" />)}
        </div>

        {isLedgerVisible && (
          <div className="space-y-6 pt-2 animate-in fade-in slide-in-from-top-4 duration-300">
            <div className="flex justify-between items-center px-2">
              <div className="flex items-center gap-1.5 text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                <Info className="w-3 h-3" />
                <span className="text-[8px] font-black uppercase tracking-tight">Record specific non-compliances found in report</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input 
                  type="checkbox" 
                  checked={isSra} 
                  onChange={(e) => setIsSra(e.target.checked)} 
                  className="rounded border-slate-300 text-blue-600 w-3 h-3" 
                />
                <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter">SRA Origin</span>
              </label>
            </div>

            <div className="space-y-4">
              {findings.map((f, i) => (
                <div key={i} className="p-5 rounded-[2rem] border border-slate-100 bg-white shadow-sm space-y-3 relative transition-all hover:border-blue-100">
                  <div className="flex wrap gap-2 items-center">
                    <select 
                      value={f.system} 
                      onChange={(e) => updateFinding(i, 'system', e.target.value)} 
                      className="bg-slate-50 border-none rounded-full px-3 py-1 text-[9px] font-bold text-slate-600 outline-none"
                    >
                      {GMP_SYSTEMS.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    <select 
                      value={f.severity} 
                      onChange={(e) => updateFinding(i, 'severity', e.target.value)}
                      className={`border-none rounded-full px-3 py-1 text-[9px] font-black uppercase outline-none transition-colors ${
                        f.severity === 'Critical' ? 'bg-rose-500 text-white' : 
                        f.severity === 'Major' ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}
                    >
                      {SEVERITIES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    
                    <button type="button" onClick={() => removeFinding(i)} className="ml-auto text-slate-200 hover:text-rose-500 transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <textarea 
                    value={f.text} 
                    onChange={(e) => updateFinding(i, 'text', e.target.value)} 
                    placeholder="Describe specific observation from the inspection report..." 
                    className="w-full bg-transparent text-[11px] text-slate-600 italic focus:outline-none min-h-[50px] resize-none" 
                  />
                </div>
              ))}

              <button 
                type="button" 
                onClick={addFinding}
                className="w-full py-4 rounded-[2rem] border-2 border-dashed border-slate-100 text-[9px] font-black text-slate-400 hover:text-blue-500 hover:border-blue-100 transition-all uppercase flex items-center justify-center gap-2"
              >
                <Plus className="w-3 h-3" /> Add Observation Entry
              </button>
            </div>

            <div className="flex gap-4 px-2 pt-2 border-t border-slate-50">
                <div className="text-[9px] font-black uppercase flex items-center gap-1">
                   <AlertTriangle className="w-3 h-3 text-rose-500" />
                   <span className="text-rose-500 mr-1">{counts.critical}</span> Critical
                </div>
                <div className="text-[9px] font-black uppercase"><span className="text-amber-500 mr-1">{counts.major}</span> Major</div>
                <div className="text-[9px] font-black uppercase"><span className="text-slate-400 mr-1">{counts.other}</span> Other</div>
            </div>
          </div>
        )}
      </div>

      {/* 2. EVIDENCE UPLOAD */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 text-slate-400">
          <Upload className="w-4 h-4" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Supporting Evidence</h4>
        </div>
        
        <div 
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 rounded-[2.5rem] border-2 border-dashed cursor-pointer transition-all flex flex-col items-center justify-center gap-2 ${
            evidenceFile ? "border-emerald-200 bg-emerald-50" : "border-slate-100 bg-slate-50 hover:border-blue-200"
          }`}
        >
          <input type="file" ref={fileInputRef} onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)} className="hidden" accept=".pdf,.jpg,.png" />
          {evidenceFile ? (
            <>
              <FileCheck className="w-6 h-6 text-emerald-500" />
              <span className="text-[10px] font-bold text-emerald-600 uppercase">{evidenceFile.name}</span>
            </>
          ) : (
            <>
              <Upload className="w-6 h-6 text-slate-300" />
              <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Upload Verification Document</span>
            </>
          )}
        </div>
      </div>

      {/* 3. EXECUTIVE SUMMARY & SUBMIT */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2 text-slate-400">
          <FileText className="w-4 h-4" />
          <h4 className="text-[10px] font-black uppercase tracking-widest">Executive Assessment</h4>
        </div>
        
        <textarea 
          required
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder={isComplianceReview ? "Final compliance verdict based on the inspection report audit..." : "Final assessment summary for the DDD..."}
          className="w-full p-6 rounded-[2.5rem] border border-slate-200 text-xs text-slate-600 min-h-[150px] shadow-sm focus:ring-4 focus:ring-blue-500/5 outline-none transition-all"
        />

        <button 
          disabled={loading}
          type="submit"
          className={`w-full p-5 rounded-full text-white text-[10px] font-black uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 ${
            isComplianceReview ? "bg-purple-600 hover:bg-purple-700" : "bg-slate-900 hover:bg-blue-600"
          }`}
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          SUBMIT TO {isHubVetting ? "IRSD HUB" : "DIVISIONAL DEPUTY DIRECTOR"}
        </button>
      </div>

    </form>
  );
}