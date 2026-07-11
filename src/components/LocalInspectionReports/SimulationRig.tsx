'use client';

import React, { useState } from 'react';
import { MOCK_INSPECTORS, useSimulation } from '@/utils/simulationContext';

export default function SimulationRig() {
  const { activeUser, isSimulating, switchUser, clearSimulation } = useSimulation();
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  if (process.env.NODE_ENV !== 'development') return null;

  // Filter lists dynamically based on search box input
  const filteredInspectors = MOCK_INSPECTORS.filter(ins => 
    ins.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ins.division.toLowerCase().includes(searchQuery.toLowerCase()) ||
    ins.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed bottom-4 right-4 z-50 font-sans shadow-2xl rounded-lg border border-slate-200 bg-white">
      {/* Mini Header Toggle Bar */}
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className={`px-4 py-2.5 flex items-center justify-between gap-6 cursor-pointer text-xs font-bold rounded-t-lg text-white select-none transition-colors ${
          isSimulating ? 'bg-amber-600 hover:bg-amber-700' : 'bg-slate-800 hover:bg-slate-900'
        }`}
      >
        <span className="flex items-center gap-1.5">
          ⚙️ QMS RIG: {isSimulating ? activeUser?.name : "Live System Auth"}
        </span>
        <span className="text-[10px] opacity-70">{isOpen ? 'COLLAPSE ▼' : 'EXPAND ▲'}</span>
      </div>

      {/* Control Configuration Wrapper */}
      {isOpen && (
        <div className="p-4 w-80 flex flex-col gap-3 bg-white border-t border-slate-100 rounded-b-lg">
          <p className="text-[11px] text-slate-500 font-medium leading-relaxed">
            Bypass authorization rules to review inbox workflows across directorates instantly.
          </p>

          {/* Quick Filter Search Bar */}
          <input
            type="text"
            placeholder="Search name, role, or division..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full px-2.5 py-1 text-xs border border-slate-200 rounded focus:outline-none focus:border-blue-500 text-slate-800"
          />
          
          {/* Scrollable Staff Context Area */}
          <div className="flex flex-col gap-1.5 max-h-64 overflow-y-auto pr-1">
            {filteredInspectors.length > 0 ? (
              filteredInspectors.map((inspector) => (
                <button
                  key={inspector.id}
                  onClick={() => switchUser(inspector.id)}
                  className={`w-full text-left p-2 rounded text-xs border transition-all ${
                    activeUser?.id === inspector.id
                      ? 'bg-amber-50 border-amber-400 font-semibold text-amber-900 shadow-sm'
                      : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                  }`}
                >
                  <div className="flex justify-between items-start gap-1">
                    <span className="font-semibold truncate">{inspector.name}</span>
                    {inspector.division && (
                      <span className="text-[9px] bg-slate-200 text-slate-700 font-bold px-1 rounded uppercase tracking-wider shrink-0">
                        {inspector.division}
                      </span>
                    )}
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5 truncate">{inspector.role}</div>
                  <div className="text-[9px] text-slate-400 font-mono italic truncate">{inspector.email}</div>
                </button>
              ))
            ) : (
              <div className="text-center py-4 text-xs text-slate-400 font-medium">No records found.</div>
            )}
          </div>

          {isSimulating && (
            <button
              onClick={clearSimulation}
              className="mt-1 w-full text-center py-1.5 px-3 rounded text-xs bg-rose-600 hover:bg-rose-700 text-white font-semibold transition-all shadow-sm"
            >
              Reset Session (Real Authentication)
            </button>
          )}
        </div>
      )}
    </div>
  );
}