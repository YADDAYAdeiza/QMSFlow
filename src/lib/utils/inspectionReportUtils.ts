// src/lib/inspectionReportUtils.ts

export interface NormalizedProductLine {
  lineName: string;
  lineType?: string;
  products?: Array<{
    name: string;
    classification?: string;
  }>;
}

export interface ExtractedInspectionData {
  effectiveCompanyName: string;
  effectiveAddress: string;
  effectiveRecipientEmail: string;
  extractedLines: any[];
  finalRecommendation: "CAPA_PENDING" | "APPROVED" | "PENDING" | string;
  observations: any[];
  certificateData: {
    appNumber: string;
    date: string;
    facilityName: string;
    facilityAddress: string;
    productLines: any[];
    logoUrl: string;
    effectiveCompanyName: string;
    signatoryName: string;
    signatoryTitle: string;
  };
}

/**
 * Extracts and normalizes inspection data from any payload structure
 * (e.g. API request body, checklist snapshot, or application details object).
 */
export function extractInspectionData(
  data: any, 
  applicationId?: string | number
): ExtractedInspectionData {
  const checklistSnapshot = data?.checklistSnapshot || data?.details?.savedChecklistSnapshot || {};

  // 1. Establishment & Site Metadata Extraction
  const effectiveCompanyName = 
    data?.companyName || 
    checklistSnapshot?.inspected_site_name || 
    checklistSnapshot?.company_name ||
    data?.details?.savedChecklistSnapshot?.inspected_site_name ||
    data?.details?.savedChecklistSnapshot?.company_name ||
    data?.details?.companyName || 
    "Registered Establishment";

  const effectiveAddress = 
    data?.facilityAddress || 
    checklistSnapshot?.facility_address || 
    checklistSnapshot?.facilityAddress || 
    checklistSnapshot?.inspected_site_address ||
    data?.details?.savedChecklistSnapshot?.facility_address || 
    data?.details?.savedChecklistSnapshot?.facilityAddress || 
    data?.details?.facilityAddress || 
    "Registered Facility Address";

  const effectiveRecipientEmail = 
    data?.notificationEmail || 
    checklistSnapshot?.applicant_email ||
    data?.details?.savedChecklistSnapshot?.applicant_email ||
    data?.details?.notificationEmail || 
    "managing_director@globalorganics.com";

  // 2. Product Lines Extraction
  const rawLinesArray = [
    data?.productLines,
    data?.product_lines,
    data?.rawProductLines,
    checklistSnapshot?.productLines,
    checklistSnapshot?.product_lines,
    data?.details?.productLines,
    data?.details?.product_lines,
    data?.details?.savedChecklistSnapshot?.productLines,
    data?.details?.savedChecklistSnapshot?.product_lines,
  ];

  const extractedLines = rawLinesArray.find(
    (arr) => Array.isArray(arr) && arr.length > 0
  ) || [];

  // 3. Recommendation & Audit Observations
  const finalRecommendation = checklistSnapshot?.final_recommendation || data?.final_recommendation || "PENDING";
//   const finalRecommendation = "APPROVED";
  const observations = checklistSnapshot?.observations || data?.observations || [];

  // 4. Logo & Signatory Details
  const baseUrl = typeof window !== "undefined" 
    ? window.location.origin 
    : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000");
  
  const logoUrl = `${baseUrl}/nafdac_logo2-removebg-preview.png`;

  const certificateData = {
    appNumber: `NAFDAC/VMAP/GMP/${applicationId || data?.applicationId || "0000"}`,
    date: new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }),
    facilityName: effectiveCompanyName,
    facilityAddress: effectiveAddress,
    productLines: extractedLines,
    logoUrl,
    effectiveCompanyName,
    signatoryName: "Divisional Deputy Director",
    signatoryTitle: "Divisional Deputy Director, Veterinary Medicine & Allied Products"
  };

  return {
    effectiveCompanyName,
    effectiveAddress,
    effectiveRecipientEmail,
    extractedLines,
    finalRecommendation,
    observations,
    certificateData
  };
}