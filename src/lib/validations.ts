import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.enum(["Facility Verification", "Inspection Report Review (Foreign)"], {
    errorMap: () => ({ message: "Please select a valid application category" }),
  }),
  
  // Local Company
  companyName: z.string().min(1, "Local company name is required"),
  companyAddress: z.string().min(1, "Local address is required"),
  notificationEmail: z.string()
    .min(1, "Notification email is required")
    .email("Please enter a valid email address")
    .trim()
    .toLowerCase(),

  // Foreign Factory
  facilityName: z.string().min(1, "Foreign factory name is required"),
  facilityAddress: z.string().min(1, "Foreign physical address is required"),
  
  lodRemarks: z.string().min(5, "Please provide brief intake remarks (min. 5 chars)"),

  productLines: z.array(z.object({
    lineName: z.string().min(1, "Line name required"),
    riskCategory: z.string().min(1, "Risk classification is required"),
    products: z.array(z.object({
      name: z.string().min(1, "Product name required"),
    })).min(1, "At least one product is required per line"),
  })).min(1, "At least one product line is required"),

  divisions: z.array(z.string()).min(1, "Select at least one division (e.g., VMD) for routing"),
  
  // URLs from FileUpload
  poaUrl: z.string().optional().default(""),
  inspectionReportUrl: z.string().optional().default(""),
}).refine((data) => {
  // Logic: If 'Facility Verification', poaUrl MUST exist. 
  // If 'Inspection Report Review', inspectionReportUrl MUST exist.
  if (data.type === "Facility Verification") {
    return data.poaUrl && data.poaUrl.length > 5; // Simple check for a valid URL string
  }
  return data.inspectionReportUrl && data.inspectionReportUrl.length > 5;
}, {
  // This dynamic path ensures the error highlights the correct upload field
  params: { i18n: "upload_required" },
  message: "Required document missing for this application type",
  path: ["poaUrl"], 
});