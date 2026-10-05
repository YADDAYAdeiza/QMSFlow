"use client";

import React, { useTransition } from "react";
import { recallIrsdApplication } from "@/lib/LocalInspectionReports/recallApplication";

interface RecallApplicationButtonProps {
  applicationId: number;
}

export default function RecallApplicationButton({ applicationId }: RecallApplicationButtonProps) {
  const [isPending, startTransition] = useTransition();

  const handleRecall = () => {
    if (!confirm("Are you sure you want to recall this application back to your IRSD Intake Routing desk?")) {
      return;
    }

    startTransition(async () => {
      const result = await recallIrsdApplication(applicationId);
      if (!result.success) {
        alert(`Recall failed: ${result.error}`);
      }
    });
  };

  return (
    <button
      onClick={handleRecall}
      disabled={isPending}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
    >
      <span>↩️</span> {isPending ? "Recalling..." : "Recall Application"}
    </button>
  );
}