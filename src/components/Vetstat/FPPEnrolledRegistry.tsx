'use client';

import { useState } from 'react';
import { Edit3, Layers, HelpCircle } from 'lucide-react';
import CertificateEnrollment from "./CertificateEnrollment";

interface FPPItem {
  id: string;
  permit_number: string;
  product_name: string;
  company_name?: string; // Legacy fallback string
  companies_amr?: {
    company_name: string; // Unified relational source of truth
  };
  shipping_pack_size: string;
  [key: string]: any; // Catch-all for extra database properties
}

interface FPPEnrolledRegistryProps {
  data: FPPItem[];
  atcCodes: any[];
  companies: any[];
  companiesCatalog: any[]
}

export default function FPPEnrolledRegistry({ 
  data = [], 
  atcCodes = [], 
  companies = [] ,
  companiesCatalog = []
}: FPPEnrolledRegistryProps) {
  const [editingItem, setEditingItem] = useState<FPPItem | null>(null);

  return (
    <div className="space-y-4 animate-in fade-in duration-200">
      {/* Overlay Modal Trigger Context for Form Corrections */}
      {editingItem && (
        <CertificateEnrollment 
          companies={companies} 
          atcCodes={atcCodes} 
          editData={editingItem} 
          companiesCatalog = {companies}
          onClose={() => setEditingItem(null)} // Flushes memory snapshot cleanly on close
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[640px]">
            <thead className="bg-slate-50 border-b border-slate-200 select-none">
              <tr>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reg No</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Name</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">MAH (Company)</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pack Size</th>
                <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {data.length > 0 ? (
                data.map((item) => {
                  // Resolve corporate identity strictly via companies_amr relational source of truth
                  const resolvedCompany = item.companies_amr?.company_name || item.company_name || 'Unlinked MAH';

                  return (
                    <tr key={item.id} className="hover:bg-slate-50/60 transition-colors group">
                      <td className="p-4 text-xs font-black text-blue-600 font-mono tracking-tight whitespace-nowrap">
                        {item.permit_number}
                      </td>
                      <td className="p-4 text-xs font-bold text-slate-800">
                        {item.product_name}
                      </td>
                      <td className="p-4 text-xs text-slate-500 font-semibold max-w-xs truncate" title={resolvedCompany}>
                        {resolvedCompany}
                      </td>
                      <td className="p-4 text-xs font-mono font-bold text-emerald-600 whitespace-nowrap">
                        {item.shipping_pack_size}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <button 
                          type="button"
                          onClick={() => setEditingItem(item)}
                          className="p-2 bg-slate-50 hover:bg-amber-50 text-slate-400 hover:text-amber-600 border border-slate-200 hover:border-amber-200 rounded-xl transition-all inline-flex items-center gap-1 cursor-pointer"
                          title={`Modify registration context for ${item.product_name}`}
                        >
                          <Edit3 size={13} />
                          <span className="text-[10px] font-black uppercase tracking-wider pr-1 md:inline hidden">Amend</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={5} className="p-12 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-slate-400">
                      <Layers size={24} className="text-slate-300 stroke-[1.5]" />
                      <p className="text-xs font-bold uppercase tracking-wide">No product registrations currently recorded.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}