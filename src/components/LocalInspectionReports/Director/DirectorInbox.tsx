// app/director-inbox/DirectorInbox.tsx
"use client";

import React, { useState } from 'react';
import { createClient } from '@/utils/supabase/client'; 

interface ApplicationComment {
  text: string;
  action: string;
  toStep: string;
  actorId: string;
  fromStep: string;
  actorName: string;
  timestamp: string;
  assignedToId: string;
}

interface LiveApplicationRow {
  id: number;
  application_number: string;
  type: string;
  company_id: number;
  current_point: string;
  details: {
    savedBy: string;
    comments: ApplicationComment[];
    productLines: any[];
    applicationId: string;
    assignedDivisions: string[];
    compiledReportHtml: string;
    savedChecklistSnapshot?: {
      inspected_site_name: string;
      critical_count: number;
      type_of_inspection: string;
      activities_carried_out: string[];
    };
    checklistSnapshot?: {
      inspected_site_name: string;
      critical_count: number;
      type_of_inspection: string;
      activities_carried_out: string[];
    };
  };
  created_at: string;
  updated_at: string;
  status: string;
  foreign_factory_id: number | null;
}

interface DirectorInboxProps {
  initialItems: LiveApplicationRow[];
  userEmail: string;
}

export default function DirectorInbox({ initialItems, userEmail }: DirectorInboxProps) {
  const supabase = createClient();
  const [items, setItems] = useState<LiveApplicationRow[]>(initialItems);
  const [selectedItem, setSelectedItem] = useState<LiveApplicationRow | null>(null);
  const [digitalSignature, setDigitalSignature] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Client-side refresh backup action handler
  const fetchInbox = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const { data, error } = await supabase
        .from('applications')
        .select('*')
        .eq('current_point', 'Director Final Approval & Sign-Off')
        .eq('status', 'PENDING_FINAL_SIGN_OFF')
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setItems(data as LiveApplicationRow[] || []);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to sync records.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOff = async (id: number, targetStatus: 'APPROVED' | 'REJECTED') => {
    if (!digitalSignature.trim()) return;
    setIsProcessing(true);
    setErrorMessage(null);

    const currentComments = selectedItem?.details?.comments || [];
    const directorFootprint: ApplicationComment = {
      text: `Approved & Confirmed via Director Desk. Signature ID: ${digitalSignature}`,
      action: targetStatus,
      toStep: targetStatus === 'APPROVED' ? 'Completed Certificate Generation' : 'Returned to Review Desk',
      actorId: 'director-session-id', 
      fromStep: 'Director Final Approval & Sign-Off',
      actorName: `Director (${userEmail})`,
      timestamp: new Date().toISOString(),
      assignedToId: 'system-archiver'
    };

    const updatedDetails = {
      ...selectedItem?.details,
      comments: [...currentComments, directorFootprint]
    };

    try {
      const { error } = await supabase
        .from('applications')
        .update({
          status: targetStatus,
          current_point: targetStatus === 'APPROVED' ? 'Approved - Closed' : 'Rejected / Review Modification Needed',
          details: updatedDetails,
          updated_at: new Date().toISOString()
        })
        .eq('id', id);

      if (error) throw error;

      setSelectedItem(null);
      setDigitalSignature("");
      await fetchInbox(); // Synchronize layout items list
    } catch (err: any) {
      setErrorMessage(err.message || "Database execution failed during sign-off update.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 bg-gray-50 min-h-screen text-gray-900">
      
      {/* Identity Banner */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between border-b pb-5 border-gray-200">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Director's Production Desk</h1>
          <p className="text-sm text-gray-500 mt-1">
            Connected to Database Table: <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">public.applications</code>
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-xs font-mono text-gray-400 hidden sm:inline">
            Logged in: {userEmail}
          </span>
          <button 
            onClick={fetchInbox}
            disabled={isLoading}
            className="px-3 py-1.5 text-xs font-semibold bg-white border border-gray-300 rounded shadow-sm hover:bg-gray-50 transition disabled:opacity-50"
          >
            {isLoading ? "Syncing..." : "Refresh Queue"}
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-50 text-red-700 text-xs rounded-md border border-red-200 font-medium">
          Error: {errorMessage}
        </div>
      )}

      {/* Main Layout Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Inbox Database Grid */}
        <div className="lg:col-span-2 bg-white shadow-sm rounded-xl border border-gray-200 overflow-hidden min-h-[300px]">
          {items.length === 0 ? (
            <div className="p-12 text-center text-sm text-gray-400">
              No files currently positioned at <code className="bg-gray-50 px-1 py-0.5 text-xs text-amber-700">Director Final Approval & Sign-Off</code>.
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200 text-left text-sm">
              <thead className="bg-gray-50 text-xs text-gray-500 uppercase font-semibold tracking-wider">
                <tr>
                  <th className="px-6 py-3">Ref Code</th>
                  <th className="px-6 py-3">Facility / Site Location</th>
                  <th className="px-6 py-3">Inspection</th>
                  <th className="px-6 py-3">Failures</th>
                  <th className="px-6 py-3 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {items.map((item) => {
                  const snapshot = item.details?.savedChecklistSnapshot || item.details?.checklistSnapshot;
                  return (
                    <tr 
                      key={item.id} 
                      className={`hover:bg-gray-50/80 transition-colors ${selectedItem?.id === item.id ? 'bg-indigo-50/50' : ''}`}
                    >
                      <td className="px-6 py-4 font-medium text-gray-900 whitespace-nowrap">
                        {item.application_number}
                        <div className="text-xs font-mono text-gray-400 mt-0.5">ID Key: {item.id}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-800">{snapshot?.inspected_site_name || 'Unknown Facility'}</div>
                        <div className="text-xs text-gray-400 font-mono">Divisions: {item.details?.assignedDivisions?.join(', ')}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-xs text-gray-600 font-medium">
                        {snapshot?.type_of_inspection || item.type} / {snapshot?.activities_carried_out?.join(', ') || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-xs rounded font-medium ${snapshot?.critical_count && snapshot.critical_count > 0 ? 'bg-red-50 text-red-700 border border-red-100' : 'bg-gray-100 text-gray-600'}`}>
                          {snapshot?.critical_count || 0} Critical
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <button
                          onClick={() => setSelectedItem(item)}
                          className="text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 px-3 py-1.5 rounded transition-colors"
                        >
                          Pull File
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>

        {/* Executive Verification Workstation */}
        <div className="bg-white shadow-sm rounded-xl border border-gray-200 p-5 space-y-4 min-h-[450px]">
          {selectedItem ? (
            <>
              <div className="border-b pb-3 border-gray-100">
                <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
                  {selectedItem.application_number}
                </span>
                <h3 className="text-base font-bold text-gray-900 mt-2">
                  {(selectedItem.details?.savedChecklistSnapshot || selectedItem.details?.checklistSnapshot)?.inspected_site_name}
                </h3>
              </div>

              {/* Sequential Comment History Timeline */}
              <div>
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Internal Routing Comments</h4>
                <div className="space-y-2 max-h-32 overflow-y-auto border rounded-lg p-2 bg-gray-50/50">
                  {selectedItem.details?.comments?.map((comment, index) => (
                    <div key={index} className="text-xs border-b border-gray-100 pb-1.5 last:border-0 last:pb-0">
                      <span className="font-semibold text-gray-700">{comment.actorName}:</span>{" "}
                      <span className="text-gray-600 italic">"{comment.text}"</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Compiled Html Display area */}
              <div className="border border-gray-200 rounded-lg p-3 bg-white max-h-64 overflow-y-auto text-xs">
                <h4 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Compiled Report Presentation</h4>
                <div 
                  className="prose prose-xs text-gray-700"
                  dangerouslySetInnerHTML={{ __html: selectedItem.details?.compiledReportHtml || '<p className="text-gray-400">No report body generated.</p>' }} 
                />
              </div>

              {/* Operational Action Footer */}
              <div className="pt-3 border-t border-gray-100 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Secure Electronic Signature Code
                  </label>
                  <input
                    type="text"
                    className="w-full text-sm px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                    placeholder="e.g., APPROVED_BY_DIRECTOR"
                    value={digitalSignature}
                    onChange={(e) => setDigitalSignature(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => handleSignOff(selectedItem.id, 'REJECTED')}
                    disabled={isProcessing || !digitalSignature.trim()}
                    className="px-3 py-2 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-md transition-colors disabled:opacity-50"
                  >
                    Reject File
                  </button>
                  <button
                    onClick={() => handleSignOff(selectedItem.id, 'APPROVED')}
                    disabled={!digitalSignature.trim() || isProcessing}
                    className="px-3 py-2 text-xs font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-md transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isProcessing ? "Updating..." : "Authorize Sign-Off"}
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-center py-24 text-gray-400">
              <p className="text-sm font-medium">No Application Selected</p>
              <p className="text-xs max-w-[200px] mt-1">Select a record row to query its metadata and compile workflow signatures.</p>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}