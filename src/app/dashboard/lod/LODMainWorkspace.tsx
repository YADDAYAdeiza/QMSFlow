"use client"

import React, { useState } from 'react';
import LODEntryForm from '@/components/LODEntryForm';
import LODArchive from './LODArchive';
import { LayoutGrid, FileCheck2, Library } from 'lucide-react'; // Swapped History for Library

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
              ? 'bg-white text-emerald-600 shadow-xl' // Emerald to signify "Clearance"
              : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            Certificate Archive ({completedApps.length})
          </button>
        </div>
      </div>

      {/* --- WORKSPACE CONTENT --- */}
      {activeTab === 'intake' ? (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <LODEntryForm />
        </div>
      ) : (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          {/* Header for Archive View */}
          <div className="mb-8 px-6">
            <h2 className="text-xl font-black uppercase italic tracking-tighter text-slate-900 flex items-center gap-3">
              <Library className="w-5 h-5 text-blue-600" /> 
              Issued Clearances & Certificates
            </h2>
            <p className="text-[10px] text-slate-400 font-black uppercase tracking-widest mt-1">
              Final documents archived in the Supabase 'Documents' bucket
            </p>
          </div>
          
          <LODArchive applications={completedApps} />
        </div>
      )}
    </div>
  );
}