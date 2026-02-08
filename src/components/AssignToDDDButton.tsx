"use client";

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquare, Loader2, Building2, Check } from "lucide-react";
import { assignToDDD } from '@/lib/actions/director';

interface Head {
  id: string;
  name: string;
  division: string;
}

export default function AssignToDDDButton({ 
  appId, 
  defaultDivision, 
  availableHeads 
}: { 
  appId: number; 
  defaultDivision: string; 
  availableHeads: Head[] 
}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  
  // ✅ Initialize with LOD suggestion from props
  const [selectedDiv, setSelectedDiv] = useState(defaultDivision);
  const [isPending, setIsPending] = useState(false);

  // Synchronize state if props change (useful for Next.js soft navigation)
  useEffect(() => {
    setSelectedDiv(defaultDivision);
  }, [defaultDivision]);

  const handleAssignment = async () => {
    if (!comment.trim()) return alert("QMS Requirement: Please enter a technical instruction.");
    
    setIsPending(true);
    // Find the head associated with the selected division
    const head = availableHeads.find(h => h.division === selectedDiv);
    
    const result = await assignToDDD(appId, [selectedDiv], comment, head?.id);
    
    if (result.success) {
      setIsModalOpen(false);
      setComment(""); // Clear for next use
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
        className="bg-slate-900 text-white px-5 py-2.5 rounded-xl text-[10px] font-black uppercase shadow-lg flex items-center gap-2 hover:bg-blue-600 transition-all active:scale-95"
      >
        <Send className="w-3 h-3" /> Dispatch to Divisional Deputy Director
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-8 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
              <div>
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter italic">Director's Minute</h3>
                <p className="text-[10px] text-slate-400 font-bold uppercase">Assigning Technical Workflow</p>
              </div>
              <Building2 className="text-slate-200 w-8 h-8" />
            </div>

            <div className="p-8 space-y-6">
              {/* DIVISION SELECTOR */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
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

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2 px-1">
                  <MessageSquare className="w-3 h-3" /> Technical Direction
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full h-32 p-5 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none italic text-slate-600"
                  placeholder="e.g. Please conduct full dossier evaluation with focus on stability data..."
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
                  className="py-4 bg-blue-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-slate-900 transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-100"
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