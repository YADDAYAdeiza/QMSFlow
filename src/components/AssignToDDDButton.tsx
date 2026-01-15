"use client";

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Send, MessageSquare, Loader2 } from "lucide-react";
import { assignToDDD } from '@/lib/actions/director';

interface AssignToDDDButtonProps {
  appId: number;
  divisions: string[];
}

export default function AssignToDDDButton({ appId, divisions }: AssignToDDDButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [comment, setComment] = useState("");
  const [isPending, setIsPending] = useState(false);

  const handleAssignment = async () => {
    if (!comment.trim()) {
      alert("Please enter an instruction or minute for the Division.");
      return;
    }

    setIsPending(true);
    try {
      // Calling your updated action with the comment/instruction
      const result = await assignToDDD(appId, divisions, comment);
      
      if (result.success) {
        setIsModalOpen(false);
        router.refresh();
      } else {
        alert("Failed to assign application.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred during assignment.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsModalOpen(true)}
        className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black uppercase tracking-widest rounded-lg transition-all shadow-md active:scale-95"
      >
        <Send className="w-3 h-3" />
        Assign to DDD
      </button>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="p-6 border-b border-slate-100 bg-slate-50">
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-tight">
                Director's Instruction (Minute)
              </h3>
              <p className="text-[10px] text-slate-500 font-medium mt-1 uppercase">
                Targeting: <span className="text-blue-600 font-bold">{divisions.join(", ")}</span>
              </p>
            </div>

            <div className="p-6 space-y-4">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-400 uppercase flex items-center gap-2">
                  <MessageSquare className="w-3 h-3" />
                  Technical Direction
                </label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="e.g., Proceed with urgent technical review. Pay close attention to cold-chain stability data..."
                  className="w-full h-32 p-3 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all outline-none resize-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  disabled={isPending}
                  onClick={() => setIsModalOpen(false)}
                  className="py-3 text-[10px] font-black uppercase tracking-widest text-slate-400 hover:bg-slate-50 rounded-xl transition-colors"
                >
                  Cancel
                </button>
                <button
                  disabled={isPending || !comment.trim()}
                  onClick={handleAssignment}
                  className="py-3 bg-slate-900 text-white text-[10px] font-black uppercase tracking-widest rounded-xl hover:bg-blue-600 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  {isPending ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    "Confirm Assignment"
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}