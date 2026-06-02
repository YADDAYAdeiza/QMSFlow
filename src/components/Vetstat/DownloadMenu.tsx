'use client';

import * as XLSX from 'xlsx';
import { useState, useRef, useEffect } from 'react';
import { Download, FileSpreadsheet, FileText, ChevronDown } from 'lucide-react';

interface DownloadMenuProps {
  data: any[];
}

export default function DownloadMenu({ data }: DownloadMenuProps) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close drop menu dynamically if user clicks outside container footprint
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Normalizes loose JSON metadata and deep relational company tables into a unified flat object
  const prepareData = (items: any[]) => {
    return items.map(item => {
      const { metadata, atc_codes, companies_amr, ...rest } = item;
      
      // Safe metadata transformation parse segment
      let parsedMetadata = {};
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
      } catch (e) {
        console.error("Failed to parse ledger metadata context block", e);
      }
      
      return { 
        id: rest.id || 'N/A',
        entry_type: rest.entry_type || 'N/A',
        // >>> FIXED: Pulling from companies_amr single source of truth relation layer
        company_name: companies_amr?.company_name || rest.company_name || 'N/A',
        active_substance: atc_codes?.substance || rest.active_substance || 'N/A',
        vet_atc_code: atc_codes?.vet_atc || 'N/A',
        human_atc_code: atc_codes?.human_atc || 'N/A',
        risk_priority: atc_codes?.risk_priority || parsedMetadata?.risk_priority || 'Low',
        api_mass_mg: rest.api_mass_mg || 0,
        ddd_consumed: rest.ddd_consumed || 0,
        pack_quantity: rest.pack_quantity || 0,
        origin_warehouse: rest.origin_warehouse || 'N/A',
        destination_state: rest.destination_state || 'N/A',
        geopolitical_zone: rest.geopolitical_zone || 'N/A',
        target_species: rest.target_species || 'N/A',
        created_at: rest.created_at ? new Date(rest.created_at).toLocaleString() : 'N/A',
        ...parsedMetadata, // Spread remainder if specialized metadata keys exist
      };
    });
  };

  const downloadFile = (format: 'csv' | 'xls') => {
    if (!data || data.length === 0) {
      alert("No active ledger entries available to populate the requested export file.");
      setIsOpen(false);
      return;
    }

    const flattenedData = prepareData(data);
    const fileName = `VMD_Antimicrobial_Ledger_${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      // Safe key resolution protecting against empty index reference compilation faults
      const headers = Object.keys(flattenedData[0]);
      const csvRows = [
        headers.join(','),
        ...flattenedData.map(row => 
          headers.map(header => {
            const val = row[header] !== undefined && row[header] !== null ? row[header] : '';
            // Enforce clean CSV quoting formats protecting cells against internal literal comma splits
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          }).join(',')
        )
      ];
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${fileName}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Create SheetJs workbook buffers
      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      const workbook = XLSX.utils.book_new();
      
      // Auto-configure optimal column widths dynamically based on row content lengths
      const maxColWidths = flattenedData.reduce((acc, row) => {
        Object.keys(row).forEach((key, i) => {
          const valLen = String(row[key] || '').length;
          acc[i] = Math.max(acc[i] || 10, valLen, key.length);
        });
        return acc;
      }, [] as number[]);
      
      worksheet['!cols'] = maxColWidths.map(w => ({ w: w + 2 }));

      XLSX.utils.book_append_sheet(workbook, worksheet, "AMR Surveillance Log");
      XLSX.writeFile(workbook, `${fileName}.xlsx`);
    }
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block text-left" ref={menuRef}>
      <button 
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="bg-slate-900 text-white font-black text-xs uppercase tracking-widest px-4 py-3 rounded-xl hover:bg-slate-800 transition flex items-center gap-2 shadow-md focus:outline-none focus:ring-2 focus:ring-blue-600 cursor-pointer select-none"
      >
        <Download size={14} />
        <span>Export Options</span>
        <ChevronDown size={12} className={`transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 overflow-hidden divide-y divide-slate-100 animate-in fade-in slide-in-from-top-1 duration-150">
          <div className="px-3 py-2 bg-slate-50 text-[9px] font-black uppercase text-slate-400 tracking-widest">
            Select Document Output
          </div>
          <button 
            type="button"
            onClick={() => downloadFile('xls')} 
            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 group transition-colors cursor-pointer"
          >
            <FileSpreadsheet size={15} className="text-emerald-600 group-hover:scale-105 transition-transform" />
            <span>Structured Microsoft Excel</span>
          </button>
          <button 
            type="button"
            onClick={() => downloadFile('csv')} 
            className="w-full text-left px-4 py-3 text-xs font-bold text-slate-700 hover:bg-slate-50 flex items-center gap-2.5 group transition-colors cursor-pointer"
          >
            <FileText size={15} className="text-blue-600 group-hover:scale-105 transition-transform" />
            <span>Comma-Separated Values (CSV)</span>
          </button>
        </div>
      )}
    </div>
  );
}