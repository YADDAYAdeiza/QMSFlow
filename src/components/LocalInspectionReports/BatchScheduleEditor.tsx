"use client";

import React, { useState, useEffect, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Edit3, Eye, Save, AlertCircle, Trash2 } from "lucide-react";
import RecommendApprovalModal from "@/app/LocalInspectionReports/ddd/schedule/print/RecommendApprovalModal";
import PrintTrigger from "@/app/LocalInspectionReports/ddd/schedule/print/PrintTrigger";

export interface InspectorPoolItem {
  id: string;
  full_name: string;
  division?: string;
  is_available: boolean;
}

export interface EditableScheduleItem {
  scheduleId: string;
  sn: number;
  companyName: string;
  companyAddress: string;
  inspectionType: string;
  scheduledDate: string; // YYYY-MM-DD format for date input
  driver?: string;
  teamLeaderId: string;
  coInspectorIds: string[];
  traineeInspectorIds: string[];
}

interface BatchScheduleEditorProps {
  batchId?: string;
  batchStatus?: string;
  batchHistory?: any[];
  startDate: string;
  endDate: string;
  scheduleIds: string[];
  initialRows: EditableScheduleItem[];
  inspectorPool: InspectorPoolItem[];
  formattedHeaderDate: string;
  isApproved: boolean;
  userId?: string;
  isReadOnly?: boolean;
}

export default function BatchScheduleEditor({
  batchId,
  batchStatus,
  batchHistory,
  startDate,
  endDate,
  scheduleIds,
  initialRows,
  inspectorPool,
  formattedHeaderDate,
  isApproved,
  userId,
  isReadOnly = false,
}: BatchScheduleEditorProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [isEditMode, setIsEditMode] = useState(false);
  const [rows, setRows] = useState<EditableScheduleItem[]>(initialRows);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Keep internal row state synced with parent props
  useEffect(() => {
    setRows(initialRows);
  }, [initialRows]);

  const isRework = batchStatus === "REWORK_REQUIRED";

  // --- Row Removal (Local Deletion) ---
  const handleRemoveRow = (scheduleId: string) => {
    if (confirm("Are you sure you want to remove this inspection entry from the batch schedule?")) {
      setRows((prev) => prev.filter((r) => r.scheduleId !== scheduleId));
    }
  };

  // --- Inline Field Handlers ---
  const handleDateChange = (scheduleId: string, date: string) => {
    setRows((prev) =>
      prev.map((r) => (r.scheduleId === scheduleId ? { ...r, scheduledDate: date } : r))
    );
  };

  const handleDriverChange = (scheduleId: string, driver: string) => {
    setRows((prev) =>
      prev.map((r) => (r.scheduleId === scheduleId ? { ...r, driver } : r))
    );
  };

  const handleTeamLeaderChange = (scheduleId: string, leaderId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.scheduleId !== scheduleId) return r;
        return {
          ...r,
          teamLeaderId: leaderId,
          coInspectorIds: r.coInspectorIds.filter((id) => id !== leaderId),
          traineeInspectorIds: r.traineeInspectorIds.filter((id) => id !== leaderId),
        };
      })
    );
  };

  const handleCoInspectorToggle = (scheduleId: string, inspectorId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.scheduleId !== scheduleId) return r;
        const exists = r.coInspectorIds.includes(inspectorId);
        const updated = exists
          ? r.coInspectorIds.filter((id) => id !== inspectorId)
          : [...r.coInspectorIds, inspectorId];
        return { ...r, coInspectorIds: updated };
      })
    );
  };

  const handleTraineeToggle = (scheduleId: string, inspectorId: string) => {
    setRows((prev) =>
      prev.map((r) => {
        if (r.scheduleId !== scheduleId) return r;
        const exists = r.traineeInspectorIds.includes(inspectorId);
        if (!exists && r.traineeInspectorIds.length >= 2) {
          alert("QMS Guardrail: Maximum of 2 trainees allowed per inspection team.");
          return r;
        }
        const updated = exists
          ? r.traineeInspectorIds.filter((id) => id !== inspectorId)
          : [...r.traineeInspectorIds, inspectorId];
        return { ...r, traineeInspectorIds: updated };
      })
    );
  };

  // --- Save Batch Updates & Send Remaining Active Schedule IDs ---
  const handleSaveChanges = async () => {
    setSaveError(null);

    const payloadUpdates = rows.map((r) => {
      const inspectors: Array<{
        inspectorId: string;
        role: "TEAM_LEADER" | "CO_INSPECTOR" | "TRAINEE_INSPECTOR";
      }> = [];

      if (r.teamLeaderId) {
        inspectors.push({ inspectorId: r.teamLeaderId, role: "TEAM_LEADER" });
      }
      r.coInspectorIds.forEach((id) => {
        inspectors.push({ inspectorId: id, role: "CO_INSPECTOR" });
      });
      r.traineeInspectorIds.forEach((id) => {
        inspectors.push({ inspectorId: id, role: "TRAINEE_INSPECTOR" });
      });

      return {
        scheduleId: r.scheduleId,
        scheduledDate: r.scheduledDate,
        driver: r.driver,
        inspectors,
      };
    });

    // Extract current list of remaining schedule IDs
    const activeScheduleIds = rows.map((r) => r.scheduleId);

    startTransition(async () => {
      try {
        const response = await fetch("/api/LocalInspectionReports/schedule/batch-update", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            updates: payloadUpdates,
            activeScheduleIds,
            batchId,
            startDate,
            endDate,
          }),
        });

        const result = await response.json();
        if (!response.ok || !result.success) {
          throw new Error(result.error || "Failed to save batch schedule.");
        }

        setIsEditMode(false);
        router.refresh();
      } catch (err: any) {
        setSaveError(err.message || "Error saving batch schedule changes.");
      }
    });
  };

  const getInspectorName = (id: string) =>
    inspectorPool.find((ins) => ins.id === id)?.full_name || "Unknown Staff";

  return (
    <div>
      {/* Action Bar (Screen Only) */}
      <div className="max-w-5xl mx-auto mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200 flex flex-wrap justify-between items-center gap-4 print:hidden">
        
        {/* Date Filter */}
        {!isReadOnly ? (
          <form method="GET" className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-600">
              From:
              <input
                type="date"
                name="startDate"
                defaultValue={startDate}
                className="ml-1 px-2 py-1 border border-slate-300 rounded-md text-sm"
              />
            </label>
            <label className="text-xs font-semibold text-slate-600">
              To:
              <input
                type="date"
                name="endDate"
                defaultValue={endDate}
                className="ml-1 px-2 py-1 border border-slate-300 rounded-md text-sm"
              />
            </label>
            <button
              type="submit"
              className="px-3 py-1 bg-slate-800 text-white rounded-md text-xs font-medium hover:bg-slate-700 cursor-pointer"
            >
              Filter Schedule
            </button>
          </form>
        ) : (
          <div className="text-xs font-medium text-slate-500">
            Viewing Schedule Period: <span className="font-bold text-slate-800">{formattedHeaderDate}</span>
          </div>
        )}

        {/* Action Controls */}
        <div className="flex items-center gap-3 ml-auto">
          {!isReadOnly && !isApproved && (
            <>
              {/* Toggle Edit Mode */}
              <button
                type="button"
                onClick={() => {
                  setIsEditMode(!isEditMode);
                  setSaveError(null);
                }}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md shadow-xs transition-colors cursor-pointer text-white ${
                  isEditMode
                    ? "bg-slate-600 hover:bg-slate-700"
                    : "bg-indigo-600 hover:bg-indigo-700"
                }`}
              >
                {isEditMode ? <Eye className="w-3.5 h-3.5" /> : <Edit3 className="w-3.5 h-3.5" />}
                {isEditMode ? "Switch to View Mode" : "Edit Batch Schedule"}
              </button>

              {/* Save Edits */}
              {isEditMode && (
                <button
                  type="button"
                  onClick={handleSaveChanges}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isPending ? "Saving..." : "Save Batch Edits"}
                </button>
              )}

              {/* Recommend / Resubmit Workflow Modal */}
              {!isEditMode && (
                <RecommendApprovalModal
                  batchId={batchId}
                  batchReference={`SCHEDULE-${startDate}`}
                  title={`Annexure 08 (${startDate} to ${endDate})`}
                  startDate={startDate}
                  endDate={endDate}
                  scheduleIds={scheduleIds}
                  history={batchHistory}
                  isRework={isRework}
                  userId={userId}
                />
              )}
            </>
          )}

          {/* Print Trigger */}
          <PrintTrigger />
        </div>
      </div>

      {/* Save Error Alert */}
      {saveError && (
        <div className="max-w-5xl mx-auto mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Official Annexure Sheet */}
      <div className="max-w-5xl mx-auto bg-white p-6 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Annexure Top Metadata Banner */}
        <div className="border border-black text-xs font-bold flex justify-between divide-x divide-black mb-4">
          <div className="p-1.5 flex-1 text-left">Annexure No. 08</div>
          <div className="p-1.5 flex-1 text-center">SOP Ref No. VMAP-015-01</div>
          <div className="p-1.5 flex-1 text-right">Title of Annexure: Inspection Schedule</div>
        </div>

        {/* Agency Logo & Title */}
        <div className="text-center my-4 space-y-2">
          <div className="flex justify-center mb-1">
            <img
              src="/nafdac_logo2-removebg-preview.png"
              alt="NAFDAC Logo"
              className="w-[70px] h-[70px] object-contain"
            />
          </div>
          <h2 className="text-base font-extrabold tracking-wide uppercase">
            VMAP INSPECTION SCHEDULE FOR {formattedHeaderDate}
          </h2>
          {!isReadOnly && isEditMode && (
            <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded py-1 max-w-md mx-auto print:hidden">
              ✏️ BATCH EDITOR ACTIVE — Modify dates, team allocations, or delete entries below, then click "Save Batch Edits"
            </p>
          )}
        </div>

        {/* Schedule Table */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="border-b border-black text-center font-bold uppercase bg-slate-50 print:bg-transparent">
              <th className="border-r border-black p-2 w-10">S/N</th>
              <th className="border-r border-black p-2 w-1/4">NAMES AND ADDRESS OF COMPANY</th>
              <th className="border-r border-black p-2 w-1/5">PURPOSE/TYPES OF INSPECTION</th>
              <th className="border-r border-black p-2 w-1/3">NAME OF INSPECTORS</th>
              <th className="border-r border-black p-2 w-32">DATE OF INSPECTION</th>
              <th className={`p-2 ${!isReadOnly && isEditMode ? "border-r border-black w-24" : "w-24"}`}>
                DRIVER
              </th>
              {!isReadOnly && isEditMode && (
                <th className="p-2 w-12 text-center text-red-600 print:hidden">ACTION</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {rows.length === 0 ? (
              <tr>
                <td colSpan={!isReadOnly && isEditMode ? 7 : 6} className="p-8 text-center text-slate-500 italic">
                  No inspection schedules found for the selected date range.
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={row.scheduleId} className="border-b border-black align-top">
                  {/* Dynamic Serial Number Re-sequencing */}
                  <td className="border-r border-black p-2 text-center font-bold">{index + 1}.</td>
                  
                  {/* Facility Details */}
                  <td className="border-r border-black p-2 uppercase font-semibold">
                    <div>{row.companyName}</div>
                    <div className="text-[11px] font-normal text-slate-700 mt-1">{row.companyAddress}</div>
                  </td>
                  
                  {/* Inspection Purpose */}
                  <td className="border-r border-black p-2 uppercase font-medium">
                    {row.inspectionType}
                  </td>

                  {/* Inspectors Column */}
                  <td className="border-r border-black p-2 uppercase">
                    {!isReadOnly && isEditMode ? (
                      <div className="space-y-3 lowercase">
                        {/* Team Leader Select */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase">Team Leader:</label>
                          <select
                            value={row.teamLeaderId}
                            onChange={(e) => handleTeamLeaderChange(row.scheduleId, e.target.value)}
                            className="w-full text-xs p-1 border border-slate-300 rounded bg-white uppercase font-medium"
                          >
                            <option value="">-- Select Team Leader --</option>
                            {inspectorPool.map((ins) => (
                              <option key={ins.id} value={ins.id}>
                                {ins.full_name} ({ins.division || "STAFF"})
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Co-Inspectors Checkboxes */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Co-Inspectors:</label>
                          <div className="max-h-24 overflow-y-auto border border-slate-200 rounded p-1 space-y-1 bg-slate-50">
                            {inspectorPool
                              .filter((ins) => ins.id !== row.teamLeaderId && !row.traineeInspectorIds.includes(ins.id))
                              .map((ins) => (
                                <label key={ins.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.coInspectorIds.includes(ins.id)}
                                    onChange={() => handleCoInspectorToggle(row.scheduleId, ins.id)}
                                    className="rounded text-emerald-600"
                                  />
                                  <span>{ins.full_name}</span>
                                </label>
                              ))}
                          </div>
                        </div>

                        {/* Trainees Checkboxes (Max 2 Guardrail) */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-700 uppercase mb-0.5">Trainees (Max 2):</label>
                          <div className="max-h-24 overflow-y-auto border border-slate-200 rounded p-1 space-y-1 bg-slate-50">
                            {inspectorPool
                              .filter((ins) => ins.id !== row.teamLeaderId && !row.coInspectorIds.includes(ins.id))
                              .map((ins) => (
                                <label key={ins.id} className="flex items-center gap-1.5 text-[11px] cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={row.traineeInspectorIds.includes(ins.id)}
                                    onChange={() => handleTraineeToggle(row.scheduleId, ins.id)}
                                    className="rounded text-amber-600"
                                  />
                                  <span>{ins.full_name}</span>
                                </label>
                              ))}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-1">
                        {row.teamLeaderId && (
                          <div className="font-semibold flex justify-between items-center pr-1">
                            <span>{getInspectorName(row.teamLeaderId)}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(TL)</span>
                          </div>
                        )}
                        {row.coInspectorIds.map((id) => (
                          <div key={id} className="font-semibold flex justify-between items-center pr-1">
                            <span>{getInspectorName(id)}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Co-Inspector)</span>
                          </div>
                        ))}
                        {row.traineeInspectorIds.map((id) => (
                          <div key={id} className="font-semibold flex justify-between items-center pr-1">
                            <span>{getInspectorName(id)}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Trainee)</span>
                          </div>
                        ))}
                        {!row.teamLeaderId && row.coInspectorIds.length === 0 && (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    )}
                  </td>

                  {/* Date Column */}
                  <td className="border-r border-black p-2 text-center font-bold">
                    {!isReadOnly && isEditMode ? (
                      <input
                        type="date"
                        value={row.scheduledDate}
                        onChange={(e) => handleDateChange(row.scheduleId, e.target.value)}
                        className="w-full text-xs p-1 border border-slate-300 rounded font-sans"
                      />
                    ) : (
                      row.scheduledDate
                    )}
                  </td>

                  {/* Driver Column */}
                  <td className={`p-2 text-center font-semibold uppercase ${!isReadOnly && isEditMode ? "border-r border-black" : ""}`}>
                    {!isReadOnly && isEditMode ? (
                      <input
                        type="text"
                        value={row.driver || ""}
                        onChange={(e) => handleDriverChange(row.scheduleId, e.target.value)}
                        placeholder="Driver Name"
                        className="w-full text-xs p-1 border border-slate-300 rounded font-sans uppercase"
                      />
                    ) : (
                      row.driver || "DAN BABA"
                    )}
                  </td>

                  {/* Delete Action Column (Edit Mode Only) */}
                  {!isReadOnly && isEditMode && (
                    <td className="p-2 text-center align-middle print:hidden">
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.scheduleId)}
                        className="p-1.5 text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors cursor-pointer"
                        title="Remove schedule from batch"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  )}
                </tr>
              ))
            )}
          </tbody>
        </table>

        {/* Official Endorsement & Approval Signature Footer */}
        <div className="mt-12 pt-4 flex justify-between items-end text-xs font-bold px-8">
          {/* Endorsed By */}
          <div className="text-center space-y-1">
            <p className="uppercase mb-2">ENDORSED BY</p>
            <div className="h-14 flex items-end justify-center">
              <img
                src="/Signature-removebg-preview.png"
                alt="Endorsement Signature"
                className="object-contain max-h-12"
              />
            </div>
            <div className="border-b border-black w-48 mx-auto mb-1"></div>
            <p className="uppercase">Pharm (Mrs.) Uba Florence</p>
            <p className="text-[11px] font-normal">Divisional Deputy Director (IRSD)</p>
          </div>

          {/* Approved By */}
          <div className="text-center space-y-1">
            <p className="uppercase mb-2">APPROVED BY</p>
            <div className="h-14 flex items-end justify-center">
              {isApproved ? (
                <img
                  src="/MudSig-removebg-preview.png"
                  alt="Director Approval Signature"
                  className="object-contain max-h-12"
                />
              ) : (
                <span className="text-[10px] text-slate-400 italic mb-1 print:hidden">
                  [Pending Director Approval]
                </span>
              )}
            </div>
            <div className="border-b border-black w-52 mx-auto mb-1"></div>
            <p className="uppercase">MUDASHIRU, I. A.</p>
            <p className="text-[11px] font-normal">Divisional Deputy Director i/c (VMAP)</p>
          </div>
        </div>

      </div>
    </div>
  );
}