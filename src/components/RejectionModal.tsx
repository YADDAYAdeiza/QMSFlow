"use client"

import React, { useState } from 'react';
import { returnToStaff } from '@/lib/actions'; // Adjust path if needed
import { RotateCcw, UserPlus, X, AlertTriangle } from 'lucide-react';

interface RejectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  appId: number;
  currentStaffId: string;
  staffList: { id: string, name: string }[];
  onSuccess: () => void;
}

export default function RejectionModal({ 
  isOpen, 
  onClose, 
  appId, 
  currentStaffId, 
  staffList, 
  onSuccess 
}: RejectionModalProps) {
  const [reason, setReason] = useState("");
  const [isReassigning, setIsReassigning] = useState(false);
  const [newStaffId, setNewStaffId] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleReturn = async () => {
    if (!reason.trim()) return alert("Please provide a reason for the rework.");
    
    // Decide who gets the application back
    const targetStaffId = (isReassigning && newStaffId) ? newStaffId : currentStaffId;

    if (!targetStaffId) {
      return alert("No staff member identified for return.");
    }

    setLoading(true);
    try {
      const result = await returnToStaff(appId, reason, targetStaffId);
      if (result.success) {
        onSuccess();
      } else {
        alert("Failed to process return.");
      }
    } catch (error) {
      console.error(error);
      alert("An error occurred.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl overflow-hidden border border-slate-200">
        
        {/* Header */}
        <div className="p-6 bg-rose-50 border-b border-rose-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-rose-600">
            <RotateCcw className="w-5 h-5" />
            <h2 className="text-sm font-black uppercase tracking-tighter">Return for Rework</h2>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Reason Section */}
          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 tracking-widest">
              Instructions for Correction
            </label>
            <textarea 
              className="w-full p-4 border-2 border-slate-100 rounded-2xl text-sm focus:border-rose-500 outline-none italic bg-slate-50/50 min-h-[120px]"
              placeholder="e.g., Please verify the manufacturer's GMP certificate validity period..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>

          {/* Reassignment Logic */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100 space-y-4">
            <label className="flex items-center gap-3 cursor-pointer group">
              <input 
                type="checkbox" 
                checked={isReassigning}
                onChange={(e) => setIsReassigning(e.target.checked)}
                className="w-4 h-4 accent-rose-600"
              />
              <span className="text-[10px] font-black uppercase text-slate-600 group-hover:text-rose-600 transition-colors">
                Change assigned staff member?
              </span>
            </label>

            {isReassigning && (
              <div className="animate-in fade-in slide-in-from-top-2 duration-200">
                <select 
                  value={newStaffId}
                  onChange={(e) => setNewStaffId(e.target.value)}
                  className="w-full p-3 bg-white border-2 border-slate-200 rounded-xl text-xs font-bold outline-none focus:border-rose-500 shadow-sm"
                >
                  <option value="">-- Select New Technical Reviewer --</option>
                  {staffList.map((staff) => (
                    <option key={staff.id} value={staff.id}>
                      {staff.name}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex items-center gap-2 text-amber-600">
                  <AlertTriangle className="w-3 h-3" />
                  <p className="text-[9px] font-bold uppercase italic">Will move to new reviewer's desk</p>
                </div>
              </div>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex gap-3 pt-2">
            <button 
              type="button"
              onClick={onClose}
              className="flex-1 py-4 text-[10px] font-black uppercase text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-2xl transition-all"
            >
              Cancel
            </button>
            <button 
              disabled={loading || !reason.trim() || (isReassigning && !newStaffId)}
              onClick={handleReturn}
              className="flex-1 py-4 text-[10px] font-black uppercase bg-rose-600 text-white rounded-2xl shadow-lg shadow-rose-200 disabled:opacity-50 disabled:shadow-none hover:bg-rose-700 transition-all"
            >
              {loading ? "PROCESSING..." : "CONFIRM RETURN"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}