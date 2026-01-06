import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull, ilike } from "drizzle-orm";
import Link from "next/link";

export default async function StaffDashboard({ params }: { params: Promise<{ division: string }> }) {
  const { division } = await params;
  const myDivision = division.toUpperCase();

  // This query finds tasks assigned to THIS division at the TECHNICAL REVIEW stage
  const staffTasks = await db
    .select({
      id: qmsTimelines.id,
      applicationId: qmsTimelines.applicationId,
      startTime: qmsTimelines.startTime,
      point: qmsTimelines.point,
      applicationNumber: applications.applicationNumber,
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(
      and(
        ilike(qmsTimelines.division, myDivision),
        eq(qmsTimelines.point, 'Technical Review'), // Filter for the "Action" stage
        isNull(qmsTimelines.endTime),
        // FIX: Only show tasks assigned specifically to THIS person
        // eq(qmsTimelines.staffId, currentStaffId)
      )
    );

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">{myDivision} Staff Workspace</h1>
      <div className="grid gap-4">
        {staffTasks.map((task) => (
          <div key={task.id} className="bg-white p-6 rounded-xl shadow-sm border flex justify-between items-center">
            <div>
              <span className="text-xs font-mono font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                IN REVIEW
              </span>
              <h2 className="text-xl font-bold mt-2">{task.companyName}</h2>
              <p className="text-sm text-gray-500">App: {task.applicationNumber}</p>
            </div>

            <Link 
              href={`/dashboard/${division.toLowerCase()}/review/${task.applicationId}`}
              className="bg-blue-600 text-white px-6 py-2 rounded-lg font-bold"
            >
              Open Dossier
            </Link>
          </div>
        ))}
      </div>
    </div>
  );
}