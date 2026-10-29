// @/app/LocalInspectionReports/ddd/schedule-inspection/[id]/page.tsx
import { db } from "@/db";
import { applications, companies, users, facilities, productLines, products } from "@/db/schema";
import { eq, and, asc } from "drizzle-orm";
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

  // 1. Fetch specific application and its linked facility using explicit joins
  const appRecords = await db
    .select({
      appId: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      companyName: companies.name,
      facilityId: facilities.id,
      facilityName: facilities.name,
      facilityAddress: facilities.address,
      facilityCountry: facilities.country,
      facilityLatitude: facilities.latitude,
      facilityLongitude: facilities.longitude,
      facilityType: facilities.facilityType,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(facilities, eq(applications.facilityId, facilities.id))
    .where(eq(applications.id, numericId))
    .limit(1);

  const targetApp = appRecords?.[0];
  if (!targetApp) {
    notFound();
  }

  // Sanitize the specific facility linked to this application
  const initialApplicationFacility = targetApp.facilityId ? {
    id: targetApp.facilityId,
    name: targetApp.facilityName || "Unknown Facility",
    address: targetApp.facilityAddress || "",
    country: targetApp.facilityCountry || "Unknown",
    latitude: targetApp.facilityLatitude ?? null,
    longitude: targetApp.facilityLongitude ?? null,
    facility_type: targetApp.facilityType || "Veterinary Pharmaceuticals",
    product_lines: [], // Populated below if needed, or fetched via dropdown filters
  } : null;

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

  // 3. Fetch qualified facilities for the dropdown filters using standard select queries
  const qualifiedFacilitiesRaw = await db
    .select({
      id: facilities.id,
      name: facilities.name,
      address: facilities.address,
      country: facilities.country,
      latitude: facilities.latitude,
      longitude: facilities.longitude,
      facilityType: facilities.facilityType,
    })
    .from(applications)
    .innerJoin(facilities, eq(applications.facilityId, facilities.id))
    .where(
      and(
        eq(applications.isDeskReview, false),
        eq(applications.currentPoint, "Report Approved and Archived"),
        eq(applications.status, "APPROVED_AND_ARCHIVED")
      )
    );

  const initialFacilities = qualifiedFacilitiesRaw.map(f => ({
    id: f.id,
    name: f.name || "Unknown Facility",
    address: f.address || "",
    country: f.country || "Unknown",
    latitude: f.latitude ?? null,
    longitude: f.longitude ?? null,
    facility_type: f.facilityType || "Veterinary Pharmaceuticals",
    product_lines: [],
  }));

  return (
    <div className="min-h-screen bg-slate-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 mb-2">
            📅 Foreign Inspection Mission Orchestrator
          </span>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
            Schedule Inspection Batch for Application #{targetApp.applicationNumber}
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Local Applicant Agent: <span className="font-semibold text-slate-700">{targetApp.companyName}</span>
          </p>
        </div>
      </div>

      <ScheduleConsoleClient
        applicationId={targetApp.appId.toString()}
        initialUsers={initialUsers}
        initialFacilities={initialFacilities}
        initialApplicationFacility={initialApplicationFacility}
      />
    </div>
  );
}