"use client";

import React, { useState } from "react";
import { 
  ShieldAlert, 
  CheckCircle2, 
  History, 
  FileText, 
  ExternalLink, 
  Loader2, 
  AlertTriangle,
  Plus,
  Trash2
} from "lucide-react";
import { submitToDDD } from "@/lib/actions/staff";
import { useRouter } from "next/navigation";

interface ReviewSubmissionFormProps {
  appId: number;
  division: string;
  staffId: string;
  staffName: string;
  comments: any[];
  isHubVetting: boolean;
  riskId?: number;
  previousCompliance?: any; // { criticalCount, majorCount, otherCount }
  previousFindings?: any[];
}

export default function ReviewSubmissionForm({
  appId,
  staffId,
  staffName,
  comments,
  isHubVetting,
  riskId,
  previousCompliance,
  previousFindings = []
}: ReviewSubmissionFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [isSra, setIsSra] = useState(false);
  const [justification, setJustification] = useState("");
  const [reportUrl, setReportUrl] = useState("");
  
  // Deficiency State
  const [critical, setCritical] = useState(previousCompliance?.criticalCount || 0);
  const [major, setMajor] = useState(previousCompliance?.majorCount || 0);
  const [other, setOther] = useState(previousCompliance?.otherCount || 0);
  
  // Findings Ledger (JSONB source)
  const [findings, setFindings] = useState<string[]>(
    previousFindings.length > 0 ? previousFindings : [""]
  );

  const addFinding = () => setFindings([...findings, ""]);
  const updateFinding = (val: string, i: number) => {
    const newFindings = [...findings];
    newFindings[i] = val;
    setFindings(newFindings);
  };
  const removeFinding = (i: number) => setFindings(findings.filter((_, idx) => idx !== i));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!justification || !reportUrl) return alert("Please provide justification and report URL");

    setLoading(true);
    const complianceData = {
      riskId,
      isSra,
      summary: { criticalCount: critical, majorCount: major, otherCount: other },
      findings: findings.filter(f => f.trim() !== "")
    };

    const res = await submitToDDD(appId, staffId, justification, isHubVetting, reportUrl, complianceData);
    
    if (res.success) {
      router.push('/dashboard/staff');
      router.refresh();
    } else {
      alert(res.error);
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-12">
      
      {/* 1. COMPLIANCE ENGINE SECTION */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-900" />
            <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-900">Compliance Assessment</h4>
          </div>
          <label className="flex items-center gap-2 cursor-pointer group">
            <span className="text-[9px] font-bold text-slate-400 group-hover:text-blue-600 transition-colors uppercase">SRA Origin?</span>
            <input 
              type="checkbox" 
              checked={isSra} 
              onChange={(e) => setIsSra(e.target.checked)}
              className="w-3 h-3 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
          </label>
        </div>

        <div className="grid grid-cols-3 gap-4">
          {[
            { label: "Critical", val: critical, set: setCritical, color: "rose" },
            { label: "Major", val: major, set: setMajor, color: "amber" },
            { label: "Other", val: other, set: setOther, color: "slate" }
          ].map((item) => (
            <div key={item.label} className={`p-4 rounded-3xl border border-${item.color}-100 bg-${item.color}-50/30`}>
              <span className={`text-[8px] font-black uppercase text-${item.color}-500 mb-2 block tracking-tighter`}>{item.label}</span>
              <input 
                type="number" 
                value={item.val} 
                onChange={(e) => item.set(parseInt(e.target.value) || 0)}
                className="w-full bg-transparent text-xl font-black text-slate-900 focus:outline-none"
              />
            </div>
          ))}
        </div>

        {/* FINDINGS LEDGER */}
        <div className="space-y-3">
          <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Deficiency Ledger</span>
          {findings.map((f, i) => (
            <div key={i} className="flex gap-2 items-start">
              <textarea 
                value={f}
                onChange={(e) => updateFinding(e.target.value, i)}
                placeholder="Describe deficiency..."
                className="flex-1 p-4 rounded-2xl border border-slate-100 text-[11px] text-slate-600 focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 outline-none min-h-[60px] transition-all"
              />
              <button type="button" onClick={() => removeFinding(i)} className="p-2 text-slate-300 hover:text-rose-500 mt-2">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          ))}
          <button 
            type="button" 
            onClick={addFinding}
            className="w-full py-3 rounded-2xl border-2 border-dashed border-slate-100 text-[9px] font-black text-slate-400 hover:border-blue-200 hover:text-blue-500 transition-all uppercase flex items-center justify-center gap-2"
          >
            <Plus className="w-3 h-3" /> Add Observation
          </button>
        </div>
      </div>

      {/* 2. SUBMISSION SECTION */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-2">
          <FileText className="w-4 h-4 text-slate-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Final Recommendation</h4>
        </div>
        
        <textarea 
          required
          value={justification}
          onChange={(e) => setJustification(e.target.value)}
          placeholder="Enter your final assessment notes for the Deputy Director..."
          className="w-full p-6 rounded-[2.5rem] border border-slate-200 text-xs text-slate-600 focus:ring-4 focus:ring-blue-500/5 focus:border-blue-500 outline-none min-h-[150px] transition-all shadow-sm"
        />

        <input 
          required
          type="text"
          value={reportUrl}
          onChange={(e) => setReportUrl(e.target.value)}
          placeholder="Paste Assessment Report URL (Sharepoint/Cloud)"
          className="w-full p-5 rounded-full border border-slate-200 text-[10px] text-slate-500 focus:ring-2 focus:ring-blue-500 outline-none transition-all"
        />

        <button 
          disabled={loading}
          type="submit"
          className="w-full p-5 rounded-full bg-slate-900 text-white text-[10px] font-black uppercase tracking-[0.2em] hover:bg-blue-600 transition-all flex items-center justify-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
          {isHubVetting ? "Submit Hub Vetting" : "Return to Deputy Director"}
        </button>
      </div>

      {/* 3. AUDIT TRAIL / SNAPSHOT HISTORY */}
      <div className="pt-8 border-t border-slate-100 space-y-6">
        <div className="flex items-center gap-2 px-2">
          <History className="w-4 h-4 text-slate-400" />
          <h4 className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Application Narrative</h4>
        </div>
        
        <div className="space-y-4 max-h-[400px] overflow-y-auto pr-2 custom-scrollbar">
          {comments && comments.length > 0 ? (
            comments.slice().reverse().map((c: any, i: number) => (
              <div key={i} className="bg-slate-50 p-6 rounded-[2rem] border border-slate-100 relative group transition-all hover:bg-white hover:shadow-md">
                
                <div className="flex justify-between items-start mb-3">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase text-blue-600 tracking-tighter">{c.from}</span>
                    <span className="text-[7px] font-bold text-slate-300 uppercase">{c.role} • {c.division}</span>
                  </div>
                  <span className="text-[8px] font-mono text-slate-400">
                    {c.timestamp ? new Date(c.timestamp).toLocaleDateString() : 'N/A'}
                  </span>
                </div>

                {/* SNAPSHOT BADGES */}
                {c.complianceSnapshot && (
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {c.complianceSnapshot.critical > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-rose-500 text-[7px] font-black text-white uppercase">
                        {c.complianceSnapshot.critical} Critical
                      </span>
                    )}
                    {c.complianceSnapshot.major > 0 && (
                      <span className="px-2 py-0.5 rounded-md bg-amber-500 text-[7px] font-black text-slate-900 uppercase">
                        {c.complianceSnapshot.major} Major
                      </span>
                    )}
                    {c.complianceSnapshot.isSra && (
                      <span className="px-2 py-0.5 rounded-md bg-blue-600 text-[7px] font-black text-white uppercase">SRA</span>
                    )}
                  </div>
                )}

                <p className="text-[11px] text-slate-600 italic leading-relaxed">"{c.text}"</p>
                
                {c.attachmentUrl && (
                  <a href={c.attachmentUrl} target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-[8px] font-black text-blue-500 hover:text-blue-700 uppercase tracking-tighter">
                    <ExternalLink className="w-3 h-3" /> View Document
                  </a>
                )}
              </div>
            ))
          ) : (
            <div className="text-center py-10 opacity-30">
              <p className="text-[9px] font-black uppercase tracking-widest">No history recorded</p>
            </div>
          )}
        </div>
      </div>
    </form>
  );
}