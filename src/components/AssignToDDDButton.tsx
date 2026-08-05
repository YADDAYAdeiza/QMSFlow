"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquare, Loader2, Building2, Check, ShieldCheck, Mail } from "lucide-react";
import { assignToDDD } from '@/lib/actions/director';
import { cn } from "@/lib/utils";

interface Head {
  id: string;
  name: string;
  division: string;
}

export default function AssignToDDDButton({ 
  appId, 
  defaultDivision, 
  availableHeads,
  isCompliance = false // Distinguishes Round 2
}: { 
  appId: number; 
  defaultDivision: string; 
  availableHeads: Head[];
  isCompliance?: boolean;
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [selectedDiv, setSelectedDiv] = useState(defaultDivision);
  const [sendEmail, setSendEmail] = useState(false); // Controls optional notification state
  const [isPending, setIsPending] = useState(false);

  useEffect(() => {
    setSelectedDiv(defaultDivision);
  }, [defaultDivision]);

  const handleAssignment = async () => {
    if (!comment.trim()) return alert("QMS Requirement: Please enter a technical instruction.");
    
    setIsPending(true);
    const head = availableHeads.find(h => h.division === selectedDiv);
    
    // Passing sendEmail toggle state as the fifth parameter
    const result = await assignToDDD(appId, [selectedDiv], comment, head?.id, sendEmail);
    
    if (result.success) {
      setIsModalOpen(false);
      setComment(""); 
      setSendEmail(false);
      router.refresh();
    } else {
      alert("Assignment failed. Check server logs.");
    }
    setIsPending(false);
  };

  return (
    <>
      <button 
        onClick={() => setIsModalOpen(true)} 
        className={cn(
          "px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 transition-all active:scale-95",
          isCompliance 
            ? "bg-purple-700 hover:bg-purple-800 text-white" 
            : "bg-slate-900 hover:bg-blue-600 text-white"
        )}
      >
        {isCompliance ? <ShieldCheck className="w-3 h-3" /> : <Send className="w-3 h-3" />}
        {isCompliance ? "Dispatch Compliance Review" : "Dispatch to DD"}
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className={cn(
              "p-8 border-b border-slate-100 flex justify-between items-center",
              isCompliance ? "bg-purple-50" : "bg-slate-50"
            )}>
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">
                  Director's Minute
                </h3>
                <p className={cn(
                  "text-[10px] font-bold uppercase",
                  isCompliance ? "text-purple-600" : "text-slate-400"
                )}>
                  {isCompliance ? "Round 2: Compliance Vetting" : "Round 1: Technical Workflow"}
                </p>
              </div>
              <Building2 className={cn("w-8 h-8", isCompliance ? "text-purple-200" : "text-slate-200")} />
            </div>

            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase px-1">
                  Target {selectedDiv === defaultDivision ? "Recommended" : "Modified"} Division
                </label>
                <div className="relative">
                  <select 
                    value={selectedDiv}
                    onChange={(e) => setSelectedDiv(e.target.value)}
                    className="w-full p-5 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all appearance-none"
                  >
                    {availableHeads.map(head => (
                      <option key={head.id} value={head.division}>
                        {head.division} — {head.name} {head.division === defaultDivision ? " (LOD SUGGESTION)" : ""}
                      </option>
                    ))}
                  </select>
                  {selectedDiv === defaultDivision && (
                    <Check className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-emerald-500" />
                  )}
                </div>
              </div>

              {/* Email Notification Toggle Slider Slider Section */}
              <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100/50">
                <div className="flex items-center gap-2.5">
                  <div className={cn(
                    "p-2 rounded-xl transition-colors",
                    sendEmail ? "bg-blue-100 text-blue-600" : "bg-slate-200/60 text-slate-400"
                  )}>
                    <Mail className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase text-slate-700 tracking-tight">Email Alert</p>
                    <p className="text-[9px] font-medium text-slate-400">Notify Divisional Deputy Director</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setSendEmail(!sendEmail)}
                  className={cn(
                    "relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                    sendEmail ? (isCompliance ? "bg-purple-600" : "bg-blue-600") : "bg-slate-200"
                  )}
                >
                  <span
                    className={cn(
                      "pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out",
                      sendEmail ? "translate-x-5" : "translate-x-0"
                    )}
                  />
                </button>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                  <MessageSquare className="w-3 h-3" /> Technical Direction
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full h-32 p-5 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none italic text-slate-600"
                  placeholder={isCompliance 
                    ? "Direct the DD to vet the foreign inspection report..." 
                    : "e.g. Please conduct full dossier evaluation..."}
                />
              </div>

              <div className="grid grid-cols-2 gap-4 pt-2">
                <button 
                  onClick={() => setIsModalOpen(false)} 
                  className="py-4 text-[10px] font-black uppercase text-slate-400 hover:text-slate-600 transition-colors"
                >
                  Discard
                </button>
                <button 
                  disabled={isPending} 
                  onClick={handleAssignment}
                  className={cn(
                    "py-4 text-white rounded-2xl font-black uppercase text-[10px] transition-all flex items-center justify-center gap-2 shadow-lg",
                    isCompliance ? "bg-purple-600 hover:bg-purple-700" : "bg-blue-600 hover:bg-slate-900"
                  )}
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Authorize Dispatch"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}