import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.string().min(1, "Category is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Address is required"),
  notificationEmail: z.string().email("Invalid email address"),
  facilityName: z.string().min(1, "Facility name is required"),
  facilityAddress: z.string().min(1, "Facility address is required"),
  
  // LOD's specific intake notes
  lodRemarks: z.string().min(5, "Please provide brief intake remarks"),

  productLines: z.array(z.object({
    lineName: z.string().min(1, "Line name required"),
    products: z.string().min(1, "Products required"),
  })).min(1, "At least one product line is required"),

  hasOAI: z.string().default("No"),
  lastInspected: z.string().default("Recent"),
  failedSystems: z.array(z.string()).optional().default([]),
  
  // Divisional routing (VMD, AFPD, PAD, IRSD)
  divisions: z.array(z.string()).min(1, "Select at least one division for routing"),
  
  poaUrl: z.string().optional().default(""),
  inspectionReportUrl: z.string().optional().default(""),
}).refine((data) => {
  return data.poaUrl || data.inspectionReportUrl;
}, {
  message: "Please upload the required dossier/report before submitting",
  path: ["poaUrl"] 
});