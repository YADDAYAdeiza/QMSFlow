"use client";

import React from 'react';
import { Printer } from 'lucide-react';

export default function CapaLetterView({ app, observations }: { app: any, observations: any[] }) {
  const today = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  const company = app.company || { name: "Company Name", address: "Address" };

  // Helper to filter observations by severity
  const getBySeverity = (sev: string) => observations.filter(o => o.severity?.toLowerCase() === sev.toLowerCase());

  const criticals = getBySeverity('Critical');
  const majors = getBySeverity('Major');
  const others = getBySeverity('Others').length > 0 ? getBySeverity('Others') : getBySeverity('Minor');

  return (
    <div className="bg-white p-12 shadow-lg max-w-[900px] mx-auto text-slate-900 font-serif leading-relaxed text-[11px] min-h-[11in]">
      {/* Header section matches your PDF template */}
      <div className="text-center mb-10 border-b border-slate-900 pb-4">
        <h1 className="text-[16px] font-bold uppercase tracking-tight">National Agency for Food and Drug Administration and Control</h1>
        <h2 className="text-[13px] font-bold underline mt-1">OFFICE OF THE DIRECTOR (AFPD) DIRECTORATE</h2>
        <p className="text-[9px] mt-1 font-sans">Plot 1, Isolo Industrial Scheme, Oshodi-Apapa Expressway, Isolo, Lagos</p>
      </div>

      <div className="flex justify-between mb-8 font-bold text-[12px]">
        <span>Ref. No: NAFDAC/AFPD/2026/{app.id}</span>
        <span>Date: {today}</span>
      </div>

      <div className="mb-8 text-[12px]">
        <p className="font-bold underline italic">The Managing Director,</p>
        <p className="font-bold">{company.name}</p>
        <p className="whitespace-pre-line">{company.address}</p>
      </div>

      <p className="mb-6 font-bold uppercase underline text-center text-[13px]">
        NOTIFICATION OF OUTCOME OF GOOD MANUFACTURING PRACTICE (GMP) INSPECTION
      </p>

      <p className="mb-4">
        Kindly recall that your factory was inspected by a team of NAFDAC inspectors. 
        However, your application for registration of products will not be granted as the inspection 
        was not satisfactory.
      </p>

      <p className="mb-6">
        You are however expected to submit your CAPA Plan of actions taken to close the deficiencies shared in the 
        report using the table below and provide objective evidences of completion of corrective action in an 
        electronic editable format to director's email and copy directorate email.
      </p>

      {/* Formal CAPA Table */}
      <table className="w-full border-collapse border border-slate-900 mb-8 text-[9px]">
        <thead>
          <tr className="bg-slate-100">
            <th className="border border-slate-900 p-2 w-[25%]">Audit Findings (Observations)</th>
            <th className="border border-slate-900 p-2">Root Cause Analysis</th>
            <th className="border border-slate-900 p-2">Correction</th>
            <th className="border border-slate-900 p-2">Corrective Action(s)</th>
            <th className="border border-slate-900 p-2">Indicators for Completion</th>
            <th className="border border-slate-900 p-2">Timeline</th>
            <th className="border border-slate-900 p-2">Responsibility</th>
          </tr>
        </thead>
        <tbody>
          {/* CRITICAL SECTION */}
          <tr className="bg-slate-50 font-bold italic">
            <td className="border border-slate-900 p-2">Critical</td>
            {[...Array(6)].map((_, i) => <td key={i} className="border border-slate-900"></td>)}
          </tr>
          {criticals.map((obs, i) => (
            <tr key={i}>
              <td className="border border-slate-900 p-2">• {obs.finding}</td>
              {[...Array(6)].map((_, j) => <td key={j} className="border border-slate-900 p-2"></td>)}
            </tr>
          ))}

          {/* MAJOR SECTION */}
          <tr className="bg-slate-50 font-bold italic">
            <td className="border border-slate-900 p-2">Major</td>
            {[...Array(6)].map((_, i) => <td key={i} className="border border-slate-900"></td>)}
          </tr>
          {majors.map((obs, i) => (
            <tr key={i}>
              <td className="border border-slate-900 p-2">• {obs.finding}</td>
              {[...Array(6)].map((_, j) => <td key={j} className="border border-slate-900 p-2"></td>)}
            </tr>
          ))}

          {/* OTHERS SECTION */}
          <tr className="bg-slate-50 font-bold italic">
            <td className="border border-slate-900 p-2">Others</td>
            {[...Array(6)].map((_, i) => <td key={i} className="border border-slate-900"></td>)}
          </tr>
          {others.map((obs, i) => (
            <tr key={i}>
              <td className="border border-slate-900 p-2">• {obs.finding}</td>
              {[...Array(6)].map((_, j) => <td key={j} className="border border-slate-900 p-2"></td>)}
            </tr>
          ))}
        </tbody>
      </table>

      <div className="grid grid-cols-2 gap-8 mb-10 text-[10px]">
        <div>
          <p className="font-bold underline mb-4 text-xs italic">Responsible Person:</p>
          <div className="space-y-4">
            <p>Name: ________________________</p>
            <p>Signature: ____________________</p>
            <p>Date: _________________________</p>
          </div>
        </div>
        <div>
          <p className="font-bold underline mb-4 text-xs italic">Managing Director:</p>
          <div className="space-y-4">
            <p>Name: ________________________</p>
            <p>Signature: ____________________</p>
            <p>Date: _________________________</p>
          </div>
        </div>
      </div>

      <p className="mb-8">
        Kindly acknowledge receipt and revert with your CAPA plan on the deficiencies within 14 calendar 
        days of receiving this letter. You are requested to liaise with the AFPD Division of AFPD 
        Directorate for scheduling of the Follow-up Inspection upon readiness after your CAPA submission.
      </p>

      <div className="mt-16">
        <p className="font-bold text-[13px]">Director (AFPD)</p>
        <p className="font-bold italic">For: Director-General (NAFDAC)</p>
      </div>
    </div>
  );
}