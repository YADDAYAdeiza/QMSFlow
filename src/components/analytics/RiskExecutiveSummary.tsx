"use client"

import React, { useState } from 'react';
import { Activity, ShieldCheck, ChevronDown, Beaker, ListFilter, Globe2 } from 'lucide-react';

export function RiskExecutiveSummary({ complianceRisk, isInspection }: { complianceRisk: any; isInspection: boolean }) {
  const [isOpen, setIsOpen] = useState(false);
  if (!complianceRisk) return null;

  const { summary, isSra, findings = [], intrinsicLevel, overallRating } = complianceRisk;
  
  const getRatingColor = (level: string) => {
    const l = level?.toUpperCase();
    if (l === "A" || l === "LOW" || l === "COMPLIANT") return "bg-emerald-600 text-white border-emerald-400";
    if (l === "B" || l === "MEDIUM") return "bg-amber-500 text-white border-amber-300";
    return "bg-rose-600 text-white border-rose-400";
  };

  const springTransition = { transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)' };

  return (
    <div className="space-y-4 mb-8">
      <div className="w-full">
        <div className={`p-8 rounded-[2.5rem] border-4 shadow-2xl flex items-center justify-between transition-all duration-500 ${getRatingColor(overallRating)}`}>
          <div>
            <p className="text-[9px] font-black uppercase tracking-[0.2em] opacity-70 mb-1 text-white/80">
                {isInspection ? "Inspection Compliance Rating" : "Overall Risk Rating"}
            </p>
            <h2 className="text-6xl font-black tracking-tighter uppercase italic leading-none">{overallRating}</h2>
          </div>
          <div className="text-right">
             <div className="bg-white/20 backdrop-blur-md px-5 py-3 rounded-2xl inline-block border border-white/30">
                <p className="text-[8px] font-black uppercase tracking-[0.1em] text-white/90 leading-none mb-1">Status</p>
                <p className="text-sm font-black uppercase italic leading-none tracking-tight text-white">
                    {isInspection ? "Full Certification" : "Full Approval"}
                </p>
             </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[2.5rem] border border-slate-200 overflow-hidden shadow-sm">
        <button 
          onClick={() => setIsOpen(!isOpen)}
          className="w-full p-6 flex items-center justify-between hover:bg-slate-50 transition-colors group"
        >
          <div className="flex items-center gap-3">
            <Beaker className="w-4 h-4 text-slate-400 group-hover:rotate-12 transition-transform duration-300" />
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 font-sans">
                {isInspection ? "Inspection Audit Details" : "Technical Validation Details"}
            </span>
          </div>
          <div className={`transition-transform duration-500 ${isOpen ? 'rotate-180' : 'rotate-0'}`} style={springTransition}>
            <ChevronDown className="w-5 h-5 text-slate-300" />
          </div>
        </button>

        <div className={`grid transition-all duration-500 ease-[cubic-bezier(0.34,1.56,0.64,1)] ${isOpen ? 'grid-rows-[1fr] opacity-100' : 'grid-rows-[0fr] opacity-0'}`}>
          <div className="overflow-hidden">
            <div className="p-8 pt-2 space-y-8 border-t border-slate-50">
              <div className="flex gap-3 h-32">
                <div className="w-1/4 bg-slate-900 rounded-[2rem] flex flex-col items-center justify-center p-4 text-center border-b-4 border-blue-500 shadow-xl shadow-slate-900/10">
                  <Activity className="w-5 h-5 text-blue-400 mb-2" />
                  <p className="text-[8px] font-black uppercase text-slate-500 tracking-tighter leading-none mb-1">Intrinsic Risk</p>
                  <p className="text-xl font-black text-white uppercase italic leading-none tracking-tighter">{intrinsicLevel}</p>
                </div>

                <div className={`flex-1 rounded-[2rem] p-6 border-2 flex items-center gap-5 relative overflow-hidden transition-colors ${isSra ? 'bg-blue-50 border-blue-200' : 'bg-amber-50 border-amber-200'}`}>
                  <div className={`p-4 rounded-2xl shrink-0 shadow-lg ${isSra ? 'bg-blue-600 text-white shadow-blue-500/30' : 'bg-amber-500 text-white shadow-amber-500/30'}`}>
                    {isSra ? <Globe2 className="w-6 h-6" /> : <ShieldCheck className="w-6 h-6 opacity-60" />}
                  </div>
                  <div className="relative z-10">
                    <h4 className={`text-[11px] font-black uppercase tracking-tight leading-none mb-1.5 ${isSra ? 'text-blue-900' : 'text-amber-900'}`}>
                      {isSra ? "SRA Recognized Facility" : "Non-SRA / Local Oversight"}
                    </h4>
                    <p className={`text-[10px] font-medium leading-tight max-w-[220px] italic ${isSra ? 'text-blue-700/80' : 'text-amber-700/80'}`}>
                      {isSra 
                        ? "Validated by a Stringent Regulatory Authority. High data confidence tier." 
                        : "Regulatory oversight verified via local site audit and national standards."}
                    </p>
                  </div>
                  {isSra && <ShieldCheck className="absolute -right-2 -bottom-2 w-16 h-16 text-blue-500 opacity-10 -rotate-12" />}
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "Critical", val: summary.criticalCount, color: "text-rose-500", bg: "bg-rose-50" },
                  { label: "Major", val: summary.majorCount, color: "text-amber-500", bg: "bg-amber-50" },
                  { label: "Other", val: summary.otherCount, color: "text-slate-400", bg: "bg-slate-50" }
                ].map(t => (
                  <div key={t.label} className={`${t.bg} rounded-2xl p-5 text-center border border-black/5`}>
                    <p className="text-[8px] font-black uppercase text-slate-400 mb-1 tracking-tighter">{t.label}</p>
                    <p className={`text-2xl font-black ${t.color}`}>{t.val}</p>
                  </div>
                ))}
              </div>

              {findings.length > 0 && (
                <div className="space-y-3 pb-4">
                  <div className="flex items-center gap-2">
                    <ListFilter className="w-3 h-3 text-slate-400" />
                    <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Observations Ledger</span>
                  </div>
                  <div className="space-y-2 max-h-[180px] overflow-y-auto pr-2 custom-scrollbar font-sans">
                    {findings.map((f: any, i: number) => (
                      <div key={f.id || `obs-${i}`} className="p-4 bg-slate-50 rounded-2xl border border-slate-100 text-[11px] text-slate-600 italic leading-relaxed shadow-inner">
                        <span className="text-blue-500 font-black mr-2 uppercase">Obs {i+1}</span>
                        {typeof f === 'string' ? f : (f.text || f.finding)}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}