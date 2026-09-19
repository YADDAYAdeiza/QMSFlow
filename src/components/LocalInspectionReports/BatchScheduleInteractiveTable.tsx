"use client";

import React, { useTransition } from "react";
import { Edit3, Eye, Save, AlertCircle, Trash2 } from "lucide-react";
import RecommendApprovalModal from "@/app/LocalInspectionReports/ddd/schedule/print/RecommendApprovalModal";
import PrintTrigger from "@/app/LocalInspectionReports/ddd/schedule/print/PrintTrigger";
import {
  useBatchScheduleManager,
  EditableScheduleItem,
  InspectorPoolItem,
} from "@/hooks/LocalInspectionReports/useBatchScheduleManager";

const INSPECTION_PURPOSES = [
  "Pre-Production",
  "Pre-Registration",
  "Warehouse",
  "Cold-chain",
];

interface BatchScheduleInteractiveTableProps {
  batchId?: string;
  batchStatus?: string;
  batchHistory?: any[];
  startDate: string;
  endDate: string;
  initialRows: EditableScheduleItem[];
  inspectorPool: InspectorPoolItem[];
  formattedHeaderDate: string;
  isApproved: boolean;
  userId?: string;
  isReadOnly?: boolean;
}

export default function BatchScheduleInteractiveTable({
  batchId,
  batchStatus,
  batchHistory,
  startDate,
  endDate,
  initialRows,
  inspectorPool,
  formattedHeaderDate,
  isApproved,
  userId,
  isReadOnly = false,
}: BatchScheduleInteractiveTableProps) {
  const [isPending, startTransition] = useTransition();

  const {
    rows,
    isEditMode,
    saveError,
    setIsEditMode,
    setSaveError,
    handleRemoveRow,
    handleDateChange,
    handleInspectionTypeChange,
    handleDriverChange,
    handleTeamLeaderChange,
    handleCoInspectorToggle,
    handleTraineeToggle,
    handleSaveChanges,
    getInspectorName,
  } = useBatchScheduleManager({
    initialRows,
    inspectorPool,
    batchId,
    startDate,
    endDate,
  });

  const isRework = batchStatus === "REWORK_REQUIRED";
  const currentActiveScheduleIds = rows.map((r) => r.scheduleId);

  return (
    <div>
      {/* Screen Action Control Bar */}
      <div className="mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200 flex flex-wrap justify-between items-center gap-4 print:hidden">
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
            Viewing Schedule Period:{" "}
            <span className="font-bold text-slate-800">{formattedHeaderDate}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-3 ml-auto">
          {!isReadOnly && !isApproved && (
            <>
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

              {isEditMode && (
                <button
                  type="button"
                  onClick={() => startTransition(() => { handleSaveChanges(); })}
                  disabled={isPending}
                  className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-emerald-400 text-white text-xs font-bold rounded-md shadow-xs cursor-pointer transition-colors"
                >
                  <Save className="w-3.5 h-3.5" />
                  {isPending ? "Saving..." : "Save Batch Edits"}
                </button>
              )}

              {!isEditMode && (
                <RecommendApprovalModal
                  batchId={batchId}
                  batchReference={`SCHEDULE-${startDate}`}
                  title={`Annexure 08 (${startDate} to ${endDate})`}
                  startDate={startDate}
                  endDate={endDate}
                  scheduleIds={currentActiveScheduleIds}
                  history={batchHistory}
                  isRework={isRework}
                  userId={userId}
                />
              )}
            </>
          )}

          <PrintTrigger />
        </div>
      </div>

      {/* Save Error Banner */}
      {saveError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-xs flex items-center gap-2 print:hidden">
          <AlertCircle className="w-4 h-4 shrink-0" />
          <span>{saveError}</span>
        </div>
      )}

      {/* Active Mode Notice */}
      {!isReadOnly && isEditMode && (
        <p className="text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded py-1 px-3 mb-4 text-center print:hidden">
          ✏️ BATCH EDITOR ACTIVE — Modify dates, team allocations, or delete entries below, then click "Save Batch Edits"
        </p>
      )}

      {/* Annexure Table */}
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
                <td className="border-r border-black p-2 text-center font-bold">{index + 1}.</td>
                
                <td className="border-r border-black p-2 uppercase font-semibold">
                  <div>{row.companyName}</div>
                  <div className="text-[11px] font-normal text-slate-700 mt-1">{row.companyAddress}</div>
                </td>
                
                <td className="border-r border-black p-2 uppercase font-medium">
                  {!isReadOnly && isEditMode ? (
                    <select
                      value={row.inspectionType || ""}
                      onChange={(e) => handleInspectionTypeChange(row.scheduleId, e.target.value)}
                      className="w-full text-xs p-1 border border-slate-300 rounded bg-white font-medium uppercase"
                    >
                      <option value="">-- Select Purpose --</option>
                      {INSPECTION_PURPOSES.map((purpose) => (
                        <option key={purpose} value={purpose}>
                          {purpose}
                        </option>
                      ))}
                    </select>
                  ) : (
                    row.inspectionType
                  )}
                </td>

                <td className="border-r border-black p-2 uppercase">
                  {!isReadOnly && isEditMode ? (
                    <div className="space-y-3 lowercase">
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
    </div>
  );
}