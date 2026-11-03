"use client";

import React, { useState } from "react";

interface RecordItem {
  id: number;
  applicationNumber: string;
  companyName: string;
  displayFacilityName?: string;
  isDeskReview?: boolean | null;
  currentPoint: string | null;
  status: string;
  details?: {
    poaUrl?: string;
    verificationReportUrl?: string;
    [key: string]: unknown;
  } | null;
}

export default function FacilityVerificationsView({ records }: { records: RecordItem[] }) {
  const [modalUrl, setModalUrl] = useState<string | null>(null);
  const [modalTitle, setModalTitle] = useState<string>("");

  return (
    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-xs">
      {records.length === 0 ? (
        <div className="p-12 text-center text-slate-400 text-sm">
          No completed facility verifications found matching the clearance criteria.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/70 border-b border-slate-200 text-xs font-semibold text-slate-500 tracking-wider">
                <th className="p-4">Application ID</th>
                <th className="p-4">Target Facility & Local Agent</th>
                <th className="p-4">Review Type</th>
                <th className="p-4">Final Stage / Status</th>
                <th className="p-4 text-right">Document Previews</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-sm text-slate-700">
              {records.map((app) => {
                const poaLink = app.details?.poaUrl;
                const verificationReportLink = app.details?.verificationReportUrl;
                const isDesk = Boolean(app.isDeskReview);

                return (
                  <tr key={app.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="p-4 font-mono font-medium text-slate-900">{app.applicationNumber}</td>
                    
                    <td className="p-4">
                      <div className="font-bold text-slate-900">{app.displayFacilityName}</div>
                      <div className="text-xs text-slate-500">Agent: <span className="font-medium text-slate-700">{app.companyName}</span></div>
                    </td>

                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-bold border ${
                        isDesk ? "bg-amber-50 text-amber-800 border-amber-200" : "bg-indigo-50 text-indigo-800 border-indigo-200"
                      }`}>
                        {isDesk ? "💻 Desk Review" : "🏗️ On-Site Inspection"}
                      </span>
                    </td>

                    <td className="p-4">
                      <div className="text-xs font-semibold text-slate-800">{app.currentPoint}</div>
                      <span className="inline-flex items-center px-2 py-0.5 mt-1 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {app.status}
                      </span>
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end flex-wrap gap-2 text-xs">
                        {poaLink ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalUrl(poaLink);
                              setModalTitle(`POA Dossier - ${app.applicationNumber}`);
                            }}
                            className="text-blue-600 hover:underline font-semibold cursor-pointer"
                          >
                            📄 POA Dossier
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No POA</span>
                        )}
                        <span>•</span>
                        {verificationReportLink ? (
                          <button
                            type="button"
                            onClick={() => {
                              setModalUrl(verificationReportLink);
                              setModalTitle(`Verification Report - ${app.applicationNumber}`);
                            }}
                            className="text-indigo-600 hover:underline font-semibold cursor-pointer"
                          >
                            📊 Verification Report
                          </button>
                        ) : (
                          <span className="text-slate-400 italic">No Report</span>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Interactive iFrame Preview Modal Overlay */}
      {modalUrl && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="bg-white rounded-2xl w-full max-w-5xl h-[85vh] flex flex-col shadow-2xl overflow-hidden border border-slate-300">
            <div className="flex justify-between items-center px-6 py-4 bg-slate-900 text-white">
              <h3 className="font-bold text-sm tracking-wide">{modalTitle}</h3>
              <button
                type="button"
                onClick={() => {
                  setModalUrl(null);
                  setModalTitle("");
                }}
                className="text-slate-400 hover:text-white font-bold text-lg cursor-pointer px-2"
              >
                ✕
              </button>
            </div>
            <div className="flex-1 bg-slate-100 p-2">
              <iframe
                src={modalUrl}
                title={modalTitle}
                className="w-full h-full rounded-xl border border-slate-300 bg-white"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}