import EnrollmentModal from '@/components/Vetstat/Permits/EnrollPermitModal';
import PermitDashboard from '@/components/Vetstat/Permits/PermitDashboard';
import { createClient } from '@/utils/supabase/server';

export default async function PermitsPage() {
  const supabase = await createClient();
  const { data: permits } = await supabase.from('permits').select(`
    *, 
    permit_substances(id, substance_id, quantity_kg)
  `);
  const { data: atcCodes } = await supabase.from('atc_codes').select('id, substance');

  return (
    <div className="p-8 space-y-8">
      {/* The Single Entry Point */}
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Permit Management</h1>
        <EnrollmentModal atcCodes={atcCodes || []} />
      </div>

      <PermitDashboard initialPermits={permits || []} atcCodes={atcCodes || []} />
    </div>
  );
}