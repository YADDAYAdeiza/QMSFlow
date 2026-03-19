"use client"

import React from 'react';
import { 
  ShieldCheck, ShieldAlert, Clock, 
  ChevronRight, Factory, FileSearch, Calendar,
  MoreHorizontal, AlertTriangle
} from 'lucide-react';
import { cn } from "@/lib/utils";
import { format } from "date-fns";

interface RiskItem {
  id: number;
  facilityName: string;
  appNumber: string;
  intrinsicLevel: 'Low' | 'Medium' | 'High' | null;
  orr: 'A' | 'B' | 'C' | null;
  status: 'PARTIAL' | 'FINALIZED';
  nextInspection: string | null;
  updatedAt: string;
}

export default function RiskTable({ data }: { data: RiskItem[] }) {
  return (
    <div className="w-full bg-white rounded-[2.5rem] shadow-sm border border-slate-100 overflow-hidden">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-slate-50/50 border-b border-slate-100">
            <th className="px-8 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Facility & Dossier</th>
            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pass 1: Intrinsic</th>
            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pass 2: Compliance</th>
            <th className="px-6 py-6 text-[10px] font-black uppercase text-slate-400 tracking-widest">Status / Validity</th>
            <th className="px-6 py-6"></th>
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-50">
          {data.map((item) => (
            <tr key={item.id} className="hover:bg-blue-50/30 transition-colors group">
              {/* Facility Info */}
              <td className="px-8 py-5">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-400 group-hover:bg-blue-100 group-hover:text-blue-600 transition-all">
                    <Factory className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="text-sm font-black text-slate-900 uppercase tracking-tighter">{item.facilityName}</p>
                    <p className="text-[10px] font-bold text-slate-400 flex items-center gap-1">
                      <FileSearch className="w-3 h-3" /> {item.appNumber}
                    </p>
                  </div>
                </div>
              </td>

              {/* Pass 1: Intrinsic Risk */}
              <td className="px-6 py-5">
                <div className={cn(
                  "inline-flex items-center gap-2 px-3 py-1 rounded-lg border font-black text-[10px] uppercase",
                  item.intrinsicLevel === 'High' ? "bg-rose-50 border-rose-100 text-rose-600" :
                  item.intrinsicLevel === 'Medium' ? "bg-amber-50 border-amber-100 text-amber-600" :
                  "bg-emerald-50 border-emerald-100 text-emerald-600"
                )}>
                  <ShieldAlert className="w-3 h-3" />
                  {item.intrinsicLevel || "Pending"}
                </div>
              </td>

              {/* Pass 2: Final ORR */}
              <td className="px-6 py-5">
                {item.orr ? (
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full bg-slate-900 text-white flex items-center justify-center font-black text-xs shadow-lg shadow-slate-200">
                      {item.orr}
                    </div>
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-tight">Rating</span>
                  </div>
                ) : (
                  <span className="text-[10px] font-black text-slate-300 uppercase italic">Awaiting Review</span>
                )}
              </td>

              {/* Lifecycle Status */}
              <td className="px-6 py-5">
                <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "w-2 h-2 rounded-full animate-pulse",
                      item.status === 'FINALIZED' ? "bg-emerald-500" : "bg-amber-400"
                    )} />
                    <span className="text-[10px] font-black uppercase text-slate-700">{item.status}</span>
                  </div>
                  {item.nextInspection && (
                    <div className="flex items-center gap-1 text-[9px] font-bold text-slate-400">
                      <Calendar className="w-3 h-3" />
                      Expires: {format(new Date(item.nextInspection), 'MMM yyyy')}
                    </div>
                  )}
                </div>
              </td>

              {/* Actions */}
              <td className="px-6 py-5 text-right">
                <button className="p-2 text-slate-300 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-all">
                  <ChevronRight className="w-5 h-5" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}