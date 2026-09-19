"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export interface InspectorPoolItem {
  id: string;
  full_name: string;
  division?: string;
}

export interface EditableScheduleItem {
  scheduleId: string;
  applicationId: number;
  companyName: string;
  companyAddress: string;
  inspectionType: string;
  scheduledDate: string;
  driver?: string;
  teamLeaderId: string;
  coInspectorIds: string[];
  traineeInspectorIds: string[];
}

interface UseBatchScheduleManagerProps {
  initialRows: EditableScheduleItem[];
  inspectorPool: InspectorPoolItem[];
  batchId?: string;
  startDate: string;
  endDate: string;
}

export function useBatchScheduleManager({
  initialRows,
  inspectorPool,
  batchId,
  startDate,
  endDate,
}: UseBatchScheduleManagerProps) {
  const router = useRouter();
  const [rows, setRows] = useState<EditableScheduleItem[]>(initialRows || []);
  const [isEditMode, setIsEditMode] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const getInspectorName = (id: string): string => {
    const found = inspectorPool.find((ins) => ins.id === id);
    return found ? found.full_name : "Unknown Officer";
  };

  const handleRemoveRow = (scheduleId: string) => {
    setRows((prev) => prev.filter((r) => r.scheduleId !== scheduleId));
  };

  const handleDateChange = (scheduleId: string, scheduledDate: string) => {
    setRows((prev) =>
      prev.map((r) => (r.scheduleId === scheduleId ? { ...r, scheduledDate } : r))
    );
  };

  const handleDriverChange = (scheduleId: string, driver: string) => {
    setRows((prev) =>
      prev.map((r) => (r.scheduleId === scheduleId ? { ...r, driver } : r))
    );
  };

  const handleTeamLeaderChange = (scheduleId: string, teamLeaderId: string) => {
    setRows((prev) =>
      prev.map((r) => (r.scheduleId === scheduleId ? { ...r, teamLeaderId } : r))
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
          alert("Maximum of 2 Trainees allowed per inspection team.");
          return r;
        }
        const updated = exists
          ? r.traineeInspectorIds.filter((id) => id !== inspectorId)
          : [...r.traineeInspectorIds, inspectorId];
        return { ...r, traineeInspectorIds: updated };
      })
    );
  };

  const handleSaveChanges = async () => {
    setIsSaving(true);
    setSaveError(null);

    try {
      const activeScheduleIds = rows
        .map((r) => r.scheduleId)
        .filter((id): id is string => Boolean(id));

      const updates = rows.map((r) => {
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
          scheduleId: r.scheduleId || null,
          applicationId: r.applicationId,
          scheduledDate: r.scheduledDate,
          driver: r.driver || "",
          inspectionType: r.inspectionType || "",
          inspectors,
        };
      });

      const res = await fetch("/api/LocalInspectionReports/schedule/batch-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId,
          startDate,
          endDate,
          activeScheduleIds,
          updates,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error || "Failed to update schedules.");

      setIsEditMode(false);
      router.refresh();
    } catch (err: any) {
      console.error("Save error:", err.message);
      setSaveError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSaving(false);
    }
  };

  return {
    rows,
    isEditMode,
    isSaving,
    saveError,
    setIsEditMode,
    setSaveError,
    handleRemoveRow,
    handleDateChange,
    handleDriverChange,
    handleTeamLeaderChange,
    handleCoInspectorToggle,
    handleTraineeToggle,
    handleSaveChanges,
    getInspectorName,
  };
}