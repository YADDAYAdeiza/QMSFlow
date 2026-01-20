"use client"

import React from 'react';
import { MessageSquare, User, Calendar, Tag, AlertCircle, CheckCircle2, Send, FileText } from "lucide-react";

export default function AuditTrail({ comments }: { comments: any[] }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="p-8 border-2 border-dashed border-slate-100 rounded-2xl flex flex-col items-center justify-center gap-2">
        <FileText className="w-8 h-8 text-slate-200" />
        <p className="text-xs text-slate-400 italic font-medium">No history recorded yet.</p>
      </div>
    );
  }

  // Reverse to show newest on top, or keep as is for chronological? 
  // For a "trail", chronological (as is) usually works best.
  
  return (
    <div className="space-y-8 relative pb-4">
      {/* Vertical Line */}
      <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-slate-100" />

      {comments.map((comment, i) => {
        // Logic for Dynamic Styling based on Action
        const isRework = comment.action === "RETURNED_FOR_REWORK";
        const isSubmission = comment.action === "SUBMITTED_TO_DDD";
        const isIntake = comment.action === "INITIAL_INTAKE";

        return (
          <div key={i} className="relative pl-10 animate-in fade-in slide-in-from-left-3 duration-300">
            
            {/* Node Icon - Dynamic Color */}
            <div className={`absolute left-0 p-1.5 rounded-full z-10 border-4 border-white shadow-sm transition-colors
              ${isRework ? 'bg-rose-600 text-white' : 
                isSubmission ? 'bg-emerald-600 text-white' : 
                'bg-slate-900 text-white'}
            `}>
              {isRework ? <AlertCircle className="w-3 h-3" /> : 
               isSubmission ? <CheckCircle2 className="w-3 h-3" /> : 
               <User className="w-3 h-3" />}
            </div>

            <div className="flex flex-col">
              {/* Header: Name and Time */}
              <div className="flex justify-between items-center mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-tighter text-slate-900">
                    {comment.from}
                  </span>
                  <span className={`text-[8px] font-black px-2 py-0.5 rounded-full uppercase flex items-center gap-1 border
                    ${isRework ? 'bg-rose-50 text-rose-600 border-rose-100' : 'bg-slate-50 text-slate-500 border-slate-100'}
                  `}>
                     Round {comment.round}
                  </span>
                </div>
                <span className="text-[9px] font-mono font-bold text-slate-400">
                  {new Intl.DateTimeFormat('en-GB', { 
                    dateStyle: 'medium', 
                    timeStyle: 'short' 
                  }).format(new Date(comment.timestamp))}
                </span>
              </div>

              {/* Content Card */}
              <div className={`p-4 rounded-2xl shadow-sm border transition-all
                ${isRework ? 'bg-rose-50/30 border-rose-100' : 'bg-white border-slate-200'}
              `}>
                <div className="flex items-start gap-3">
                  <div className={`mt-1 p-1 rounded-lg ${isRework ? 'bg-rose-100' : 'bg-blue-50'}`}>
                    <MessageSquare className={`w-3 h-3 ${isRework ? 'text-rose-600' : 'text-blue-500'}`} />
                  </div>
                  <p className="text-xs text-slate-600 italic font-medium leading-relaxed">
                    "{comment.text}"
                  </p>
                </div>
                
                {/* Status Badge */}
                <div className="mt-3 pt-3 border-t border-slate-100/60 flex justify-between items-center">
                  <div className="flex items-center gap-1.5">
                    <Send className={`w-2.5 h-2.5 ${isSubmission ? 'text-emerald-500' : 'text-slate-300'}`} />
                    <span className={`text-[9px] font-black uppercase tracking-widest
                      ${isRework ? 'text-rose-600' : isSubmission ? 'text-emerald-600' : 'text-slate-400'}
                    `}>
                      {comment.action?.replace(/_/g, ' ')}
                    </span>
                  </div>
                  
                  {comment.role && (
                    <span className="text-[8px] font-bold text-slate-300 uppercase italic">
                      {comment.role}
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}