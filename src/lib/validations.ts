import { z } from "zod";

export const lodFormSchema = z.object({
  appNumber: z.string().min(1, "Application Number is required"),
  companyName: z.string().min(1, "Company Name is required"),
  type: z.enum([
    'Facility Verification', 
    'Inspection Report Review (local)', 
    'Inspection Report Review (foreign)'
  ]),
  // Conditional fields (we make them optional here, but handle logic in the GUI)
  facilityName: z.string().optional(),
  companyAddress: z.string().optional(),
  productCategory: z.string().optional(),
  
  // File URLs (Supabase storage links)
  poaUrl: z.string().optional(),
  inspectionReportUrl: z.string().optional(),
  
  divisions: z.array(z.string()).min(1, "Select at least one division"),
  initialComment: z.string().min(1, "Comment is required"),
});