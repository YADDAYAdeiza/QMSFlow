'use client';

import { FileText, ShieldCheck, Building2, Layers3 } from 'lucide-react';

interface CompanyAmr {
  id: string;
  company_name: string;
}

interface PermitRecord {
  id: string;
  permit_number: string;
  validity: 'Active' | 'Expired' | 'Suspended' | string;
  status: 'Original' | 'Amended' | string;
  companies_amr?: CompanyAmr | null;
}

interface PermitAuthDashboardProps {
  permits?: PermitRecord[];
}

export default function PermitAuthDashboard({ permits = [] }: PermitAuthDashboardProps) {
  // Defensive array insulation layer
  const data = permits || [];

  // 1. Structural Metric: Total processing footprint
  const totalEnrollments = data.length;

  // 2. Regulatory Metric: Active operational clearances
  const activeCount = data.filter(p => p?.validity === 'Active').length;

  // 3. Operational Pipeline Metric: Unamended baseline files
  const newEnrollments = data.filter(p => p?.status === 'Original').length;

  // 4. Normalized Data Profile Metric: Deduplicated Unique Importers
  const uniqueCompaniesCount = new Set(
    data
      .map(p => p?.companies_amr?.id || p?.companies_amr?.company_name)
      .filter(Boolean)
  ).size;

  return (
    <section className="space-y-6 mt-10 border-t border-slate-100 pt-10">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-800 flex items-center gap-2.5 tracking-tight">
            <FileText className="text-emerald-600" size={20} /> 
            API Permit Authorization Dashboard
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Real-time regulatory tracking metrics for active import allocations.
          </p>
        </div>
      </div>
      
      {/* Metrics Layout Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Metric: Total Document Records */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-200 transition">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Total Enrollments</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{totalEnrollments}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-slate-100 transition shrink-0">
            <Layers3 size={20} />
          </div>
        </div>

        {/* Metric: Legally Valid Clearances */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-emerald-200 transition">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black uppercase text-emerald-600 tracking-wider">Active Permits</h3>
            <p className="text-3xl font-black text-emerald-800 tracking-tight">{activeCount}</p>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 group-hover:bg-emerald-100 transition shrink-0">
            <ShieldCheck size={20} />
          </div>
        </div>

        {/* Metric: Unaltered Pipeline */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-slate-200 transition">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Original Base Records</h3>
            <p className="text-3xl font-black text-slate-800 tracking-tight">{newEnrollments}</p>
          </div>
          <div className="p-3 bg-slate-50 rounded-xl text-slate-400 group-hover:bg-slate-100 transition shrink-0">
            <FileText size={20} />
          </div>
        </div>

        {/* Metric: Deduplicated Monitored Corporations */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex items-center justify-between group hover:border-blue-200 transition">
          <div className="space-y-1.5">
            <h3 className="text-[10px] font-black uppercase text-blue-600 tracking-wider">Monitored Importers</h3>
            <p className="text-3xl font-black text-emerald-950 tracking-tight">{uniqueCompaniesCount}</p>
          </div>
          <div className="p-3 bg-blue-50/60 rounded-xl text-blue-600 group-hover:bg-blue-100/80 transition shrink-0">
            <Building2 size={20} />
          </div>
        </div>

      </div>
    </section>
  );
}