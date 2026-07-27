// utils/supabaseUpload.ts
import { createClient } from '@/utils/supabase/client';

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