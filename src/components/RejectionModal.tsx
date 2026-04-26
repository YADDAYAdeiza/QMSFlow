"use client"

import React, { useState, useEffect, useTransition } from 'react';
import { X, RotateCcw, AlertTriangle, Loader2, UserCircle2, MessageSquare } from 'lucide-react';
import { returnToStaff } from '@/lib/actions/ddd';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: number;
  currentDDId: string;
  currentStaffId?: string | null;
  staffList: any[];
  onSuccess: () => void;
}

export default function RejectionModal({ 
  isOpen, onClose, appId, currentDDId, currentStaffId, staffList, onSuccess 
}: RejectionModalProps) {
  console.log('This is currentStaffId: ', currentStaffId);
  const [remarks, setRemarks] = useState("");
  const [targetStaffId, setTargetStaffId] = useState("");
  const [isPending, startTransition] = useTransition();

  // Presets the staff ID and clears remarks when opening
  // Inside RejectionModal.tsx, replace your useEffect with this:

  useEffect(() => {
    if (isOpen && currentStaffId) {
      // Check if the ID exists in the staffList to prevent invalid selection
      const staffExists = staffList.some((s) => s.id === currentStaffId);
      if (staffExists) {
        setTargetStaffId(currentStaffId);
      }
    } else if (!isOpen) {
      // Optional: Only clear if you want the modal to reset every time it closes
      setRemarks("");
    }
  }, [isOpen, currentStaffId, staffList]);

  if (!isOpen) return null;

  const handleReturn = () => {
    if (!remarks.trim()) return alert("QMS Requirement: Please provide specific reasons for return.");
    if (!targetStaffId) return alert("Please select a recipient for the rework.");

    startTransition(async () => {
      const res = await returnToStaff(appId, targetStaffId, remarks, currentDDId);
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
              <p className="text-[10px] text-rose-100 font-bold uppercase opacity-80">Divisional Deputy Director Action</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform"><X className="w-5 h-5" /></button>
        </div>

        <div className="p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <UserCircle2 className="w-3 h-3" /> Assign To (For Correction)
            </label>
            <select 
              value={targetStaffId}
              onChange={(e) => setTargetStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 appearance-none cursor-pointer"
            >
              <option value="">Select recipient...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>{s.name} — {s.role}</option>
              ))}
            </select>
          </div>

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