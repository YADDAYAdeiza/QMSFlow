// utils/supabaseUpload.ts
import { createClient } from '@/lib/supabase';

export type CompanySubFolder = 
  | '01_Local_Inspection_Reports'
  | '02_Dossiers'
  | '03_Certificates'
  | '04_Correspondence';

/**
 * Helper to construct standardized, safe storage paths inside the documents bucket.
 * Example output: "companies/COMP-2026-0042/01_Local_Inspection_Reports/Local_Inspection_Report_DER80006.pdf"
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
 * Returns the public access URL for a file stored in a Supabase storage bucket.
 */
export function getStoragePublicUrl(bucketName: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Uploads a file to the 'documents' bucket and returns its public URL.
 */
export async function uploadDossierPdf(file: File | Blob, path: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('documents') // Updated to lowercase 'documents'
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: 'application/pdf'
    });

  if (error) {
    throw error;
  }

  return getStoragePublicUrl('documents', data.path);
}