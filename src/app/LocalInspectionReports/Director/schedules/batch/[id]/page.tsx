import { db } from "@/db";
import { 
  scheduleBatches, 
  inspectionSchedules, 
  applications, 
  companies,
  facilities,
  inspectionTeamAssignments, 
  users 
} from "@/db/schema";
import { eq, inArray, aliasedTable } from "drizzle-orm";
import { notFound } from "next/navigation";
import React from "react";
import Link from "next/link";
import { ArrowLeft, Printer } from "lucide-react";
import { format, parseISO } from "date-fns";
import BatchHistoryModal from "../../BatchHistoryModal";
import DirectorBatchActionModal from "../../DirectorBatchActionModal";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id?: string }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}

export default async function DirectorBatchDetailsPage({ params, searchParams }: PageProps) {
  // 1. Safely resolve Next.js 16 async dynamic route parameters
  const resolvedParams = await params?.catch(() => ({})) || {};
  const batchId = resolvedParams?.id;

  if (!batchId) {
    notFound();
  }

  // 2. Fetch Batch Record safely
  let rawBatch: any = null;
  try {
    const batchRows = await db
      .select({
        id: scheduleBatches.id,
        batchReference: scheduleBatches.batchReference,
        title: scheduleBatches.title,
        startDate: scheduleBatches.startDate,
        endDate: scheduleBatches.endDate,
        status: scheduleBatches.status,
        currentPoint: scheduleBatches.currentPoint,
        history: scheduleBatches.history,
        createdAt: scheduleBatches.createdAt,
        endorsedByName: users.name,
        isForeign: scheduleBatches.isForeign,
      })
      .from(scheduleBatches)
      .leftJoin(users, eq(scheduleBatches.endorsedBy, users.id))
      .where(eq(scheduleBatches.id, batchId))
      .limit(1);

    rawBatch = batchRows?.[0] || null;
  } catch (err) {
    console.error("CRITICAL: Batch fetch error ->", err);
  }

  if (!rawBatch) {
    notFound();
  }

  // Safely normalize history
  let safeHistory: any[] = [];
  try {
    const hist = rawBatch.history;
    if (typeof hist === "string") {
      const parsed = JSON.parse(hist);
      safeHistory = Array.isArray(parsed) ? parsed : [];
    } else if (Array.isArray(hist)) {
      safeHistory = hist;
    } else if (hist && typeof hist === "object") {
      safeHistory = [hist];
    }
  } catch {
    safeHistory = [];
  }

  const batch = {
    ...rawBatch,
    history: safeHistory,
    batchReference: rawBatch.batchReference || "",
    title: rawBatch.title || "",
  };

  // Create table aliases using aliasedTable
  const localCompanies = aliasedTable(companies, "local_companies");
  const foreignCompanies = aliasedTable(companies, "foreign_companies");

 // 3. Query inspection schedules with robust foreign & local fallbacks
  let rawSchedules: any[] = [];
  try {
    rawSchedules = await db
      .select({
        scheduleId: inspectionSchedules.id,
        scheduledDate: inspectionSchedules.scheduledDate,
        status: inspectionSchedules.status,
        localCompanyName: localCompanies.name,
        localCompanyAddress: localCompanies.address,
        foreignCompanyName: foreignCompanies.name,
        foreignCompanyAddress: foreignCompanies.address,
        facilityName: facilities.name,
        facilityAddress: facilities.address,
        facilityCountry: facilities.country,
        inspectionType: applications.type,
        appDetails: applications.details,
      })
      .from(inspectionSchedules)
      .leftJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
      .leftJoin(localCompanies, eq(applications.companyId, localCompanies.id))
      .leftJoin(foreignCompanies, eq(applications.foreignFactoryId, foreignCompanies.id))
      .leftJoin(facilities, eq(applications.facilityId, facilities.id))
      .where(eq(inspectionSchedules.batchId, batchId));
  } catch (err) {
    console.error("CRITICAL: Schedules fetch error ->", err);
  }

  const schedules = Array.isArray(rawSchedules) ? rawSchedules : [];

  const scheduleIds: string[] = [];
  for (const s of schedules) {
    if (s && s.scheduleId) {
      scheduleIds.push(s.scheduleId);
    }
  }

  // 4. Query team assignments safely
  const teamBySchedule: Record<
    string,
    { teamLeader?: string; coInspectors: string[]; trainees: string[] }
  > = {};

  if (scheduleIds.length > 0) {
    try {
      const rawAssignments = await db
        .select({
          scheduleId: inspectionTeamAssignments.scheduleId,
          role: inspectionTeamAssignments.role,
          inspectorName: users.name,
        })
        .from(inspectionTeamAssignments)
        .innerJoin(users, eq(inspectionTeamAssignments.inspectorId, users.id))
        .where(inArray(inspectionTeamAssignments.scheduleId, scheduleIds));

      const assignments = Array.isArray(rawAssignments) ? rawAssignments : [];

      for (const item of assignments) {
        if (!item || !item.scheduleId) continue;
        const sId = item.scheduleId;

        if (!teamBySchedule[sId]) {
          teamBySchedule[sId] = { coInspectors: [], trainees: [] };
        }

        const name = item.inspectorName || "Unknown Inspector";

        if (item.role === "TEAM_LEADER") {
          teamBySchedule[sId].teamLeader = name;
        } else if (item.role === "TRAINEE_INSPECTOR") {
          teamBySchedule[sId].trainees.push(name);
        } else {
          teamBySchedule[sId].coInspectors.push(name);
        }
      }
    } catch (err) {
      console.error("CRITICAL: Assignments fetch error ->", err);
    }
  }

  const isApproved = batch.status === "INSPECTION_SCHEDULED";
  const isPendingApproval = batch.status === "PENDING_APPROVAL" || batch.status === "DRAFT" || batch.status === "PENDING_RECOMMENDATION";

  const formattedHeaderDate =
    batch.startDate && batch.endDate
      ? `${format(parseISO(String(batch.startDate)), "do MMM yyyy")} TO ${format(
          parseISO(String(batch.endDate)),
          "do MMM yyyy"
        )}`
      : "SCHEDULE PERIOD";

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white text-black font-sans">
      {/* Action Header Controls for Director */}
      <div className="max-w-5xl mx-auto mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200 flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/LocalInspectionReports/Director/schedule/inbox"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Director Inbox
          </Link>
          <span
            className={`px-2.5 py-0.5 rounded text-[11px] font-bold border ${
              batch.isForeign
                ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                : "bg-slate-100 text-slate-700 border-slate-200"
            }`}
          >
            {batch.isForeign ? "GMP Foreign Inspection" : "Local Inspection"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <BatchHistoryModal
            batchReference={batch.batchReference}
            title={batch.title}
            history={batch.history}
          />

          {isPendingApproval && (
            <DirectorBatchActionModal batchId={batch.id} title={batch.title} />
          )}

          <a
            href="javascript:window.print()"
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-md flex items-center gap-2 shadow-xs cursor-pointer ml-2"
          >
            <Printer className="w-4 h-4" /> Print Schedule Sheet
          </a>
        </div>
      </div>

      {/* Official Annexure Sheet Container */}
      <div className="max-w-5xl mx-auto bg-white p-6 border border-slate-300 shadow-sm print:shadow-none print:border-none print:p-0">
        
        {/* Annexure Top Metadata Banner */}
        <div className="border border-black text-xs font-bold flex justify-between divide-x divide-black mb-4">
          <div className="p-1.5 flex-1 text-left">Annexure No. 08</div>
          <div className="p-1.5 flex-1 text-center">SOP Ref No. VMAP-015-01</div>
          <div className="p-1.5 flex-1 text-right">
            Title of Annexure: {batch.isForeign ? "GMP Foreign Inspection Schedule" : "Inspection Schedule"}
          </div>
        </div>

        {/* NAFDAC Logo & Title Header */}
        <div className="text-center my-4 space-y-2">
          <div className="flex justify-center mb-1">
            <img
              src="/nafdac_logo2-removebg-preview.png"
              alt="NAFDAC Logo"
              className="w-[70px] h-[70px] object-contain"
            />
          </div>
          <h2 className="text-base font-extrabold tracking-wide uppercase">
            VMAP {batch.isForeign ? "GMP (FOREIGN)" : "LOCAL"} INSPECTION SCHEDULE FOR {formattedHeaderDate}
          </h2>
          <div className="text-xs text-slate-500 font-mono">
            Ref: {batch.batchReference || "N/A"}
          </div>
        </div>

        {/* Schedule Table */}
        <table className="w-full border-collapse border border-black text-xs">
          <thead>
            <tr className="border-b border-black text-center font-bold uppercase bg-slate-50 print:bg-transparent">
              <th className="border-r border-black p-2 w-10">S/N</th>
              <th className="border-r border-black p-2 w-1/4">NAMES AND ADDRESS OF COMPANY / SITE</th>
              <th className="border-r border-black p-2 w-1/5">PURPOSE/TYPES OF INSPECTION</th>
              <th className="border-r border-black p-2 w-1/3">NAME OF INSPECTORS</th>
              <th className="border-r border-black p-2 w-32">DATE OF INSPECTION</th>
              <th className="p-2 w-24">DRIVER / LOGISTICS</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                  No inspection schedules linked to this batch reference.
                </td>
              </tr>
            ) : (
              schedules.map((row, index) => {
                const team = teamBySchedule[row.scheduleId] || {
                  coInspectors: [],
                  trainees: [],
                };

                let schDetails: any = {};
                try {
                  if (typeof row.scheduleDetails === "string") {
                    schDetails = JSON.parse(row.scheduleDetails);
                  } else if (row.scheduleDetails && typeof row.scheduleDetails === "object") {
                    schDetails = row.scheduleDetails;
                  }
                } catch {
                  schDetails = {};
                }

                let appDetails: any = {};
                try {
                  if (typeof row.appDetails === "string") {
                    appDetails = JSON.parse(row.appDetails);
                  } else if (row.appDetails && typeof row.appDetails === "object") {
                    appDetails = row.appDetails;
                  }
                } catch {
                  appDetails = {};
                }

                const companyName =
                  schDetails.companyName ||
                  schDetails.facilityName ||
                  appDetails.facilityName ||
                  row.foreignCompanyName ||
                  row.facilityName ||
                  row.localCompanyName ||
                  appDetails.companyName ||
                  "N/A";

                const address =
                  schDetails.facilityAddress ||
                  schDetails.siteAddress ||
                  row.facilityAddress ||
                  appDetails.facilityAddress ||
                  row.foreignCompanyAddress ||
                  row.localCompanyAddress ||
                  appDetails.companyAddress ||
                  "N/A";

                const inspectionType =
                  schDetails.inspectionType ||
                  row.inspectionType ||
                  appDetails.type ||
                  appDetails.inspectionType ||
                  (batch.isForeign ? "FOREIGN GMP INSPECTION" : "ROUTINE INSPECTION");

                const driverName =
                  schDetails.assignedDriver ||
                  schDetails.driver ||
                  appDetails.assignedDriver ||
                  (batch.isForeign ? "FLIGHT / EXECUTIVE SHUTTLE" : "DAN BABA");

                return (
                  <tr key={row.scheduleId || index} className="border-b border-black align-top">
                    <td className="border-r border-black p-2 text-center font-bold">
                      {index + 1}.
                    </td>
                    <td className="border-r border-black p-2 uppercase font-semibold">
                      <div>{companyName}</div>
                      <div className="text-[11px] font-normal text-slate-700 mt-1">
                        {address} {row.facilityCountry ? `(${row.facilityCountry})` : ""}
                      </div>
                    </td>
                    <td className="border-r border-black p-2 uppercase font-medium">
                      {inspectionType}
                    </td>
                    <td className="border-r border-black p-2 uppercase">
                      <div className="space-y-1">
                        {team.teamLeader && (
                          <div className="font-semibold flex justify-between items-center pr-1">
                            <span>{team.teamLeader}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(TL)</span>
                          </div>
                        )}
                        {Array.isArray(team.coInspectors) && team.coInspectors.map((name, i) => (
                          <div key={i} className="font-semibold flex justify-between items-center pr-1">
                            <span>{name}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Co-Inspector)</span>
                          </div>
                        ))}
                        {Array.isArray(team.trainees) && team.trainees.map((name, i) => (
                          <div key={i} className="font-semibold flex justify-between items-center pr-1">
                            <span>{name}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Trainee)</span>
                          </div>
                        ))}
                        {!team.teamLeader && (!team.coInspectors || team.coInspectors.length === 0) && (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="border-r border-black p-2 text-center font-bold">
                      {row.scheduledDate ? String(row.scheduledDate) : "N/A"}
                    </td>
                    <td className="p-2 text-center font-semibold uppercase">
                      {driverName}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Official Endorsement & Approval Signature Footer */}
        <div className="mt-12 pt-4 flex justify-between items-end text-xs font-bold px-8">
          <div className="text-center space-y-1">
            <p className="uppercase mb-2">ENDORSED BY</p>
            <div className="h-14 flex items-end justify-center">
              <img
                src="/Signature-removebg-preview.png"
                alt="Endorsement Signature"
                className="object-contain max-h-12"
              />
            </div>
            <div className="border-b border-black w-48 mx-auto mb-1"></div>
            <p className="uppercase">
              {batch.endorsedByName || "Pharm (Mrs.) Uba Florence"}
            </p>
            <p className="text-[11px] font-normal">Divisional Deputy Director</p>
          </div>

          <div className="text-center space-y-1">
            <p className="uppercase mb-2">APPROVED BY</p>
            <div className="h-14 flex items-end justify-center">
              {isApproved ? (
                <img
                  src="/MudSig-removebg-preview.png"
                  alt="Director Approval Signature"
                  className="object-contain max-h-12"
                />
              ) : (
                <span className="text-[10px] text-slate-400 italic mb-1 print:hidden">
                  [Pending Director Approval]
                </span>
              )}
            </div>
            <div className="border-b border-black w-52 mx-auto mb-1"></div>
            <p className="uppercase">Agboola Waheed</p>
            <p className="text-[11px] font-normal">D(VMAP)</p>
          </div>
        </div>

      </div>
    </main>
  );
}