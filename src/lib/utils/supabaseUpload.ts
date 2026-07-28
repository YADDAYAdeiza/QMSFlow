// utils/supabaseUpload.ts
import { createClient } from '@/utils/supabase/client';

export type CompanySubFolder = 
  | '01_Local_Inspection_Reports'
  | '02_Dossiers'
  | '03_Certificates'
  | '04_Correspondence';

/**
 * Helper to construct standardized, safe storage paths inside the Documents bucket.
 * Example output: "companies/COMP-2026-0042/01_Inspection_Reports/Local_Inspection_Report_DER80006.pdf"
 */
export function buildCompanyFilePath(
  companyId: string,
  folder: CompanySubFolder,
  fileName: string
): string {
  // Sanitize companyId and fileName to prevent path traversal issues
  const cleanCompanyId = companyId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  return `companies/${cleanCompanyId}/${folder}/${cleanFileName}`;
}

/**
 * Uploads a file to the unified 'Documents' bucket and returns its public URL.
 */
export async function uploadDossierPdf(file: File, path: string) {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
    });

  if (error) {
    throw error;
  }

  const { data: publicUrlData } = supabase.storage
    .from('documents')
    .getPublicUrl(data.path);

  return publicUrlData.publicUrl;
}