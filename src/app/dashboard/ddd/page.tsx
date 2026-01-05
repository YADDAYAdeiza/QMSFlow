import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import StaffSelector from "@/components/StaffSelector";

export default async function DDDInboxPage() {
  const dddInbox = await db.query.applications.findMany({
    where: eq(applications.currentPoint, 'Divisional Deputy Director'),
    with: { company: true }
  });

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">DDD Assignment Hub</h1>
      <div className="space-y-4">
        {dddInbox.map(app => (
          <div key={app.id} className="p-4 bg-white shadow rounded-lg border flex justify-between items-center">
            <div>
              <p className="font-mono text-sm text-blue-600">{app.applicationNumber}</p>
              <h3 className="font-bold">{app.company?.name}</h3>
              <p className="text-xs text-gray-500">Type: {app.type}</p>
            </div>
            
            <div className="flex flex-col gap-2">
              <span className="text-[10px] uppercase font-bold text-gray-400">Assign Technical Reviewer:</span>
              {/* Note: In your logic, one app might have multiple divisions. 
                  We map through assigned divisions to assign a person for each. */}
              {app.details.assignedDivisions.map(div => (
                <div key={div} className="flex flex-col gap-1">
                  <span className="text-xs font-semibold">{div} Division:</span>
                  <StaffSelector appId={app.id} division={div} />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}