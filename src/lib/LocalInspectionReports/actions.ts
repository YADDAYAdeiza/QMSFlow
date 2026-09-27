"use server";

import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";

export async function uploadUserSignature(formData: FormData) {
  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Called from Server Action context
          }
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { success: false, error: "Unauthorized user session." };
  }

  const file = formData.get("signature") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Please select a valid image file." };
  }

  // Validate File Type (PNG / JPEG)
  if (!["image/png", "image/jpeg", "image/webp"].includes(file.type)) {
    return { success: false, error: "Invalid file type. PNG, JPEG, or WEBP required." };
  }

  // Max 2MB limit
  if (file.size > 2 * 1024 * 1024) {
    return { success: false, error: "File size exceeds maximum 2MB limit." };
  }

  const fileExt = file.name.split(".").pop();
  const filePath = `signatures/${user.id}_${Date.now()}.${fileExt}`;

  // 1. Upload signature file to Supabase Storage ('Documents' bucket)
  const { error: uploadErr } = await supabase.storage
    .from("documents")
    .upload(filePath, file, {
      upsert: true,
      contentType: file.type,
    });

  if (uploadErr) {
    return { success: false, error: `Upload failed: ${uploadErr.message}` };
  }

  // 2. Get Public URL (or signed URL depending on bucket policy)
  const {
    data: { publicUrl },
  } = supabase.storage.from("documents").getPublicUrl(filePath);

  // 3. Update public.users record
  const { error: dbErr } = await supabase
    .from("users")
    .update({
      signature_url: publicUrl,
      signature_updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (dbErr) {
    return { success: false, error: `Database update failed: ${dbErr.message}` };
  }

  revalidatePath("/LocalInspectionReports");
  return { success: true, url: publicUrl };
}