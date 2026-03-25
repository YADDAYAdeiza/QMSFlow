export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications } from "@/db/schema";
import { desc, or, eq } from "drizzle-orm";
import LODMainWorkspace from "./LODMainWorkspace";

/**
 * LOD Dashboard Server Page
 * Fetches applications and strictly separates Pass 1 (Clearance) from Pass 2 (Certificate).
 */
export default async function LODPage() {
  // 1. Fetch dossiers that are either CLEARED or at the Archival point
  const completed = await db.query.applications.findMany({
    where: or(
      eq(applications.status, "CLEARED"),
      eq(applications.currentPoint, "Registry Archival")
    ),
    with: {
      localApplicant: true,   
      foreignFactory: true,   
    },
    orderBy: [desc(applications.updatedAt)],
  });

  // 2. Map the DB data with strict deduplication for Pass 1 vs Pass 2
  const formattedApps = completed.map((app) => {
    const details = (app.details as any) || {};
    const comments = details.comments || [];

    // --- PASS 1: GMP CLEARANCE (Facility Verification) ---
    // Look for the specific key, then fallback to the technical sign-off attachment
    const pass1Clearance = 
      details.gmp_clearance_url || 
      comments.find((c: any) => c.action === "TECHNICAL_PASS_CLEARED")?.attachmentUrl || 
      null;

    // --- PASS 2: GMP CERTIFICATE (Full Issuance) ---
    // Logic: 
    // 1. Check for the dedicated gmp_certificate_url key.
    // 2. Only fallback to archived_path if status is 'CLEARED' AND it's not the same file as Pass 1.
    let pass2Certificate = details.gmp_certificate_url || null;

    if (!pass2Certificate && app.status === "CLEARED" && details.archived_path) {
      // Deduplication: Don't show Pass 2 if the file is just the Pass 1 clearance
      if (details.archived_path !== pass1Clearance) {
        pass2Certificate = details.archived_path;
      }
    }

    return {
      id: app.id,
      applicationNumber: app.applicationNumber,
      
      // Applicant Info
      companyName: app.localApplicant?.name || "Unregistered Entity", 
      
      // Metadata
      foreignFactoryName: app.foreignFactory?.name || "Factory Not Specified",
      type: app.type,
      updatedAt: app.updatedAt,
      status: app.status,
      currentPoint: app.currentPoint,
      
      // ✅ Disparate URLs: Only populated if they are unique and relevant to the stage
      clearanceUrl: pass1Clearance, 
      certificateUrl: pass2Certificate 
    };
  });

  return (
    <div className="min-h-screen bg-slate-50/50 pt-10">
      <div className="px-4 mb-8 max-w-6xl mx-auto">
        <header className="space-y-1">
          <h1 className="text-2xl font-black uppercase italic tracking-tighter text-slate-900">
            LOD Workspace
          </h1>
          <div className="flex items-center gap-2">
              <div className="h-1 w-8 bg-blue-600 rounded-full" />
              <p className="text-[10px] text-slate-400 font-black uppercase tracking-[0.2em]">
                Directorate of Veterinary Medicine and Allied Products (VMAP)
              </p>
          </div>
        </header>
      </div>

      <LODMainWorkspace completedApps={formattedApps} />
    </div>
  );
}