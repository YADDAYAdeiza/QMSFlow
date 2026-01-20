"use client"

import { FileText, AlertCircle } from "lucide-react";

interface DossierLinkProps {
  url: string | null | undefined;
}

export default function DossierLink({ url }: DossierLinkProps) {
  const hasFile = url && url !== "" && url !== "#";

  return (
    <a 
      href={hasFile ? url : "#"} 
      target={hasFile ? "_blank" : "_self"}
      rel="noopener noreferrer"
      onClick={(e) => { 
        if(!hasFile) {
          e.preventDefault();
          alert("No dossier file was uploaded for this application.");
        }
      }}
      className={`flex items-center gap-2 px-5 py-3 rounded-xl transition-all border text-[10px] font-black uppercase tracking-widest ${
          hasFile 
          ? "bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-200 shadow-sm active:scale-95" 
          : "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed"
      }`}
    >
      {hasFile ? <FileText className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
      {hasFile ? "View Dossier" : "Missing File"}
    </a>
  );
}