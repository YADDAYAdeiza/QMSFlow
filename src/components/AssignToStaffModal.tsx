"use client";

import React, { useState } from 'react';
import { assignToStaff } from "@/lib/actions/ddd"; // Adjust path
import { UserPlus, MessageSquare } from "lucide-react";

export default function AssignToStaffModal({ appId, staffList }: { appId: number, staffList: any[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedStaff, setSelectedStaff] = useState("");
  const [instruction, setInstruction] = useState("");

  const handleConfirm = async () => {
    const res = await assignToStaff(appId, selectedStaff, instruction);
    if (res.success) setIsOpen(false);
  };

  if (!isOpen) return (
    <button onClick={() => setIsOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-black text-[10px] uppercase">
      Assign Technical Staff
    </button>
  );

  return (
    <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm flex items-center justify-center z-50">
      <div className="bg-white p-8 rounded-2xl w-full max-w-md shadow-2xl border-2 border-slate-900">
        <h2 className="text-lg font-black uppercase italic mb-4">Technical Assignment</h2>
        
        <label className="text-[10px] font-black uppercase text-slate-400">Select Reviewer</label>
        <select 
          className="w-full p-3 bg-slate-50 border mb-4 rounded-xl text-sm"
          onChange={(e) => setSelectedStaff(e.target.value)}
        >
          <option value="">Select an Officer...</option>
          {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
        </select>

        <label className="text-[10px] font-black uppercase text-slate-400">Technical Direction</label>
        <textarea 
          className="w-full h-32 p-3 bg-slate-50 border rounded-xl text-sm mb-6 resize-none"
          placeholder="Direct the reviewer on what to prioritize..."
          onChange={(e) => setInstruction(e.target.value)}
        />

        <div className="flex gap-2">
          <button onClick={() => setIsOpen(false)} className="flex-1 py-3 font-black uppercase text-[10px] text-slate-400">Cancel</button>
          <button 
            onClick={handleConfirm}
            className="flex-1 py-3 bg-slate-900 text-white font-black uppercase text-[10px] rounded-xl"
          >
            Confirm Assignment
          </button>
        </div>
      </div>
    </div>
  );
}