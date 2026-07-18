'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';

interface Task {
  scheduleId: string;
  scheduledDate: string;
  scheduleStatus: string;
  assignedRole: 'TEAM_LEADER' | 'CO_INSPECTOR' | 'TRAINEE';
  application: {
    id: string;
    fileNumber: string;
    companyName: string;
    currentPoint: string;
  };
}

interface UserProfile {
  name: string;
  role: string;
  division?: string;
}

export default function InspectorWorkspace() {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWorkspaceData() {
      try {
        setLoading(true);
        setError(null);
        
        // Fetch active QMS inbox assignments tied to the true authenticated session token
        const res = await fetch('/api/LocalInspectionReports/inspectors/Inbox');
        const data = await res.json();

        if (!res.ok || !data.success) {
          throw new Error(data.error || 'Failed to retrieve inbox workflows.');
        }

        setTasks(data.tasks);
        
        // Populate profile layout meta if returned from server context
        if (data.profile) {
          setUserProfile(data.profile);
        } else {
          setUserProfile({
            name: data.inspectorName || 'Authenticated Inspector',
            role: 'Field Reviewer',
            division: 'VMD'
          });
        }
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    fetchWorkspaceData();
  }, []);

  if (loading) {
    return (
      <div className="p-8 max-w-6xl mx-auto text-sm text-slate-500 font-medium">
        Loading active QMS field inspection desk assignments...
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 max-w-6xl mx-auto">
        <div className="p-4 bg-rose-50 border border-rose-200 rounded text-rose-800 text-xs font-medium">
          {error}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto font-sans text-slate-900">
      {/* Header Profile Section */}
      <div className="mb-8 border-b border-slate-200 pb-5">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Inspector Field Assignment Desk
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              {userProfile 
                ? `${userProfile.name} • ${userProfile.role.replace("DDD", "Divisional Deputy Director")} (${userProfile.division || 'VMD'})` 
                : 'Authenticated Desk'}
            </p>
          </div>
        </div>
      </div>

      {/* Task Inbox Count */}
      <h2 className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-4">
        Pending Scheduled Inspections ({tasks.length})
      </h2>

      {/* Grid of Cards */}
      {tasks.length === 0 ? (
        <div className="text-center py-12 border-2 border-dashed border-slate-200 rounded-lg text-slate-400 text-xs font-medium">
          No pending scheduled site inspections mapped to this profile.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {tasks.map((task) => {
            const isLead = task.assignedRole === 'TEAM_LEADER';
            const isTrainee = task.assignedRole === 'TRAINEE';
            
            let roleBadgeStyles = "bg-blue-50 text-blue-800 border-blue-200";
            if (isLead) roleBadgeStyles = "bg-purple-50 text-purple-800 border-purple-200";
            if (isTrainee) roleBadgeStyles = "bg-slate-100 text-slate-600 border-slate-300";

            return (
              <div 
                key={task.scheduleId} 
                className="bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between"
              >
                {/* Card Main Metadata Body */}
                <div className="p-4 flex flex-col gap-3">
                  <div className="flex justify-between items-start gap-2">
                    <span className="text-[10px] font-mono text-slate-400 font-semibold tracking-tight">
                      {task.application.fileNumber || 'No File #'}
                    </span>
                    <span className={`text-[9px] font-bold border px-1.5 py-0.5 rounded uppercase tracking-wider ${roleBadgeStyles}`}>
                      {task.assignedRole.replace('_', ' ')}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-slate-800 line-clamp-1">
                      {task.application.companyName}
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Target Date: <span className="font-semibold text-slate-600">{task.scheduledDate}</span>
                    </p>
                  </div>

                  <div className="mt-1 pt-2 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="text-slate-400 font-medium">Current Stage:</span>
                    <span className="font-semibold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                      {task.application.currentPoint?.replace(/DDD/g, "Divisional Deputy Director") || 'Field Inspection Pending'}
                    </span>
                  </div>
                </div>

                {/* Consolidated Mode-Based Routing Action Tray */}
                <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 rounded-b-lg flex justify-end gap-2">
                  {isTrainee ? (
                    <Link 
                      href={`/LocalInspectionReports/${task.application.id}?mode=readonly`}
                      className="w-full text-center text-xs font-semibold py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-600 transition-colors block"
                    >
                      View Audit Documents Only (Read-Only)
                    </Link>
                  ) : (
                    <>
                      <Link 
                        href={`/LocalInspectionReports/${task.application.id}?mode=checklist`}
                        className="text-center text-xs font-medium py-1.5 px-3 rounded bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 transition-colors block"
                      >
                        Checklists
                      </Link>
                      
                      <Link 
                        href={`/LocalInspectionReports/${task.application.id}?mode=field-notes`}
                        className={`text-center text-xs font-semibold py-1.5 px-3 rounded text-white transition-colors shadow-sm block ${
                          isLead 
                            ? 'bg-purple-600 hover:bg-purple-700' 
                            : 'bg-blue-600 hover:bg-blue-700'
                        }`}
                      >
                        {isLead ? 'Execute Final Sign-Off' : 'Record Audit Inputs'}
                      </Link>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}