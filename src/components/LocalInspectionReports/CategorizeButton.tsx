"use client";

import { useState } from "react";
import AssignCategorizationModal from "./AssignCategorizationModal";

interface CategorizeButtonProps {
  applicationId: number;
  companyName: string;
  applicationNumber: string;
}

export default function CategorizeButton({
  applicationId,
  companyName,
  applicationNumber,
}: CategorizeButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-md shadow-xs transition-colors cursor-pointer"
      >
        <span>🏷️</span> Categorize Facility
      </button>

      {isOpen && (
        <AssignCategorizationModal
          applicationId={applicationId}
          companyName={companyName}
          applicationNumber={applicationNumber}
          onClose={() => setIsOpen(false)}
        />
      )}
    </>
  );
}