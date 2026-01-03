"use client";

import { getDossierLink } from "@/app/actions/dossier";

interface ReviewButtonProps {
  inputs?: { // Added '?' here
    inspectionReportUrl?: string;
    poaUrl?: string;
    [key: string]: any;
  };
}

export default function ReviewButton({ inputs }: ReviewButtonProps) {
  const handleReview = async () => {
    // Using Optional Chaining '?.' to safely check for the URLs
    const targetUrl = inputs?.inspectionReportUrl || inputs?.poaUrl;
    console.log('Target  url is: ', inputs)

    if (!targetUrl) {
      alert("No reviewable document found for this application.");
      return;
    }

    const filePath = targetUrl.split('/').pop();

    if (!filePath) {
      alert("Invalid file path.");
      return;
    }

    const signedUrl = await getDossierLink(filePath);

    if (signedUrl) {
      window.open(signedUrl, "_blank");
    } else {
      alert("Failed to generate secure link.");
    }
  };

  return (
    <button 
      onClick={handleReview}
      className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-all"
    >
      Review Dossier
    </button>
  );
}