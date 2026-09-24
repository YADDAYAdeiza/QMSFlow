// src/components/GlobalNavbar.tsx
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function GlobalNavbar() {
  const pathname = usePathname();

  // Helper to check active state
  const isActive = (path: string) => pathname.startsWith(path);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Portal Identity */}
        <div className="flex items-center gap-3">
          <div className="h-8 w-2 bg-blue-600 rounded-full" />
          <div>
            <span className="text-sm font-black tracking-wider uppercase text-slate-900 block">
              VMAP Portal
            </span>
            <span className="text-[10px] text-slate-500 font-semibold tracking-tight block">
              NAFDAC Regulatory System
            </span>
          </div>
        </div>

        {/* Navigation Links between Worlds */}
        <nav className="flex items-center gap-2">
          <Link
            href="/dashboard"
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
              isActive("/dashboard") || pathname === "/"
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            📊 Main Dashboard
          </Link>

          <Link
            href="/LocalInspectionReports"
            className={`px-4 py-2 rounded-md text-xs font-bold uppercase tracking-wider transition-all ${
              isActive("/LocalInspectionReports")
                ? "bg-blue-600 text-white shadow-sm"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            📋 Local Inspection Reports
          </Link>
        </nav>
      </div>
    </header>
  );
}