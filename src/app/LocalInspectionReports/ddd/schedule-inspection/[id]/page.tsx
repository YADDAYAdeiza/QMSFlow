// @/app/LocalInspectionReports/ddd/schedule-inspection/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, users } from "@/db/schema";
import { eq, and } from "drizzle-orm";
import { notFound } from "next/navigation";
import ScheduleConsoleClient from "@/components/LocalInspectionReports/ScheduleConsoleClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ScheduleInspectionPage({ params }: PageProps) {
  const resolvedParams = await params;
  const numericId = Number(resolvedParams?.id);
  
  if (isNaN(numericId)) {
    notFound();
  }

  // 1. Fetch specific application and associated local company safely
  const appRecord = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      companyName: companies.name,
      details: applications.details,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, numericId))
    .limit(1);

  const application = appRecord?.[0];
  if (!application) {
    notFound();
  }

  // 2. Fetch all system users safely
  const rawUsers = await db
    .select({
      id: users.id,
      name: users.name,
      rank: users.rank,
      directorate: users.directorate,
    })
    .from(users);

  const initialUsers = (rawUsers || []).filter(Boolean).map(u => ({
    id: u.id,
    name: u.name || "Unnamed Officer",
    rank: u.rank || "ACRO",
    directorate: u.directorate || "VMAP",
  }));

  // 3. Fetch qualified applications with nested facility, product lines, and products
  const qualifiedApps = await db.query.applications.findMany({
    where: and(
      eq(applications.isDeskReview, false),
      eq(applications.currentPoint, "Report Approved and Archived"),
      eq(applications.status, "APPROVED_AND_ARCHIVED")
    ),
    with: {
      facility: {
        with: {
          productLines: {
            with: {
              products: true,
            },
          },
        },
      },
    },
  });

  // Extract and sanitize facilities with their complete product line structures
  const initialFacilities = qualifiedApps
    .map(app => app.facility)
    .filter(Boolean)
    .map(f => ({
      id: f!.id,
      name: f!.name || "Unknown Facility",
      address: f!.address || "",
      country: f!.country || "Unknown",
      latitude: f!.latitude ?? null,
      longitude: f!.longitude ?? null,
      facility_type: f!.facilityType || "Veterinary Pharmaceuticals",
      product_lines: (f!.productLines || []).map(line => ({
        id: line.id,
        name: line.name,
        sterility_level: line.sterilityLevel,
        containment_category: line.containmentCategory,
        is_dedicated_line: line.isDedicatedLine,
        products: (line.products || []).map(p => ({
          id: p.id,
          name: p.name,
          classification: p.classification,
          target_species: p.targetSpecies,
          vmd_approved: p.vmdApproved,
        })),
      })),
    }));

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            📅 Foreign Inspection Mission Orchestrator
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Schedule Inspection Batch for Application #{application.applicationNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Local Applicant Agent: <span className="font-semibold text-slate-700">{application.companyName}</span>
          </p>
        </div>
      </div>

      <ScheduleConsoleClient
        applicationId={application.id.toString()}
        initialUsers={initialUsers}
        initialFacilities={initialFacilities}
      />
    </div>
  );
}