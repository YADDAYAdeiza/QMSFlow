'use client';
import { useState } from 'react';
import { Edit3 } from 'lucide-react';
import CertificateEnrollment from "./CertificateEnrollment";

export default function FPPEnrolledRegistry({ 
  data, 
  atcCodes, 
  companies 
}: { 
  data: any[], 
  atcCodes: any[], 
  companies: any[] 
}) {
  const [editingItem, setEditingItem] = useState<any | null>(null);

  return (
    <div className="space-y-4">
      {/* Hidden/Floating Modal trigger for editing */}
      {editingItem && (
        <CertificateEnrollment 
          companies={companies} 
          atcCodes={atcCodes} 
          editData={editingItem} // Pass the data to be edited
          onClose={() => setEditingItem(null)} // Reset state when closed
        />
      )}

      <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
        <table className="w-full text-left border-collapse">
          <thead className="bg-slate-50 border-b border-slate-200">
            <tr>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Reg No</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Product Name</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">MAH (Company)</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest">Pack Size</th>
              <th className="p-4 text-[10px] font-black uppercase text-slate-400 tracking-widest text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {data.map((item) => (
              <tr key={item.id} className="hover:bg-slate-50/50 transition-colors group">
                <td className="p-4 text-xs font-black text-blue-600">{item.permit_number}</td>
                <td className="p-4 text-xs font-bold text-slate-700">{item.product_name}</td>
                <td className="p-4 text-xs text-slate-500 font-medium">{item.company_name}</td>
                <td className="p-4 text-xs font-mono text-emerald-600">{item.shipping_pack_size}</td>
                <td className="p-4 text-right">
                  <button 
                    onClick={() => setEditingItem(item)}
                    className="p-2 hover:bg-amber-50 text-amber-600 rounded-lg transition-all opacity-0 group-hover:opacity-100"
                  >
                    <Edit3 size={14} />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}