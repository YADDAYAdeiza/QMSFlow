'use client';
import { FileText } from 'lucide-react';

export default function PermitAuthDashboard({ permits = [] }: { permits?: any[] }) {
  // Defensive coding: ensure 'data' is always an array to prevent .length or .filter() errors
  const data = permits || [];

  // Metrics calculation
  const totalEnrollments = data.length;
  const activeCount = data.filter(p => p?.validity === 'Active').length;
  const newEnrollments = data.filter(p => p?.status === 'Original').length;

  return (
    <section className="space-y-8 mt-12 border-t border-slate-200 pt-12">
      <h2 className="text-2xl font-bold text-emerald-950 flex items-center gap-2">
        <FileText className="text-emerald-600" /> API Permit Authorization Dashboard
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Metric 1: Total volume of all permit records */}
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-emerald-500">Total Enrollments</h3>
          <p className="text-4xl font-black mt-2 text-emerald-800">{totalEnrollments}</p>
        </div>

        {/* Metric 2: Legally valid authorizations */}
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-emerald-500">Active Permits</h3>
          <p className="text-4xl font-black mt-2 text-emerald-800">{activeCount}</p>
        </div>

        {/* Metric 3: Pipeline of new applications */}
        <div className="bg-white p-6 rounded-xl border border-emerald-100 shadow-sm">
          <h3 className="text-xs font-bold uppercase text-emerald-500">Original Enrollments</h3>
          <p className="text-4xl font-black mt-2 text-emerald-800">{newEnrollments}</p>
        </div>
      </div>
    </section>
  );
}