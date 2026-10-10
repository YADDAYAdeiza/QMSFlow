"use client";

import React, { useState } from "react";
import CategorizationEndorsementModal from "./CategorizationEndorsementModal"; // Use your modal component here

interface TriggerProps {
  applicationId: number;
  facilityId: string | null;
  companyName: string;
  applicationNumber: string;
}

export default function CategorizeEndorsementTrigger({
  applicationId,
  facilityId,
  companyName,
  applicationNumber,
}: TriggerProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors"
      >
        <span>🛡️</span> Endorse Risk Tier
      </button>

      {isOpen && (
        <CategorizationEndorsementModal
          applicationId={applicationId}
          facilityId={facilityId}
          companyName={companyName}
          applicationNumber={applicationNumber}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}