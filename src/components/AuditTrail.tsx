import React from 'react';
import { CheckCircle2, Clock, MessageSquare, User } from 'lucide-react';

interface AuditSegment {
  idx: number;
  point: string;
  division: string | null;
  staffId: string | null;
  startTime: string | Date;
  endTime: string | Date | null;
  comments: string | null; 
}

export default function AuditTrail({ segments }: { segments: AuditSegment[] }) {
  if (!segments || segments.length === 0) {
    return (
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 text-slate-400 text-sm italic">
        <Clock className="w-4 h-4" /> No audit history available yet.
      </div>
    );
  }

  return (
    <div className="space-y-1 mt-4">
      {segments.map((segment, index) => {
        const isCompleted = segment.endTime !== null;
        
        return (
          <div key={`${segment.point}-${index}`} className="relative flex gap-4">
            {/* Vertical Line Connector */}
            {index !== segments.length - 1 && (
              <span className={`absolute left-[11px] top-8 w-[2px] h-full ${isCompleted ? 'bg-emerald-100' : 'bg-slate-100'}`} />
            )}

            {/* Icon Status */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="p-0.5 bg-white rounded-full">
                {isCompleted ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Clock className="w-5 h-5 text-amber-500 animate-pulse" />}
              </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 pb-8">
              <div className="flex justify-between items-start bg-white p-3 rounded-xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">{segment.point}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[8px] font-black px-1.5 py-0.5 bg-slate-900 text-white rounded uppercase tracking-tighter">
                      {segment.division || 'GENERAL'}
                    </span>
                    {segment.staffId && (
                      <span className="flex items-center gap-1 text-[9px] text-slate-400 font-mono bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">
                        <User className="w-2.5 h-2.5" /> 
                        {segment.staffId.length > 8 ? `${segment.staffId.substring(0, 8)}...` : segment.staffId}
                      </span>
                    )}
                  </div>
                </div>
                
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-600">
                    {new Date(segment.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[9px] text-slate-400 font-mono">
                    {new Date(segment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* DYNAMIC COMMENTS SECTION */}
              {segment.comments && (
                <div className="mt-2 p-3 bg-blue-50/60 border border-blue-100 rounded-xl flex gap-3 shadow-sm">
                  <MessageSquare className="w-3.5 h-3.5 text-blue-400 shrink-0 mt-1" />
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest">Recorded Observation:</p>
                    <p className="text-xs text-slate-700 italic leading-relaxed">{segment.comments}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}