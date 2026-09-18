"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function useBatchScheduleManager({
  initialBatch,
  initialSchedules,
}: {
  initialBatch: any;
  initialSchedules: any[];
}) {
  const router = useRouter();
  const [schedules, setSchedules] = useState(initialSchedules);
  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // 1. Row Removal Logic
  const handleRemoveRow = (scheduleId: string) => {
    setSchedules((prev) => prev.filter((item) => item.id !== scheduleId));
  };

  // 2. Cancel Edits & Reset State Logic
  const handleCancelEdits = () => {
    setSchedules(initialSchedules); // Restore original rows
    setIsEditing(false);
  };

  // 3. Save Batch Edits (Calls PUT /api/LocalInspectionReports/schedule/batch-update)
  const handleSaveBatchEdits = async () => {
    setIsSaving(true);
    try {
      const activeScheduleIds = schedules.map((s) => s.id);
      const updates = schedules.map((s) => ({
        scheduleId: s.id,
        scheduledDate: s.scheduledDate,
        driver: s.assignedDriver,
        inspectors: s.inspectors || [],
      }));

      const res = await fetch("/api/LocalInspectionReports/schedule/batch-update", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: initialBatch?.id,
          startDate: initialBatch?.startDate,
          endDate: initialBatch?.endDate,
          activeScheduleIds,
          updates,
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsEditing(false);
      router.refresh();
    } catch (err: any) {
      console.error("Save error:", err.message);
      alert(`Failed to save changes: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  // 4. Submit Recommendation (Auto-saves first if editing)
  const handleRecommendApproval = async (comments: string) => {
    setIsSaving(true);
    try {
      // Direct auto-save prior to endorsement submit
      if (isEditing) {
        await handleSaveBatchEdits();
      }

      const activeScheduleIds = schedules.map((s) => s.id);
      const res = await fetch("/api/LocalInspectionReports/schedule/director-action", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          batchId: initialBatch?.id,
          action: initialBatch?.status === "REWORK_REQUIRED" ? "RESUBMIT" : "RECOMMEND",
          comments,
          activeScheduleIds,
          userRole: "Divisional Deputy Director",
        }),
      });

      const data = await res.json();
      if (!data.success) throw new Error(data.error);

      setIsModalOpen(false);
      router.refresh();
    } catch (err: any) {
      console.error("Submission error:", err.message);
      alert(`Failed to route batch: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return {
    schedules,
    isEditing,
    isSaving,
    isModalOpen,
    setIsEditing,
    setIsModalOpen,
    handleRemoveRow,
    handleCancelEdits,
    handleSaveBatchEdits,
    handleRecommendApproval,
  };
}