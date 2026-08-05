"use client";

export default function PrintTrigger() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-md shadow-sm transition-colors"
    >
      <span>🖨️</span> Print Schedule Notice
    </button>
  );
}