"use client"

import React, { useState, useTransition } from 'react';
import { 
  X, RotateCcw, AlertTriangle, Loader2, 
  UserCircle2, MessageSquare 
} from 'lucide-react';
import { returnToStaff } from '@/lib/actions/ddd';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: number;
  currentDDId: string; // Added to identify the acting Divisional Deputy Director
  currentStaffId?: string; 
  staffList: any[];
  onSuccess: () => void;
}

export default function RejectionModal({ 
  isOpen, onClose, appId, currentDDId, currentStaffId, staffList, onSuccess 
}: RejectionModalProps) {
  const [remarks, setRemarks] = useState("");
  const [targetStaffId, setTargetStaffId] = useState(currentStaffId || "");
  const [isPending, startTransition] = useTransition();

  if (!isOpen) return null;

  const handleReturn = () => {
    if (!remarks.trim()) return alert("QMS Requirement: Please provide specific reasons for return.");
    if (!targetStaffId) return alert("Please select a recipient for the rework.");

    startTransition(async () => {
      // Logic: App ID, Target Recipient, The Remarks, and current DD ID
      const res = await returnToStaff(appId, targetStaffId, remarks, currentDDId);
      
      if (res.success) {
        setRemarks("");
        onSuccess();
      } else {
        alert(res.error || "Return action failed. Please verify the workflow state.");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-200">
        
        {/* HEADER */}
        <div className="bg-rose-600 p-6 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="bg-white/20 p-2 rounded-xl">
              <RotateCcw className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xs font-black uppercase tracking-widest">Return for Rework</h3>
              <p className="text-[10px] text-rose-100 font-bold uppercase opacity-80">Divisional Deputy Director Action</p>
            </div>
          </div>
          <button onClick={onClose} className="hover:rotate-90 transition-transform">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 space-y-6">
          {/* RECIPIENT SELECTION */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <UserCircle2 className="w-3 h-3" /> Assign To (For Correction)
            </label>
            <select 
              value={targetStaffId}
              onChange={(e) => setTargetStaffId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs font-bold text-slate-700 outline-none focus:ring-2 focus:ring-rose-500 transition-all appearance-none"
            >
              <option value="">Select recipient...</option>
              {staffList.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} — {s.role} ({s.division || 'Technical'})
                </option>
              ))}
            </select>
          </div>

          {/* REMARKS */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
              <MessageSquare className="w-3 h-3" /> Correction Instructions
            </label>
            <textarea 
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full h-32 bg-slate-50 border border-slate-200 p-5 rounded-[2rem] text-sm italic text-slate-600 outline-none focus:ring-2 focus:ring-rose-500 resize-none transition-all"
              placeholder="Detail the specific corrections required before re-submission..."
            />
          </div>

          {/* QMS NOTE */}
          <div className="bg-amber-50 border border-amber-100 p-4 rounded-2xl flex gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
            <p className="text-[10px] text-amber-700 leading-relaxed italic">
              <strong>Note:</strong> Returning this dossier will pause the current 
              Divisional clock and re-open the clock for the selected staff member 
              under <strong>Point 8: Return for Rework</strong>.
            </p>
          </div>

          {/* ACTIONS */}
          <div className="grid grid-cols-2 gap-4 pt-2">
            <button 
              onClick={onClose}
              className="py-4 rounded-2xl font-black uppercase text-[10px] text-slate-400 hover:bg-slate-100 transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={handleReturn}
              disabled={isPending}
              className="py-4 bg-rose-600 hover:bg-rose-500 text-white rounded-2xl font-black uppercase text-[10px] shadow-lg shadow-rose-900/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "Confirm Return"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}