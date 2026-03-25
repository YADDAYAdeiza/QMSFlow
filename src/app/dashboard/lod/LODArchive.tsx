"use client"

import React, { useState } from 'react';
import { 
  ExternalLink, FileCheck, Building2, Calendar, 
  Search, ShieldCheck, FileText, Download 
} from 'lucide-react';

interface CompletedApp {
  id: number;
  applicationNumber: string;
  companyName: string;
  type: string;
  updatedAt: Date | string | null;
  clearanceUrl: string | null;   // Pass 1 Result
  certificateUrl: string | null; // Pass 2 Result
}

export default function LODArchive({ applications }: { applications: CompletedApp[] }) {
  const [filter, setFilter] = useState("");

  const filteredApps = applications.filter(app => 
    app.applicationNumber.toLowerCase().includes(filter.toLowerCase()) ||
    app.companyName.toLowerCase().includes(filter.toLowerCase())
  );

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {/* Search Header */}
      <div className="relative max-w-md group px-2">
        <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 group-focus-within:text-blue-500 transition-colors" />
        <input 
          type="text"
          placeholder="Filter by App # or Company..."
          className="w-full pl-12 pr-4 py-4 bg-white rounded-2xl border-none shadow-sm text-sm font-medium focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      {filteredApps.length === 0 ? (
        <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner mx-2">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <FileCheck className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">
            {filter ? "No matching records found" : "Archive Empty: No Issued Documents"}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden mx-2">
          <table className="w-full text-left border-collapse">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Dossier / Type</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant Info</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Issued</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Available Documents</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filteredApps.map((app) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                  {/* Dossier Info */}
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-black text-blue-600 tracking-tighter italic">#{app.applicationNumber}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tight">{app.type}</span>
                    </div>
                  </td>

                  {/* Applicant Info */}
                  <td className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-800 leading-tight max-w-[250px]">{app.companyName}</p>
                    </div>
                  </td>

                  {/* Date */}
                  <td className="p-8">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">
                        {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </div>
                  </td>

                  {/* Actions: Handles Pass 1 vs Pass 2 */}
                  <td className="p-8">
                    <div className="flex flex-col items-end gap-2">
                      {/* PASS 1: Facility Verification Clearance */}
                      {app.clearanceUrl ? (
                        <a 
                          href={app.clearanceUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 bg-blue-50 text-blue-700 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-100 shadow-sm"
                        >
                          <FileText className="w-3.5 h-3.5" /> GMP Clearance (Pass 1)
                        </a>
                      ) : null}

                      {/* PASS 2: Full GMP Certificate */}
                      {app.certificateUrl ? (
                        <a 
                          href={app.certificateUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-5 py-2.5 bg-slate-900 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-600 transition-all shadow-lg hover:scale-105 active:scale-95"
                        >
                          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> GMP Certificate (Pass 2)
                        </a>
                      ) : null}

                      {/* Empty State for Doc */}
                      {!app.clearanceUrl && !app.certificateUrl && (
                        <div className="flex items-center gap-2 text-rose-400 italic font-black text-[9px] uppercase">
                          <Download className="w-3 h-3" /> Files Not Uploaded
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}