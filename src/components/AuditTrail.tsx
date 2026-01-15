"use client"

import React from 'react';
import { CheckCircle2, Clock, MessageSquare, ShieldAlert } from "lucide-react";

export default function AuditTrail({ segments }: { segments: any[] }) {
  return (
    <div className="space-y-6 relative">
      {/* The Vertical Connector Line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

      {segments.map((segment, i) => {
        const isCompleted = !!segment.endTime;
        
        return (
          <div key={i} className="relative pl-10">
            {/* Status Icon Node */}
            <div className={`absolute left-0 p-1 rounded-full z-10 border-4 border-white ${
              isCompleted ? 'bg-emerald-500 text-white' : 'bg-blue-500 text-white animate-pulse'
            }`}>
              {isCompleted ? <CheckCircle2 className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
            </div>

            <div className="flex flex-col">
              {/* Header: Role and Time */}
              <div className="flex justify-between items-center mb-1">
                <span className="text-[10px] font-black uppercase tracking-widest text-slate-900">
                  {segment.point}
                </span>
                <span className="text-[9px] font-mono font-bold text-slate-400 bg-slate-50 px-2 py-0.5 rounded">
                  {segment.startTime ? new Date(segment.startTime).toLocaleString() : 'PENDING'}
                </span>
              </div>

              {/* The Comment Box (This renders the DDD/Staff/Director notes) */}
              {segment.comments ? (
                <div className="group relative bg-white border border-slate-200 p-3 rounded-xl shadow-sm hover:border-blue-300 transition-all">
                  <div className="flex items-start gap-2">
                    <MessageSquare className="w-3 h-3 text-blue-500 mt-1 shrink-0" />
                    <p className="text-xs text-slate-600 italic leading-relaxed font-medium">
                      "{segment.comments}"
                    </p>
                  </div>
                  
                  {/* Decorative Label for QMS */}
                  <div className="absolute -top-2 -right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                     <span className="bg-blue-600 text-white text-[8px] font-black px-2 py-0.5 rounded uppercase shadow-lg">
                       Verified Remark
                     </span>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 mt-1 px-1">
                  <ShieldAlert className="w-3 h-3 text-slate-300" />
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter italic">
                    {isCompleted ? "Step completed without formal minute." : "Awaiting entry..."}
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}