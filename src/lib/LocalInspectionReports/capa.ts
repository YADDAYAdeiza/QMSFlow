// app/actions/capa.ts
"use server";

import { createClient } from "@/utils/supabase/server"; // Adjust path based on your Supabase client setup
import { revalidatePath } from "next/cache";

interface CAPAPayload {
  applicationId: string;
  companyName: string;
  companyAddress: string;
  refNumber: string;
  capaItems: any[];
  signatures: {
    responsiblePerson: { name: string; date: string };
    managingDirector: { name: string; date: string };
  };
}

export async function submitCapaLedger(payload: CAPAPayload) {
  const supabase = await createClient();

  // Upsert or insert depending on if a record for this application already exists
  const { data, error } = await supabase
    .from("capa_submissions")
    .upsert(
      {
        application_id: payload.applicationId,
        ref_number: payload.refNumber,
        company_name: payload.companyName,
        company_address: payload.companyAddress,
        capa_items: payload.capaItems,
        responsible_person: payload.signatures.responsiblePerson,
        managing_director: payload.signatures.managingDirector,
        status: "Pending Review",
        updated_at: new Date().toISOString(),
      },
      { onConflict: "application_id" } // Ensures one CAPA ledger per application ID
    )
    .select()
    .single();

  if (error) {
    console.error("Supabase DB Error:", error.message);
    throw new Error(`Failed to transmit CAPA ledger: ${error.message}`);
  }

  // Revalidate the application review dashboard path so VMD Desk sees changes immediately
  revalidatePath(`/dashboard/applications/${payload.applicationId}`);
  
  return { success: true, data };
}