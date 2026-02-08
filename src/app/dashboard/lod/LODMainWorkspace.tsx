"use client"

import React, { useState } from 'react';
import LODEntryForm from '@/components/LODEntryForm';
import LODArchive from './LODArchive';
import { LayoutGrid, History } from 'lucide-react';

export default function LODMainWorkspace({ completedApps }: { completedApps: any[] }) {
  const [activeTab, setActiveTab] = useState<'intake' | 'archive'>('intake');

  return (
    <div className="max-w-6xl mx-auto pb-20 px-4">
      {/* Tab Navigation */}
      <div className="flex justify-center mb-12">
        <div className="bg-slate-200/50 p-1.5 rounded-[2rem] flex gap-2 border border-slate-200 shadow-inner">
          <button 
            onClick={() => setActiveTab('intake')}
            className={`flex items-center gap-2 px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'intake' 
              ? 'bg-white text-slate-900 shadow-xl' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <LayoutGrid className="w-3.5 h-3.5" />
            New Intake
          </button>
          <button 
            onClick={() => setActiveTab('archive')}
            className={`flex items-center gap-2 px-10 py-4 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${
              activeTab === 'archive' 
              ? 'bg-white text-slate-900 shadow-xl' 
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            Clearance Archive ({completedApps.length})
          </button>
        </div>
      </div>

      {/* Conditional Rendering */}
      {activeTab === 'intake' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <LODEntryForm />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <LODArchive applications={completedApps} />
        </div>
      )}
    </div>
  );
}