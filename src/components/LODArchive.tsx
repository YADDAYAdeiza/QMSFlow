"use client"

import React from 'react';
import { ExternalLink, FileCheck, Building2, Calendar, Search } from 'lucide-react';

interface CompletedApp {
  id: number;
  applicationNumber: string;
  companyName: string;
  type: string;
  updatedAt: Date | string | null;
  certificateUrl: string | null; // This comes from app.details.archived_path
}

export default function LODArchive({ applications }: { applications: CompletedApp[] }) {
  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      {applications.length === 0 ? (
        <div className="p-32 text-center bg-white rounded-[4rem] border-2 border-dashed border-slate-100 shadow-inner">
          <div className="bg-slate-50 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
             <FileCheck className="w-10 h-10 text-slate-200" />
          </div>
          <p className="text-slate-400 font-black uppercase text-[10px] tracking-[0.4em]">Archive Empty: No Issued Certificates</p>
        </div>
      ) : (
        <div className="bg-white rounded-[3.5rem] shadow-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-slate-900 text-white">
              <tr>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Dossier / Type</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Applicant Info</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-slate-400">Date Issued</th>
                <th className="p-8 text-[10px] font-black uppercase tracking-widest text-right text-slate-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {applications.map((app) => (
                <tr key={app.id} className="hover:bg-blue-50/30 transition-colors group">
                  <td className="p-8">
                    <div className="flex flex-col">
                      <span className="font-mono text-sm font-black text-blue-600">#{app.applicationNumber}</span>
                      <span className="text-[9px] font-black text-slate-400 uppercase mt-1 tracking-tight">{app.type}</span>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-3">
                      <div className="h-10 w-10 bg-slate-100 rounded-xl flex items-center justify-center group-hover:bg-white transition-colors">
                        <Building2 className="w-5 h-5 text-slate-400" />
                      </div>
                      <p className="text-xs font-black uppercase text-slate-800 leading-tight max-w-[200px]">{app.companyName}</p>
                    </div>
                  </td>
                  <td className="p-8">
                    <div className="flex items-center gap-2 text-slate-500">
                      <Calendar className="w-3.5 h-3.5" />
                      <span className="text-[10px] font-bold">
                        {app.updatedAt ? new Date(app.updatedAt).toLocaleDateString('en-GB') : 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td className="p-8 text-right">
                    {app.certificateUrl ? (
                      <a 
                        href={app.certificateUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-2 px-6 py-3 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest hover:bg-blue-600 transition-all shadow-lg hover:scale-105 active:scale-95"
                      >
                        <ExternalLink className="w-3 h-3" /> View & Print Certificate
                      </a>
                    ) : (
                      <span className="text-[9px] font-black text-rose-400 uppercase italic">Doc Missing</span>
                    )}
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