'use client';
import { useSearchParams } from 'next/navigation';
import { FileSpreadsheet } from 'lucide-react';

export default function ExportButton() {
  const searchParams = useSearchParams();

  const handleExport = () => {
    // Construct the URL with current filters
    const params = new URLSearchParams(searchParams.toString());
    window.location.href = `/api/export-ams?${params.toString()}`;
  };

  return (
    <button 
      onClick={handleExport}
      className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-xs font-black transition-all shadow-lg active:scale-95"
    >
      <FileSpreadsheet size={16} />
      EXPORT AUDIT LOG (.XLS)
    </button>
  );
}