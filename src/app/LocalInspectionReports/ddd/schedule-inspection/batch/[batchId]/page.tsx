import { db } from "@/db";
import { scheduleBatches, inspectionSchedules, inspectionTeamAssignments, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import ScheduleConsoleBatchClient from "@/components/LocalInspectionReports/ScheduleConsoleBatchClient";

interface PageProps {
  params: Promise<{ batchId: string }>;
}

export default async function EditInspectionBatchPage({ params }: PageProps) {
  const resolvedParams = await params;
  const batchId = resolvedParams?.batchId;

  if (!batchId) {
    notFound();
  }

  // 1. Fetch the Batch Record
  const batchRecord = await db.query.scheduleBatches.findFirst({
    where: eq(scheduleBatches.id, batchId),
  });

  if (!batchRecord) {
    notFound();
  }

  // 2. Fetch associated inspection schedules, team assignments, and facilities for this batch
  const schedulesList = await db.query.inspectionSchedules.findMany({
    where: eq(inspectionSchedules.batchId, batchId),
    with: {
      teamAssignments: true,
      application: {
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
      },
    },
  });

  // Extract already assigned facilities for this batch
  const assignedBatchFacilities = schedulesList
    .map(s => s.application?.facility)
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

  // Extract existing team assignments from schedule
  const existingTeam = schedulesList[0]?.teamAssignments || [];
  const teamLeaderAssignment = existingTeam.find(t => t.role === "TEAM_LEADER")?.inspectorId || "";
  const coInspectorAssignments = existingTeam.filter(t => t.role === "CO_INSPECTOR").map(t => t.inspectorId);
  const traineeAssignments = existingTeam.filter(t => t.role === "TRAINEE_INSPECTOR").map(t => t.inspectorId);

  // 3. Fetch all system users for the team matrix
  const rawUsers = await db.select().from(users);
  const initialUsers = (rawUsers || []).filter(Boolean).map(u => ({
    id: u.id,
    full_name: u.name || "Unnamed Officer",
    rank: u.rank || "ACRO",
    directorate: u.directorate || "VMAP",
    is_available: true,
  }));

  // 4. Fetch all qualified facilities for map and itinerary management
  const qualifiedApps = await db.query.applications.findMany({
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
      <div className="max-w-[98rem] mx-auto px-4 sm:px-6 lg:px-8 mb-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200 mb-2">
              ✏️ Managing Inspection Batch: {batchRecord.batchReference}
            </span>
            <h1 className="text-2xl font-black text-slate-900 tracking-tight">
              {batchRecord.title}
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Active Date Window: <span className="font-semibold text-slate-700">{batchRecord.startDate} to {batchRecord.endDate}</span> | Status: <span className="font-semibold text-indigo-600">{batchRecord.status}</span>
            </p>
          </div>
        </div>
      </div>

      <ScheduleConsoleBatchClient
        batchId={batchId}
        initialUsers={initialUsers}
        initialFacilities={initialFacilities}
        initialBatchData={{
          title: batchRecord.title,
          startDate: batchRecord.startDate,
          endDate: batchRecord.endDate,
          assignedFacilities: assignedBatchFacilities,
          teamLeader: teamLeaderAssignment,
          coInspectors: coInspectorAssignments,
          traineeInspectors: traineeAssignments,
        }}
      />
    </div>
  );
}