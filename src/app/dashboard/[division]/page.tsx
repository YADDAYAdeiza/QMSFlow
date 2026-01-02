// app/dashboard/[division]/page.tsx
import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';

export default async function StaffDashboard({ params }: { params: { division: string } }) {
  const supabase = await createClient();
  const { division } = params;

  // Validate the division against your required list
  const validDivisions = ["VMD", "PAD", "AFPD", "IRSD"];
  if (!validDivisions.includes(division.toUpperCase())) {
    return <div>Invalid Division</div>;
  }

  // Fetch only apps assigned to this specific division
  const { data: applications, error } = await supabase
    .from('applications')
    .select('*')
    .contains('details->assignedDivisions', [division.toUpperCase()])
    .order('created_at', { ascending: false });

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-4">{division.toUpperCase()} Queue</h1>
      
      <table className="min-w-full bg-white border">
        <thead>
          <tr className="bg-gray-100">
            <th className="p-3 text-left">App ID</th>
            <th className="p-3 text-left">QMS Deadline</th>
            <th className="p-3 text-left">Status</th>
            <th className="p-3 text-left">Actions</th>
          </tr>
        </thead>
        <tbody>
          {applications?.map((app) => (
            <tr key={app.id}>
              <td className="p-3 border-t">{app.id.slice(0, 8)}</td>
              <td className="p-3 border-t text-red-600 font-mono">
                {/* We'll calculate the QMS remaining time here */}
                {new Date(app.qms_start_time).toLocaleTimeString()}
              </td>
              <td className="p-3 border-t">{app.status}</td>
              <td className="p-3 border-t">
                <button className="bg-blue-500 text-white px-3 py-1 rounded">
                  Review Dossier
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}