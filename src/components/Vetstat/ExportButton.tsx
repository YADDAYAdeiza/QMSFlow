'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet, Loader2, AlertCircle } from 'lucide-react';

export default function ExportButton() {
  const searchParams = useSearchParams();
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleExport = async () => {
    setIsExporting(true);
    setError(null);

    try {
      const params = new URLSearchParams(searchParams.toString());
      const endpoint = `/api/export-ams?${params.toString()}`;

      // Fetch the file as a binary blob instead of breaking layout via window.location
      const response = await fetch(endpoint, { method: 'GET' });

      if (!response.ok) {
        throw new Error(`Export failed with status: ${response.status}`);
      }

      const blob = await response.blob();
      
      // Determine filename from response headers or fall back to an audited date string
      const contentDisposition = response.headers.get('content-disposition');
      let fileName = `VMD_AMS_Audit_Log_${new Date().toISOString().split('T')[0]}.xlsx`;
      
      if (contentDisposition && contentDisposition.includes('filename=')) {
        fileName = contentDisposition.split('filename=')[1].replace(/["']/g, '');
      }

      // Create a virtual hidden element to cleanly trigger the document stream save
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', fileName);
      document.body.appendChild(link);
      
      link.click();
      
      // Clean up DOM footprint immediately
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err: any) {
      console.error('Audit download execution fault:', err);
      setError('Failed to generate export file. Please refine filters and retry.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col items-end gap-1.5">
      <button 
        type="button"
        onClick={handleExport}
        disabled={isExporting}
        className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white disabled:text-slate-400 px-4 py-3 rounded-xl text-xs font-black uppercase tracking-wider transition-all shadow-md active:scale-95 disabled:scale-100 cursor-pointer disabled:cursor-not-allowed select-none"
      >
        {isExporting ? (
          <Loader2 size={16} className="animate-spin text-slate-400" />
        ) : (
          <FileSpreadsheet size={16} />
        )}
        <span>{isExporting ? 'Generating Audit Stream...' : 'Export Audit Log (.XLS)'}</span>
      </button>

      {error && (
        <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-600 bg-rose-50 border border-rose-100 px-2 py-1 rounded-md animate-in fade-in duration-200">
          <AlertCircle size={12} />
          <span>{error}</span>
        </div>
      )}
    </div>
  );
}