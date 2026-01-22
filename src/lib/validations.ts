import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "App number is required"),
  type: z.string().min(1, "Category is required"),
  companyName: z.string().min(1, "Company name is required"),
  companyAddress: z.string().min(1, "Address is required"),
  notificationEmail: z.string().email("Invalid email address"), // NEW
  facilityName: z.string().min(1, "Facility name is required"),
  facilityAddress: z.string().min(1, "Facility address is required"),
  
  // Product Lines must be an array with at least one item
  productLines: z.array(z.object({
    lineName: z.string().min(1, "Line name required"),
    products: z.string().min(1, "Products required"),
  })).min(1),

  // Risk Fields
  hasOAI: z.string(),
  lastInspected: z.string(),
  failedSystems: z.array(z.string()).optional(),

  // Workflow
  divisions: z.array(z.string()).min(1, "Select at least one division"),
  
  // File URLs (Make one optional based on the 'type' logic)
  poaUrl: z.string().optional(),
  inspectionReportUrl: z.string().optional(),
});