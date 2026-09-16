"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { X, RotateCcw, Loader2, UserCircle2, MessageSquare, Workflow, Building2 } from 'lucide-react';
import { returnToStaffFromDirector } from '@/lib/actions/director';
import { fetchDivisionalDeputyDirector } from '@/lib/actions/director'; // Import the action


interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: number;
  currentDDId: string;
  currentStaffId?: string | null;
  staffList: any[];
  onSuccess: () => void;
}

const DIVISIONS = [
  { key: "VMD", label: "Veterinary Medicine Division (VMD)" },
  { key: "AFPD", label: "Animal Feed Premix Division (AFPD)" },
  { key: "PAD", label: "Pesticides & Allied Products Division (PAD)" },
  { key: "IRSD", label: "Inspections, Relations & Stakeholder Division (IRSD)" },
];

export default function RejectionModal({ 
  isOpen, onClose, appId, currentDDId, currentStaffId, staffList, onSuccess 
}: RejectionModalProps) {
  const [remarks, setRemarks] = useState("");
  const [targetDivision, setTargetDivision] = useState("VMD");
  const [returnStepKey, setReturnStepKey] = useState("DDD_TECHNICAL_ASSIGNMENT");
  const [targetStaffId, setTargetStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

// Inside RejectionModal component:

  // Auto-resolve recipient: Query database fresh for the target division's Divisional Deputy Director
  useEffect(() => {
    let isMounted = true;

    if (!isOpen) {
      setRemarks("");
      setReturnStepKey("DDD_TECHNICAL_ASSIGNMENT");
      setTargetDivision("VMD");
      setTargetStaffId("");
      return;
    }

    async function resolveTarget() {
      if (returnStepKey === "DDD_TECHNICAL_ASSIGNMENT") {
        const res = await fetchDivisionalDeputyDirector(targetDivision);
        if (isMounted) {
          if (res.success && res.ddId) {
            setTargetStaffId(res.ddId);
          } else {
            // Absolute fallback safeguard if database query returns empty
            setTargetStaffId(currentDDId || "");
          }
        }
      } else if (currentStaffId) {
        if (isMounted) setTargetStaffId(currentStaffId);
      }
    }

    resolveTarget();

    return () => {
      isMounted = false;
    };
  }, [isOpen, targetDivision, returnStepKey, currentStaffId, currentDDId]);

  if (!isOpen) return null;

  const handleReturn = () => {
    if (!remarks.trim()) return alert("QMS Requirement: Please provide specific reasons for return.");
    if (!targetDivision) return alert("Please select a target division.");

    startTransition(async () => {
      const res = await returnToStaffFromDirector(
        appId, 
        remarks, 
        targetStaffId, 
        currentDDId, 
        returnStepKey, 
        targetDivision
      );
      if (res.success) {
        onSuccess();
      } else {
        alert(res.error || "Return action failed.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
        <div className="bg-rose-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl"><RotateCcw className="w-5 h-5" /></div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest text-white">Return for Rework</h3>
              <p className="text-[10px] text-rose-100 font-bold uppercase opacity-80">Directorate Action</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Building2 className="w-3 h-3" /> Target Division Routing
            </label>
            <select 
              value={targetDivision}
              onChange={(e) => setTargetDivision(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
            >
              {DIVISIONS.map((div) => (
                <option key={div.key} value={div.key}>{div.label}</option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <Workflow className="w-3 h-3" /> Return Stage Level
            </label>
            <select 
              value={returnStepKey}
              onChange={(e) => setReturnStepKey(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
            >
              <option value="DDD_TECHNICAL_ASSIGNMENT">Divisional Deputy Director Re-Assignment</option>
              <option value="REVIEW_OFFICER_REWORK">Direct to Review Officer</option>
            </select>
          </div>

          {returnStepKey === "REVIEW_OFFICER_REWORK" && (
            <div className="space-y-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
                <UserCircle2 className="w-3 h-3" /> Specific Desk Officer
              </label>
              <select 
                value={targetStaffId}
                onChange={(e) => setTargetStaffId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
              >
                <option value="">Select specific officer...</option>
                {staffList
                  .filter((s) => s.division === targetDivision)
                  .map((s) => (
                    <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
                  ))}
              </select>
            </div>
          )}

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Correction Instructions
            </label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-32 bg-slate-50 border border-slate-200 p-5 rounded-[2rem] text-sm italic text-slate-600 outline-none focus:ring-2 focus:ring-rose-500 resize-none"
              placeholder="Detail the specific corrections required..."
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <button onClick={onClose} className="py-4 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:bg-slate-100">Cancel</button>
            <button onClick={handleReturn} disabled={isPending} className="py-4 bg-rose-600 text-white rounded-2xl font-black uppercase text-[10px] hover:bg-rose-500 transition-all active:scale-95">
              {isPending ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}