export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq, desc, inArray } from "drizzle-orm";
import LODMainWorkspace from "./LODMainWorkspace";

export default async function LODPage() {
  // Fetch COMPLETED dossiers (those finalize by Director)
  const completed = await db.query.applications.findMany({
    where: inArray(applications.currentPoint, ["COMPLETED", "Registry Archival"]),
    with: {
      company: true,
    },
    orderBy: [desc(applications.updatedAt)],
});

  // Map the DB data to match the LODArchive requirements
  const formattedApps = completed.map(app => {
    const details = (app.details as any) || {};
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      companyName: app.company?.name || "Unregistered Entity",
      type: app.type,
      updatedAt: app.updatedAt,
      // ✅ Using the exact root key from your JSON object
      certificateUrl: details.archived_path || null 
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pt-10">
      <LODMainWorkspace completedApps={formattedApps} />
    </div>
  );
}