"use client";

import React, { useState, useEffect } from 'react';

interface LockedWorkflow {
  application_id: number;
  company_name: string;
  current_step_title: string;
}

interface Inspector {
  id: string;
  full_name: string;
  division?: string; // Appended to handle incoming API matrix allocations safely
  is_available: boolean;
  locked_workflows?: LockedWorkflow[];
}

interface DDInspectionSchedulerProps {
  applicationId: number; 
  companyName: string;
  userRole: string;
  onSuccess?: () => void;
}

export default function DDInspectionScheduler({ applicationId, companyName, userRole, onSuccess }: DDInspectionSchedulerProps) {
  // Strict Security Boundary Guard
  if (userRole !== 'Divisional Deputy Director') {
    return (
      <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-md shadow-sm text-sm">
        <strong>Access Denied:</strong> This scheduling engine is strictly restricted to the purview of the Divisional Deputy Director.
      </div>
    );
  }

  const [inspectors, setInspectors] = useState<Inspector[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Inspector Focus State for the QMS Audit Sidebar
  const [focusedInspector, setFocusedInspector] = useState<Inspector | null>(null);

  // Form States
  const [inspectionDate, setInspectionDate] = useState('');
  const [teamLeader, setTeamLeader] = useState('');
  const [coInspectors, setCoInspectors] = useState<string[]>([]);
  const [traineeInspectors, setTraineeInspectors] = useState<string[]>([]);

  // Load staff pool alongside their active registry metrics on mount
  useEffect(() => {
    async function getStaffPoolRegistry() {
      try {
        setErrorMsg(null);
        setLoading(true);
        
        // Point directly to our newly structured API route
        const res = await fetch('/api/LocalInspectionReports/inspectors/poolRegistry');
        if (!res.ok) throw new Error('Failed to retrieve inspector workforce matrix from QMS registry.');
        
        const data = await res.json();
        
        // This sets the unified state array containing all profiles + block lists
        setInspectors(data.inspectors || []);
      } catch (err: any) {
        setErrorMsg(err.message);
      } finally {
        setLoading(false);
      }
    }
    getStaffPoolRegistry();
  }, []);

  // Isolate inspectors that are fully cleared and completely unallocated
  const availableInspectors = inspectors.filter(ins => ins.is_available);

  // Handle Co-Inspector Checkbox selections
  const handleCoInspectorToggle = (id: string) => {
    setCoInspectors(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Handle Trainee Checkbox selections with a Max Cap of 2 rule
  const handleTraineeToggle = (id: string) => {
    setTraineeInspectors(prev => {
      if (prev.includes(id)) {
        return prev.filter(item => item !== id);
      }
      if (prev.length >= 2) {
        alert("QMS Guardrail: A maximum of two (2) trainee inspectors can be attached to a single field group.");
        return prev;
      }
      return [...prev, id];
    });
  };

  const handleSubmitSchedule = async () => {
    if (!inspectionDate || !teamLeader) {
      setErrorMsg("Validation Error: Inspection date and a distinct Team Leader are mandatory parameters.");
      return;
    }
    
    setErrorMsg(null);
    setSubmitting(true);

    try {
      const response = await fetch('/api/InspectionSchedules', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId,
          scheduledDate: inspectionDate,
          teamLeader,
          coInspectors,
          traineeInspectors
        })
      });

      const result = await response.json();
      if (!result.success) throw new Error(result.error || 'Failed to register schedule.');
      
      alert("Inspection successfully scheduled and mandated.");
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setErrorMsg(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="text-center p-6 text-sm text-slate-500 animate-pulse">Analyzing inspector availability logs...</div>;

  return (
    <div className="max-w-5xl mx-auto flex flex-col md:flex-row gap-6 p-2">
      {/* Primary Scheduling Panel Form */}
      <div className="flex-1 bg-white border border-slate-200 rounded-lg shadow-sm p-6">
        <div className="border-b border-slate-100 pb-4 mb-6">
          <h2 className="text-lg font-bold text-slate-900">Schedule Field Inspection</h2>
          <p className="text-xs text-slate-500">Divisional Deputy Director IRSD Panel — Facility: <strong className="text-slate-700">{companyName}</strong></p>
        </div>

        {errorMsg && (
          <div className="mb-4 p-3 bg-amber-50 border border-amber-200 text-amber-800 text-xs rounded-md">
            {errorMsg}
          </div>
        )}

        <div className="space-y-5">
          {/* Date Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Inspection Target Date</label>
            <input 
              type="date" 
              className="w-full p-2 border border-slate-300 rounded-md text-sm focus:outline-emerald-500"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>

          {/* Team Leader Dropdown */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Designated Team Leader</label>
            <select 
              className="w-full p-2 border border-slate-300 rounded-md text-sm bg-slate-50 focus:bg-white"
              value={teamLeader}
              onChange={(e) => {
                setTeamLeader(e.target.value);
                setCoInspectors(prev => prev.filter(id => id !== e.target.value));
                setTraineeInspectors(prev => prev.filter(id => id !== e.target.value));
              }}
            >
              <option value="">-- Select Active, Clear Leader --</option>
              {availableInspectors.map(ins => (
                <option key={ins.id} value={ins.id}>
                  {ins.full_name} [{ins.division?.toUpperCase() || 'STAFF'}]
                </option>
              ))}
            </select>
          </div>

          {/* Co-Inspectors Multi-Selection */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Co-Inspectors Matrix</label>
            <p className="text-[11px] text-slate-400 mb-2">Only showing personnel cleared past the DDD_IRSD_REVIEW milestone.</p>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50">
              {availableInspectors.filter(ins => ins.id !== teamLeader && !traineeInspectors.includes(ins.id)).map(ins => (
                <label key={ins.id} className="flex items-center text-sm space-x-2 p-1 hover:bg-white rounded cursor-pointer justify-between">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded text-emerald-600 focus:ring-emerald-500"
                      checked={coInspectors.includes(ins.id)}
                      onChange={() => handleCoInspectorToggle(ins.id)}
                    />
                    <span className="text-slate-700">{ins.full_name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-700">
                    {ins.division || 'STAFF'}
                  </span>
                </label>
              ))}
              {availableInspectors.filter(ins => ins.id !== teamLeader && !traineeInspectors.includes(ins.id)).length === 0 && (
                <p className="text-xs text-slate-400 p-1 italic">No extra unallocated staff available.</p>
              )}
            </div>
          </div>

          {/* Trainee Inspectors Checkbox System */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase mb-1">Trainee Inspectors Attachment (Max 2)</label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-md p-2 space-y-1 bg-slate-50">
              {availableInspectors.filter(ins => ins.id !== teamLeader && !coInspectors.includes(ins.id)).map(ins => (
                <label key={ins.id} className="flex items-center text-sm space-x-2 p-1 hover:bg-white rounded cursor-pointer justify-between">
                  <div className="flex items-center space-x-2">
                    <input 
                      type="checkbox" 
                      className="rounded text-amber-600 focus:ring-amber-500"
                      checked={traineeInspectors.includes(ins.id)}
                      onChange={() => handleTraineeToggle(ins.id)}
                    />
                    <span className="text-slate-700">{ins.full_name}</span>
                  </div>
                  <span className="px-1.5 py-0.5 text-[10px] font-bold uppercase rounded bg-slate-200 text-slate-700">
                    {ins.division || 'STAFF'}
                  </span>
                </label>
              ))}
              {availableInspectors.filter(ins => ins.id !== teamLeader && !coInspectors.includes(ins.id)).length === 0 && (
                <p className="text-xs text-slate-400 p-1 italic">No extra unallocated staff available.</p>
              )}
            </div>
          </div>

          <button 
            className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-semibold py-2.5 px-4 rounded-md text-sm transition-colors shadow-sm"
            onClick={handleSubmitSchedule}
            disabled={submitting}
          >
            {submitting ? 'Committing Multi-Table Transactions...' : 'Confirm & Issue Field Mandate'}
          </button>
        </div>
      </div>

      {/* Side Audit Panel: Workload Allocations Tracker */}
      <div className="w-full md:w-80 bg-slate-50 border border-slate-200 rounded-lg p-4 flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider mb-3 border-b border-slate-200 pb-2">
            Workforce Allocation Registry
          </h3>
          <p className="text-[11px] text-slate-500 mb-4 leading-relaxed">
            Select any inspector across the complete workforce pool to audit their outstanding active reports.
          </p>

          <div className="space-y-1 max-h-60 overflow-y-auto pr-1 mb-4">
            {inspectors.map(ins => (
              <button
                key={ins.id}
                onClick={() => setFocusedInspector(ins)}
                className={`w-full text-left text-xs p-2 rounded flex items-center justify-between border transition-all ${
                  focusedInspector?.id === ins.id 
                    ? 'bg-slate-800 border-slate-800 text-white font-medium shadow-sm' 
                    : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="truncate max-w-[130px]">
                  {ins.full_name} <span className="opacity-75 text-[10px]">({ins.division?.toUpperCase() || 'STAFF'})</span>
                </span>
                <span className={`px-1.5 py-0.5 text-[10px] rounded font-bold ${
                  ins.is_available 
                    ? 'bg-emerald-100 text-emerald-800' 
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {ins.is_available ? 'Ready' : 'Locked'}
                </span>
              </button>
            ))}
          </div>

          {/* Workflow Lock Insights Board */}
          {focusedInspector ? (
            <div className="bg-white border border-slate-200 rounded p-3 shadow-inner min-h-[140px]">
              <h4 className="text-xs font-bold text-slate-800 truncate mb-2">
                {focusedInspector.full_name} <span className="text-[10px] text-slate-400">({focusedInspector.division?.toUpperCase() || 'STAFF'})</span>
              </h4>
              
              {!focusedInspector.is_available && focusedInspector.locked_workflows && focusedInspector.locked_workflows.length > 0 ? (
                <div className="space-y-2">
                  <p className="text-[10px] text-red-600 font-medium">
                    Locked through final DDD_IRSD_REVIEW endorsement:
                  </p>
                  <div className="space-y-1.5 max-h-36 overflow-y-auto">
                    {focusedInspector.locked_workflows.map((wf, idx) => (
                      <div key={idx} className="border-l-2 border-amber-500 pl-2 py-0.5 bg-slate-50 rounded-r">
                        <p className="text-[11px] font-semibold text-slate-700 truncate">{wf.company_name}</p>
                        <p className="text-[9px] text-slate-500">File ID: #{wf.application_id}</p>
                        <p className="text-[10px] text-amber-700 italic font-medium">{wf.current_step_title}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center pt-4 text-center">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping mb-2"></div>
                  <p className="text-[11px] text-slate-500 font-medium">Compliance Check Passed</p>
                  <p className="text-[10px] text-slate-400 mt-0.5 px-2">This staff member has no outstanding pending field logs or unsubmitted reviews.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded p-4 text-center text-xs text-slate-400 italic bg-white/50 min-h-[140px] flex items-center justify-center">
              No staff selected for workflow verification.
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-[10px] text-slate-400 font-medium bg-slate-100/50 -mx-4 -mb-4 p-4 rounded-b-lg">
          QMS Guardrail Enforcement Point: DDD_IRSD_REVIEW
        </div>
      </div>
    </div>
  );
}