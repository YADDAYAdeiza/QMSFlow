"use server"

import { createClient } from '@/utils/supabase/server';

export async function getDossierLink(filePath: string) {
  const supabase = await createClient();

  // This creates a secure link that expires in 60 minutes
  const { data, error } = await supabase
    .storage
    .from('Documents')
    .createSignedUrl(filePath, 3600); 

  if (error) {
    console.error("Error fetching document:", error.message);
    return null;
  }

  return data.signedUrl;
}