// src/lib/utils/supabaseUpload.ts
import { createClient } from '@/utils/supabase/client';

export type CompanySubFolder = 
  | '01_Local_Inspection_Reports'
  | '02_Dossiers'
  | '03_Certificates'
  | '04_Correspondence'
  | '05_CAPA_Evidence'
  | '06_Facility_Verification';

/**
 * Constructs standardized, safe storage paths inside the documents bucket.
 * 
 * Path structure:
 * - companies/{companyId}/{applicationId}/{folder}/{fileName}
 */
export function buildCompanyFilePath(
  companyId: string | null | undefined,
  folder: CompanySubFolder,
  fileName: string,
  applicationId?: string
): string {
  const sanitize = (val: string) => val.trim().replace(/[^a-zA-Z0-9_-]/g, '_');
  const cleanFileName = fileName.trim().replace(/[^a-zA-Z0-9_.-]/g, '_');

  const cleanCompanyId = companyId ? sanitize(String(companyId)) : '';
  const cleanAppId = applicationId ? sanitize(applicationId) : '';

  if (cleanCompanyId && cleanAppId) {
    return `companies/${cleanCompanyId}/${cleanAppId}/${folder}/${cleanFileName}`;
  }

  const fallbackId = cleanCompanyId || cleanAppId || 'unassigned';
  return `companies/${fallbackId}/${folder}/${cleanFileName}`;
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