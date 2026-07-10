"use client";

import React, { useState } from "react";

export default function SeedUtilityPage() {
  const [loading, setLoading] = useState<string | null>(null);
  const [log, setLog] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const triggerSeed = async (mode: "blank" | "filled_capa") => {
    setLoading(mode);
    setLog(null);
    try {
      const response = await fetch("/api/LocalInspectionReports/seed-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Execution error encountered.");

      setLog({ type: "success", text: data.message });
    } catch (err: any) {
      setLog({ type: "error", text: err.message || "Network execution breakdown." });
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight mb-2">📋 System Environment Seeder</h2>
        <p className="text-slate-400 text-sm mb-6">
          Generate sandboxed layout records to test custom workflow paths across VMD inspection steps.
        </p>

        {log && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm border font-mono ${
              log.type === "success" 
                ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400" 
                : "bg-rose-950/50 border-rose-500/30 text-rose-400"
            }`}
          >
            {log.type === "success" ? "✨ Success: " : "❌ Failure: "}
            {log.text}
          </div>
        )}

        <div className="space-y-4">
          {/* Button 1: Blank Application */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition">
            <h3 className="font-semibold text-sm text-slate-200 mb-1">1. Clean Slate Template</h3>
            <p className="text-xs text-slate-400 mb-3">
              Creates a brand new company record and an application in <strong>INSPECTION_PENDING</strong> status with no observations. Ideal for testing fresh reporting workflows.
            </p>
            <button
              onClick={() => triggerSeed("blank")}
              disabled={loading !== null}
              className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs py-2 px-4 rounded-md transition duration-150"
            >
              {loading === "blank" ? "Processing..." : "Seed Blank Application (ID: 602)"}
            </button>
          </div>

          {/* Button 2: Filled CAPA Application */}
          <div className="p-4 bg-slate-800/50 border border-slate-700/50 rounded-lg hover:border-slate-600 transition">
            <h3 className="font-semibold text-sm text-slate-200 mb-1">2. Completed Deficiencies Snapshot</h3>
            <p className="text-xs text-slate-400 mb-3">
              Inserts <strong>Borange Kalbe Limited (Company ID: 103)</strong> populated with pre-existing audit logs, a critical differential pressure failure, and a trailing rework history.
            </p>
            <button
              onClick={() => triggerSeed("filled_capa")}
              disabled={loading !== null}
              className="w-full bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-medium text-xs py-2 px-4 rounded-md transition duration-150"
            >
              {loading === "filled_capa" ? "Processing..." : "Seed Filled CAPA Application (ID: 505)"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}