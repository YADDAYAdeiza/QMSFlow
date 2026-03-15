import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.string().min(1, "Category is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Address is required"),
  notificationEmail: z.string().email("Invalid email address"),
  facilityName: z.string().min(1, "Facility name is required"),
  facilityAddress: z.string().min(1, "Facility address is required"),
  lodRemarks: z.string().min(5, "Please provide brief intake remarks"),

  // Updated to validate the nested array structure
  productLines: z.array(z.object({
    lineName: z.string().min(1, "Line name required"),
    products: z.array(z.object({
      name: z.string().min(1, "Product name required"),
    })).min(1, "At least one product is required per line"),
  })).min(1, "At least one product line is required"),

  divisions: z.array(z.string()).min(1, "Select at least one division for routing"),
  poaUrl: z.string().optional().default(""),
  inspectionReportUrl: z.string().optional().default(""),
}).refine((data) => {
  // Ensure the correct file is uploaded based on application type
  if (data.type === "Facility Verification") return !!data.poaUrl;
  return !!data.inspectionReportUrl;
}, {
  message: "Please upload the required document for this category",
  path: ["poaUrl"] 
});