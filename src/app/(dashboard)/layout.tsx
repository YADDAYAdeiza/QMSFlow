// app/(dashboard)/ddd/layout.tsx
import { ReactNode } from "react";
import { ShieldCheck, FileCheck, ClipboardList } from "lucide-react";
import Link from "next/link";

export default async function DDDLayout({
  children,
}: {
  children: ReactNode;
}) {
  const actingDivision = "VMD"; 

  return (
    <div className="p-8 bg-slate-50 min-h-screen font-sans">
      <header className="mb-8">
        <div className="flex items-center gap-3 mb-2 text-blue-600 font-black uppercase tracking-[0.3em] text-[10px]">
          <ShieldCheck className="w-4 h-4" /> Executive Oversight
        </div>
        <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tight italic leading-none mb-6">
          {actingDivision} Divisional Deputy Director
        </h1>

        {/* Primary Process Navigation Tabs */}
        <div className="flex border-b border-slate-200 gap-2">
          {/* Note: URLs omit the group parenthesis entirely */}
          <Link
            href={`/ddd/facility-verification?as=${actingDivision.toLowerCase()}`}
            className="px-6 py-3 font-black text-[11px] uppercase tracking-wider border-b-2 border-blue-600 text-blue-600 flex items-center gap-2"
          >
            <FileCheck className="w-4 h-4" /> Facility Verification
          </Link>
          <Link
            href={`/ddd/capa?as=${actingDivision.toLowerCase()}&subtab=pending`}
            className="px-6 py-3 font-black text-[11px] uppercase tracking-wider border-b-2 border-transparent text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-2"
          >
            <ClipboardList className="w-4 h-4" /> CAPA Resolution
          </Link>
        </div>
      </header>

      {/* Renders the child process pages dynamically */}
      <main>
        {children}
      </main>
    </div>
  );
}