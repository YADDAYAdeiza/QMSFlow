"use client"

import React, { useState } from 'react';
import { CalendarClock, ChevronDown, AlertCircle } from 'lucide-react';

export default function InspectionExpiryDropdown({ deadlines }: { deadlines: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  const getStatusColor = (date: Date) => {
    const diff = date.getTime() - new Date().getTime();
    const days = diff / (1000 * 60 * 60 * 24);
    if (days < 0) return "text-rose-600 bg-rose-50"; // Expired
    if (days < 90) return "text-amber-600 bg-amber-50"; // Due soon (< 3 months)
    return "text-emerald-600 bg-emerald-50";
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="px-6 py-3 bg-white border border-slate-200 rounded-2xl text-[10px] font-black uppercase flex items-center gap-2 hover:shadow-lg transition-all"
      >
        <CalendarClock className="w-4 h-4 text-blue-500" />
        Inspection Watchlist
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-[2rem] shadow-2xl z-50 overflow-hidden">
          <div className="p-4 border-b border-slate-100 bg-slate-50">
            <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Foreign Site Expiries</p>
          </div>
          <div className="max-h-64 overflow-y-auto custom-scrollbar">
            {deadlines.length > 0 ? deadlines.map((item) => (
              <div key={item.id} className="p-4 hover:bg-slate-50 flex items-center justify-between border-b border-slate-50 last:border-0">
                <div className="max-w-[180px]">
                  <p className="text-[10px] font-black text-slate-900 truncate uppercase">{item.companyName}</p>
                  <p className="text-[9px] text-slate-400 font-bold">{item.expiryDate.toLocaleDateString()}</p>
                </div>
                <div className={`px-3 py-1 rounded-full text-[8px] font-black uppercase ${getStatusColor(item.expiryDate)}`}>
                  {Math.ceil((item.expiryDate.getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} Days
                </div>
              </div>
            )) : (
              <div className="p-8 text-center text-slate-400 text-[10px] font-bold">No foreign expiries tracked.</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}