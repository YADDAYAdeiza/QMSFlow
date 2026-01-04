import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import AssignToStaffButton from "@/components/AssignToStaffButton";

export default async function DDDPage() {
  // Fetch dossiers waiting for DDD assignment
  const dddInbox = await db.query.applications.findMany({
    where: eq(applications.currentPoint, 'Divisional Deputy Director'),
    with: {
      company: true,
    },
  });

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">DDD: Divisional Assignment Hub</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100 text-sm uppercase text-gray-600">
            <tr>
              <th className="p-4 border-b">App #</th>
              <th className="p-4 border-b">Type</th>
              <th className="p-4 border-b">Company</th>
              <th className="p-4 border-b">Director's Recommended Divisions</th>
              <th className="p-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {dddInbox.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="p-4 border-b font-mono font-medium">{app.applicationNumber}</td>
                <td className="p-4 border-b text-sm">{app.type}</td>
                <td className="p-4 border-b text-sm">{app.company?.name}</td>
                <td className="p-4 border-b">
                  <div className="flex gap-1 flex-wrap">
                    {app.details.assignedDivisions.map((div) => (
                      <span key={div} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-semibold">
                        {div}
                      </span>
                    ))}
                  </div>
                </td>
                <td className="p-4 border-b">
                  {/* This button will trigger the final push to Staff and start QMS */}
                  <AssignToStaffButton 
                    appId={app.id} 
                    divisions={app.details.assignedDivisions} 
                  />
                </td>
              </tr>
            ))}
            {dddInbox.length === 0 && (
              <tr>
                <td colSpan={5} className="p-8 text-center text-gray-500 italic">
                  Inbox empty. No applications awaiting assignment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}