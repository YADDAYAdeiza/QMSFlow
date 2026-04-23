'use client'

import * as XLSX from 'xlsx';
import { useState } from 'react';

export default function DownloadMenu({ data }: { data: any[] }) {
  const [isOpen, setIsOpen] = useState(false);

  // Helper to flatten metadata and joined atc_codes into a single row
  const prepareData = (items: any[]) => {
    return items.map(item => {
      const { metadata, atc_codes, ...rest } = item;
      
      // Parse metadata JSON
      let parsedMetadata = {};
      try {
        parsedMetadata = typeof metadata === 'string' ? JSON.parse(metadata) : (metadata || {});
      } catch (e) {
        console.error("Failed to parse metadata", e);
      }
      
      // Flatten joined atc_codes and parsed metadata into the top-level object
      return { 
        ...rest, 
        ...parsedMetadata,
        drug_class: atc_codes?.class || 'N/A',
        risk_priority: atc_codes?.risk_priority || 'N/A',
        substance: atc_codes?.substance || 'N/A'
      };
    });
  };

  const downloadFile = (format: 'csv' | 'xls') => {
    const flattenedData = prepareData(data);
    
    if (format === 'csv') {
      const headers = Object.keys(flattenedData[0]);
      const csvRows = [
        headers.join(','),
        ...flattenedData.map(row => 
          headers.map(header => JSON.stringify(row[header] || '')).join(',')
        )
      ];
      
      const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", "LedgerData.csv");
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      // Corrected: Use XLSX.utils to access book_new
      const worksheet = XLSX.utils.json_to_sheet(flattenedData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "LedgerData");
      XLSX.writeFile(workbook, "LedgerData.xlsx");
    }
    setIsOpen(false);
  };

  return (
    <div className="relative">
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className="bg-blue-100 text-blue-700 px-4 py-2 rounded-lg font-semibold hover:bg-blue-200 transition"
      >
        Download Data
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-32 bg-white border border-blue-100 rounded-lg shadow-lg z-50">
          <button 
            onClick={() => downloadFile('csv')} 
            className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-900"
          >
            Export CSV
          </button>
          <button 
            onClick={() => downloadFile('xls')} 
            className="block w-full text-left px-4 py-2 hover:bg-blue-50 text-blue-900"
          >
            Export Excel
          </button>
        </div>
      )}
    </div>
  );
}