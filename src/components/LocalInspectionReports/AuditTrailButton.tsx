"use client";

import React from "react";
import { useRouter } from "next/navigation";

interface AuditTrailButtonProps {
  id: number;
  applicationNumber: string;
}

export default function AuditTrailButton({ id, applicationNumber }: AuditTrailButtonProps) {
  const router = useRouter();

  return (
    <button 
      type="button"
      className="inline-flex items-center px-3 py-1.5 text-xs font-medium rounded-lg text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
      onClick={() => router.push(`/LocalInspectionReports/ddd/applications/History/${id}`)}
      aria-label={`View audit trail history for application ${applicationNumber}`}
    >
      Audit Trail
    </button>
  );
}