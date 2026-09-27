"use client";

import { useState, ReactNode } from "react";
import ProfileTab from "./ProfileTab";

interface WorkspaceTabsProps {
  userRecord: any;
  hubContent: ReactNode;
}

export default function WorkspaceTabs({ userRecord, hubContent }: WorkspaceTabsProps) {
  const [activeTab, setActiveTab] = useState<"hub" | "profile">("hub");

  return (
    <div className="space-y-6">
      {/* Navigation Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("hub")}
          className={`py-2.5 px-5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 ${
            activeTab === "hub"
              ? "border-blue-600 text-blue-600 bg-white shadow-xs rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          📊 Inspection Workspaces
        </button>
        <button
          onClick={() => setActiveTab("profile")}
          className={`py-2.5 px-5 font-bold text-xs uppercase tracking-wider transition-all border-b-2 flex items-center gap-2 ${
            activeTab === "profile"
              ? "border-blue-600 text-blue-600 bg-white shadow-xs rounded-t-lg"
              : "border-transparent text-slate-500 hover:text-slate-800"
          }`}
        >
          🖊️ Profile & Signature
          {!userRecord?.signature_url && (
            <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
          )}
        </button>
      </div>

      {/* Dynamic Tab Body */}
      {activeTab === "hub" ? hubContent : <ProfileTab userRecord={userRecord} />}
    </div>
  );
}