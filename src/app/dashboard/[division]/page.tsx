
import { createClient } from '@/utils/supabase/client';
import QMSCountdown from '@/components/QMSCountdown'; // Import the countdown here
import ReviewButton from '@/components/ReviewButton';

export default async function StaffDashboard({ params }: { params: Promise<{ division: string }> }) {
  const supabase = await createClient();


const { division } = await params;
const upperDivision = division.toUpperCase();

console.log(division, 'Here')
const { data: applications, error } = await supabase
  .from('applications')
  .select('*')
  // This targets the JSONB column 'details' 
  // It looks for the key 'assignedDivisions' containing the specific division in an array
  .contains('details', { assignedDivisions: [upperDivision] })
  .eq('current_point', 'Staff');

if (error) {
  console.error("Query Error:", error.message);
}


console.log("Fetched Applications:", applications);
    console.log('Thsi is applications', applications)
  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{division.toUpperCase()} Staff Queue</h1>
      
      <table className="min-w-full bg-white border border-gray-200">
        <thead>
          <tr className="bg-gray-50">
            <th className="p-3 text-left border-b">Dossier ID</th>
            <th className="p-3 text-left border-b">QMS Time Remaining</th>
            <th className="p-3 text-left border-b">Status</th>
          </tr>
        </thead>
        <tbody>
            {applications?.map((app) => (
                <tr key={app.id}>
                    <td className="p-3 border-b">{String(app.id).slice(0, 8)}</td>
                    
                    {/* Pass created_at here */}
                    <td className="p-3 border-b font-mono">
                        <QMSCountdown 
                        startTime={app.created_at} 
                        limitHours={48} 
                        />
                    </td>

                    <td className="p-3 border-b">
                        <ReviewButton inputs={app.details?.inputs} />
                    </td>
                </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
}