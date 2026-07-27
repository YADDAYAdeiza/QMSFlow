// src/components/LocalInspectionReports/ReportEditorPreviewSection.tsx
"use client";

import React, { useState } from "react";
import ReportIframeViewer from "./ReportIframeViewer";

interface ReportEditorPreviewSectionProps {
  initialHtml: string;
  docNumber?: string;
  onSave?: (updatedHtml: string) => void | Promise<void>;
  isSaving?: boolean;
}

export default function ReportEditorPreviewSection({
  initialHtml,
  docNumber,
  onSave,
  isSaving = false,
}: ReportEditorPreviewSectionProps) {
  const [editorHtml, setEditorHtml] = useState<string>(initialHtml || "");
  const [activeTab, setActiveTab] = useState<"split" | "editor" | "pdf">("split");

  const handleSave = () => {
    if (onSave) {
      onSave(editorHtml);
    }
  };

  return (
    <div className="flex flex-col gap-4 w-full">
      {/* Top Toolbar / Tab Switcher */}
      <div className="flex items-center justify-between bg-slate-100 p-2 rounded-lg border border-slate-200">
        <div className="flex items-center gap-1 bg-slate-200/60 p-1 rounded-md text-xs font-medium text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("split")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "split"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Split View
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("editor")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "editor"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            Editor Only
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("pdf")}
            className={`px-3 py-1.5 rounded-md transition-all ${
              activeTab === "pdf"
                ? "bg-white text-slate-900 shadow-sm font-semibold"
                : "hover:text-slate-900"
            }`}
          >
            PDF Preview Only
          </button>
        </div>

        {/* Save Action */}
        {onSave && (
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 bg-emerald-700 hover:bg-emerald-800 disabled:bg-slate-400 text-white text-xs font-medium rounded-md shadow-sm transition-colors flex items-center gap-2"
          >
            {isSaving ? "Saving..." : "Save Draft Report"}
          </button>
        )}
      </div>

      {/* Main Content Grid */}
      <div
        className={`grid gap-6 w-full ${
          activeTab === "split"
            ? "grid-cols-1 lg:grid-cols-2"
            : "grid-cols-1"
        }`}
      >
        {/* Editor Pane */}
        {(activeTab === "split" || activeTab === "editor") && (
          <div className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Report Markup / Content
            </h3>
            <div className="h-[750px] border border-slate-200 rounded-md p-2 bg-slate-50">
              <textarea
                className="w-full h-full p-3 text-xs font-mono bg-white border border-slate-200 rounded focus:outline-none focus:ring-1 focus:ring-emerald-600 resize-none"
                value={editorHtml}
                onChange={(e) => setEditorHtml(e.target.value)}
                placeholder="Write or paste report HTML content..."
              />
            </div>
          </div>
        )}

        {/* PDF Iframe Live Preview Pane */}
        {(activeTab === "split" || activeTab === "pdf") && (
          <div className="flex flex-col bg-white p-4 rounded-xl shadow-sm border border-slate-200">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Live PDF Document Output
            </h3>
            <ReportIframeViewer reportHtml={editorHtml} docNumber={docNumber} />
          </div>
        )}
      </div>
    </div>
  );
}