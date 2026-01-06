import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, desc } from "drizzle-orm";

export default async function DirectorLiveTracker() {
  // 1. Get all applications and their timeline history
  const allApps = await db.query.applications.findMany({
    with: {
      company: true,
      // This requires the 'relations' defined in schema, 
      // but we'll use a direct query if relations aren't set up yet.
    },
    orderBy: [desc(applications.id)]
  });

  // 2. Fetch all active timelines
  const activeTimelines = await db.select().from(qmsTimelines);

  return (
    <div className="mt-10">
      <h2 className="text-xl font-bold mb-4 text-gray-700">Agency-Wide Live Tracking</h2>
      <div className="overflow-x-auto bg-white rounded-xl shadow border">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="p-4 text-xs font-bold uppercase text-gray-500">App #</th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500">Company</th>
              <th className="p-4 text-xs font-bold uppercase text-gray-500">Divisional Status</th>
            </tr>
          </thead>
          <tbody>
            {allApps.map(app => {
              const appTimelines = activeTimelines.filter(t => t.applicationId === app.id);
              
              return (
                <tr key={app.id} className="border-b hover:bg-gray-50">
                  <td className="p-4 font-mono text-sm">{app.applicationNumber}</td>
                  <td className="p-4 font-bold">{app.company?.name}</td>
                  <td className="p-4 flex gap-2">
                    {appTimelines.length > 0 ? (
                      appTimelines.map(t => (
                        <div key={t.id} className="flex flex-col items-center">
                          <span className={`text-[10px] px-2 py-1 rounded font-bold ${
                            t.endTime ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                          }`}>
                            {t.division}: {t.endTime ? 'Done' : 'In Progress'}
                          </span>
                        </div>
                      ))
                    ) : (
                      <span className="text-gray-300 text-xs italic">Not yet assigned</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}