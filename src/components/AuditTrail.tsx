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
      <div className="flex items-center gap-2 p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
        <Clock className="w-4 h-4 text-slate-400" />
        <span className="text-slate-400 text-sm italic text-center">
          No audit history available yet.
        </span>
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
              <span 
                className={`absolute left-[11px] top-8 w-[2px] h-full ${
                  isCompleted ? 'bg-emerald-100' : 'bg-slate-100'
                }`} 
              />
            )}

            {/* Icon Status Indicator */}
            <div className="relative z-10 flex flex-col items-center">
              <div className="p-0.5 bg-white rounded-full">
                {isCompleted ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Clock className="w-5 h-5 text-amber-500 animate-pulse" />
                )}
              </div>
            </div>

            {/* Content Card */}
            <div className="flex-1 pb-8">
              <div className="flex justify-between items-start bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
                <div>
                  <h3 className="text-[11px] font-black text-slate-800 uppercase tracking-wider">
                    {segment.point}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-[9px] font-bold px-1.5 py-0.5 bg-slate-800 text-white rounded">
                      {segment.division || 'GENERAL'}
                    </span>
                    {segment.staffId && (
                      <span className="flex items-center gap-1 text-[10px] text-slate-500 font-medium">
                        <User className="w-3 h-3" /> {segment.staffId}
                      </span>
                    )}
                  </div>
                </div>
                
                {/* Date/Time Stamps */}
                <div className="text-right">
                  <p className="text-[10px] font-bold text-slate-600">
                    {new Date(segment.startTime).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>
                  <p className="text-[9px] text-slate-400 font-medium">
                    {new Date(segment.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              {/* STAFF NOTES / QMS FINDINGS (The Blue Box) */}
              {segment.comments && (
                <div className="mt-2 p-3 bg-blue-50/80 border border-blue-100 rounded-lg flex gap-3 shadow-sm">
                  <MessageSquare className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <p className="text-[9px] font-black text-blue-600 uppercase tracking-widest">
                      Official Remarks:
                    </p>
                    <p className="text-xs text-slate-700 leading-relaxed font-medium">
                      {segment.comments}
                    </p>
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