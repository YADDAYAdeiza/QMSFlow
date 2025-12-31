import { getDirectorInbox } from "@/app/actions/director";
import PushToStaffButton from "@/components/PushToStaffButton";

export default async function DirectorPage() {
  const inbox = await getDirectorInbox();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Director's Inbox (Awaiting Division Assignment)</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 border-b">App #</th>
              <th className="p-4 border-b">Company</th>
              <th className="p-4 border-b">Documents</th>
              <th className="p-4 border-b">Assigned Divisions</th>
              <th className="p-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="p-4 border-b font-mono">{app.applicationNumber}</td>
                <td className="p-4 border-b">{(app as any).company?.name}</td>
                <td className="p-4 border-b">
                    {/* If it's a Facility Verification */}
                    {(app.details as any).inputs.poaUrl && (
                        <a 
                        href={(app.details as any).inputs.poaUrl} 
                        target="_blank" 
                        className="text-blue-600 underline text-sm block"
                        >
                        View POA
                        </a>
                    )}

                    {/* If it's an Inspection Review */}
                    {(app.details as any).inputs.inspectionReportUrl && (
                        <a 
                        href={(app.details as any).inputs.inspectionReportUrl} 
                        target="_blank" 
                        className="text-green-600 underline text-sm block"
                        >
                        View Inspection Report
                        </a>
                    )}
                    
                    {/* Fallback if something went wrong */}
                    {!(app.details as any).inputs.poaUrl && !(app.details as any).inputs.inspectionReportUrl && (
                        <span className="text-gray-400 text-xs italic">No docs uploaded</span>
                    )}
                    </td>
                <td className="p-4 border-b">
                  {(app.details as any).assignedDivisions.join(", ")}
                </td>
                <td className="p-4 border-b">
                  <button className="bg-green-600 text-white px-4 py-1 rounded text-sm font-bold">
                    Push to Staff
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
