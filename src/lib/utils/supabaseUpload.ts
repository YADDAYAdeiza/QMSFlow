// src/lib/utils/supabaseUpload.ts
import { createClient } from '@/lib/supabase';

export type CompanySubFolder = 
  | '01_Local_Inspection_Reports'
  | '02_Dossiers'
  | '03_Certificates'
  | '04_Correspondence'
  | '05_CAPA_Evidence'; // Added dedicated folder

/**
 * Constructs standardized, safe storage paths inside the documents bucket.
 */
export function buildCompanyFilePath(
  companyId: string,
  folder: CompanySubFolder,
  fileName: string
): string {
  const cleanCompanyId = companyId.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');
  
  return `companies/${cleanCompanyId}/${folder}/${cleanFileName}`;
}

export function getStoragePublicUrl(bucketName: string, path: string): string {
  const supabase = createClient();
  const { data } = supabase.storage.from(bucketName).getPublicUrl(path);
  return data.publicUrl;
}

/**
 * Primary function for uploading any file/document to the 'documents' bucket.
 */
export async function uploadDossierFile(file: File | Blob, path: string): Promise<string> {
  const supabase = createClient();

  const { data, error } = await supabase.storage
    .from('documents')
    .upload(path, file, {
      cacheControl: '3600',
      upsert: true,
      contentType: file.type || 'application/pdf'
    });

  if (error) {
    throw error;
  }

  return getStoragePublicUrl('documents', data.path);
}

/**
 * Alias export to support existing components like GMPReportWorkspace.tsx
 */
export const uploadDossierPdf = uploadDossierFile;