import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.enum(["Facility Verification", "Inspection Report Review (Foreign)"], {
    errorMap: () => ({ message: "Please select a valid application category" }),
  }),
  
  // Local Company
  companyName: z.string().min(1, "Local company name is required"),
  companyAddress: z.string().min(1, "Local address is required"),
  
  // Optional Notification Email
  notificationEmail: z.string()
    .trim()
    .toLowerCase()
    .optional()
    .or(z.string().email("Please enter a valid email address").or(z.literal(""))),

  // Foreign Factory
  facilityName: z.string().min(1, "Foreign factory name is required"),
  facilityAddress: z.string().min(1, "Foreign physical address is required"),
  
  // Facility Type Options Update
  facilityType: z.enum(["Pharma", "Food/Feed", "Pesticide", "Premixes"]).default("Pharma"),

  // Optional Lat/Lng Fields
  latitude: z.string().optional().or(z.literal("")),
  longitude: z.string().optional().or(z.literal("")),

  lodRemarks: z.string().min(5, "Please provide brief intake remarks (min. 5 chars)"),

  productLines: z.array(z.object({
    lineName: z.string().min(1, "Line name required"),
    riskCategory: z.string().min(1, "Risk classification is required"),
    products: z.array(z.object({
      name: z.string().min(1, "Product name required"),
    })).min(1, "At least one product is required per line"),
  })).min(1, "At least one product line is required"),

  divisions: z.array(z.string()).min(1, "Select at least one division (e.g., VMD) for routing"),
  
  poaUrl: z.string().optional().default(""),
  inspectionReportUrl: z.string().optional().default(""),

  sendEmailNotification: z.boolean().optional().default(false),
}).superRefine((data, ctx) => {
  if (data.type === "Facility Verification") {
    if (!data.poaUrl || data.poaUrl.length <= 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required Power of Attorney (POA) document is missing.",
        path: ["poaUrl"],
        params: { i18n: "upload_required" }
      });
    }
  } else if (data.type === "Inspection Report Review (Foreign)") {
    if (!data.inspectionReportUrl || data.inspectionReportUrl.length <= 5) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Required Inspection Report document is missing.",
        path: ["inspectionReportUrl"],
        params: { i18n: "upload_required" }
      });
    }
  }
});