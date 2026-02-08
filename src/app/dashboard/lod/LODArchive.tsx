"use client"

import React from 'react';
import { ExternalLink, Building2, Calendar, FileCheck, Search } from 'lucide-react';

export default function LODArchive({ applications }: { applications: any[] }) {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-slate-900 text-white">
            <tr>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Dossier Detail</th>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Manufacturer</th>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">Date Finalized</th>
              <th className="p-8 text-[10px] font-black uppercase tracking-[0.2em] text-right text-slate-400">Document</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {applications.map((app) => (
              <tr key={app.id} className="hover:bg-blue-50/50 transition-colors group">
                <td className="p-8">
                  <p className="font-mono text-sm font-black text-blue-600">#{app.applicationNumber}</p>
                  <p className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tighter">{app.type}</p>
                </td>
                <td className="p-8">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors border border-transparent group-hover:border-blue-100">
                      <Building2 className="w-5 h-5 text-slate-400 group-hover:text-blue-600" />
                    </div>
                    <span className="text-xs font-black uppercase text-slate-800 leading-tight">{app.companyName}</span>
                  </div>
                </td>
                <td className="p-8">
                  <div className="flex items-center gap-2 text-slate-500">
                    <Calendar className="w-3.5 h-3.5" />
                    <span className="text-[10px] font-bold">
                      {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                    </span>
                  </div>
                </td>
                <td className="p-8 text-right">
                  {app.certificateUrl ? (
                    <a 
                      href={app.certificateUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-6 py-3 bg-emerald-600 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-slate-900 transition-all shadow-lg active:scale-95"
                    >
                      <ExternalLink className="w-3 h-3" /> View Clearance
                    </a>
                  ) : (
                    <span className="text-[9px] font-black text-rose-400 uppercase italic">Incomplete Path</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {applications.length === 0 && (
          <div className="p-32 text-center bg-slate-50/50">
            <FileCheck className="w-12 h-12 text-slate-200 mx-auto mb-4" />
            <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.3em]">The archive is currently empty</p>
          </div>
        )}
      </div>
    </div>
  );
}