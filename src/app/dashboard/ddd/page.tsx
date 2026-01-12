import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull, ilike } from "drizzle-orm"; // ilike is case-insensitive
import StaffSelector from "@/components/StaffSelector";

export default async function DDDInboxPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ div?: string }> 
}) {
  const resolvedParams = await searchParams;
  const myDivision = (resolvedParams.div || "VMD").toUpperCase(); // Force Uppercase

  // JOIN Query with flexible filtering
  const myTasks = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      point: qmsTimelines.point,
      division: qmsTimelines.division,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        // ilike handles VMD vs vmd. isNull(endTime) ensures it's still active.
        ilike(qmsTimelines.division, myDivision),
        isNull(qmsTimelines.endTime),
          // ADD THIS LINE:
        eq(qmsTimelines.point, 'Divisional Deputy Director')
      )
    );

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-2xl font-bold mb-6 text-gray-800 border-b pb-4">
          {myDivision} Assignment Hub
        </h1>
        
        {/* DEBUG SECTION - Remove this once it works */}
        {myTasks.length === 0 && (
          <div className="mb-8 p-4 bg-yellow-50 border border-yellow-200 rounded text-xs font-mono">
            <p className="font-bold mb-2">Debug Info:</p>
            <p>Target Division: {myDivision}</p>
            <p>If you see this, check Supabase 'qms_timelines' table. 
               Does a row exist with division: '{myDivision}' and end_time: NULL?</p>
          </div>
        )}

        <div className="space-y-4">
          {myTasks.map((task) => (
            <div key={task.id} className="p-5 bg-white shadow-sm rounded-xl border flex justify-between items-center">
              <div>
                <span className="text-xs font-mono font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded">
                    {task.applicationNumber}
                </span>
                <h3 className="font-bold text-lg text-gray-900">{task.companyName}</h3>
                <p className="text-sm text-gray-500">{task.type}</p>
                <p className="text-[10px] text-gray-400 mt-2 uppercase">
                  Point: {task.point} | Started: {task.startTime?.toLocaleString()}
                </p>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border">
                <a 
                  href={`/dashboard/ddd/review/${task.applicationId}`}
                  className="mt-4 inline-block text-xs font-bold text-blue-600 hover:text-blue-800 underline"
                >
                  OPEN FULL REVIEW & DOSSIER →
                </a>
              </div>
              
              <div className="bg-gray-50 p-4 rounded-lg border">
                <StaffSelector 
                  appId={task.applicationId!} 
                  division={myDivision} 
                />
              </div>
            </div>
          ))}

          {myTasks.length === 0 && (
            <div className="text-center py-12 bg-white rounded-xl border border-dashed text-gray-400">
              No pending assignments found.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}