"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquare, Loader2, Building2 } from "lucide-react";
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
  const [selectedDiv, setSelectedDiv] = useState(defaultDivision);
  const [isPending, setIsPending] = useState(false);

  const handleAssignment = async () => {
    if (!comment.trim()) return alert("Please enter an instruction.");
    
    setIsPending(true);
    // We send the selectedDiv and the specific Head ID to our action
    const head = availableHeads.find(h => h.division === selectedDiv);
    
    const result = await assignToDDD(appId, [selectedDiv], comment, head?.id);
    
    if (result.success) {
      setIsModalOpen(false);
      router.refresh();
    } else {
      alert("Assignment failed.");
    }
    setIsPending(false);
  };

  return (
    <>
      <button onClick={() => setIsModalOpen(true)} className="...">
        <Send className="w-3 h-3" /> Assign to Divisional Deputy Director
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-[2.5rem] shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-8 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tighter">Director's Minute</h3>
            </div>

            <div className="p-8 space-y-6">
              {/* DIVISION SELECTOR (THE OVERWRITE) */}
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <Building2 className="w-3 h-3" /> Target Division
                </label>
                <select 
                  value={selectedDiv}
                  onChange={(e) => setSelectedDiv(e.target.value)}
                  className="w-full p-4 bg-slate-50 border-none rounded-2xl text-xs font-bold outline-none ring-2 ring-transparent focus:ring-blue-500 transition-all"
                >
                  {availableHeads.map(head => (
                    <option key={head.id} value={head.division}>
                      {head.division} — {head.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" /> Technical Direction
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="w-full h-32 p-4 text-sm bg-slate-50 border-none rounded-2xl focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                  placeholder="Enter instructions..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <button onClick={() => setIsModalOpen(false)} className="py-4 text-[10px] font-black uppercase text-slate-400">Cancel</button>
                <button 
                  disabled={isPending} 
                  onClick={handleAssignment}
                  className="py-4 bg-slate-900 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-blue-600 transition-all flex items-center justify-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Assignment"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}