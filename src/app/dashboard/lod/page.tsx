export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { desc, inArray } from "drizzle-orm";
import LODMainWorkspace from "./LODMainWorkspace";

/**
 * LOD Dashboard Server Page
 * Fetches applications that have reached completion or archival status.
 */
export default async function LODPage() {
  // 1. Fetch COMPLETED dossiers
  // We explicitly include localApplicant and foreignFactory relations
  const completed = await db.query.applications.findMany({
    where: inArray(applications.currentPoint, ["COMPLETED", "Registry Archival"]),
    with: {
      localApplicant: true,   // Points to the companies table (Local Agent)
      foreignFactory: true,   // Points to the companies table (Manufacturer)
    },
    orderBy: [desc(applications.updatedAt)],
  });

  // 2. Map the DB data to the format expected by the LODArchive UI
  const formattedApps = completed.map((app) => {
    // Cast details for flexible access to JSONB keys
    const details = (app.details as any) || {};
    
    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      
      // ✅ Local Agent Name
      companyName: app.localApplicant?.name || "Unregistered Entity", 
      
      // ✅ Foreign Site Name
      foreignFactoryName: app.foreignFactory?.name || "Factory Not Specified",
      
      type: app.type,
      updatedAt: app.updatedAt,
      status: app.status,
      currentPoint: app.currentPoint,
      
      // ✅ Link to the PDF/Document in Supabase 'Documents' bucket
      certificateUrl: details.archived_path || null 
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pt-10">
      <div className="px-4 mb-8 max-w-6xl mx-auto">
        <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
          LOD Workspace
        </h1>
        <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
          Directorate of Veterinary Medicine and Allied Products (VMAP)
        </p>
      </div>

      <LODMainWorkspace completedApps={formattedApps} />
    </div>
  );
}