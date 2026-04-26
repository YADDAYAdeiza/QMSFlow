// app/permits/page.tsx
import PermitPageClient from '@/components/Vetstat/Permits/PermitPageClient';
import { createClient } from '@/utils/supabase/server';

export default async function PermitsPage() {
  const supabase = await createClient();
  const { data: permits } = await supabase.from('permits').select(`
    *, 
    permit_substances(id, substance_id, quantity_kg)
  `);
  const { data: atcCodes } = await supabase.from('atc_codes').select('id, substance');

  // We pass the fetched data to a new client component
  return (
    <PermitPageClient 
      initialPermits={permits || []} 
      atcCodes={atcCodes || []} 
    />
  );
}