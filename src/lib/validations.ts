import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.string().min(1, "Category is required"),
  companyName: z.string().min(1, "Local company name is required"),
  companyAddress: z.string().min(1, "Local address is required"),
  notificationEmail: z.string().email("Invalid email address"),
  facilityName: z.string().min(1, "Foreign factory name is required"),
  facilityAddress: z.string().min(1, "Foreign physical address is required"),
  lodRemarks: z.string().min(5, "Please provide brief intake remarks"),

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
  // Conditional File Check
  if (data.type === "Facility Verification") {
    return data.poaUrl && data.poaUrl.length > 0;
  }
  return data.inspectionReportUrl && data.inspectionReportUrl.length > 0;
}, {
  message: "Please upload the required document for this category",
  path: ["poaUrl"] // Highlights the POA field or general upload area
});