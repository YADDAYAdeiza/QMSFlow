"use client";

import React from "react";
import { Printer } from "lucide-react";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs cursor-pointer ml-2"
    >
      <Printer className="w-4 h-4" /> Print Schedule Sheet
    </button>
  );
}