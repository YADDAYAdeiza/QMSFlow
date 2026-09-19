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
import { eq, inArray } from "drizzle-orm";
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

export default async function DirectorBatchDetailsPage(props: PageProps) {
  const paramsPromise = props?.params ? props.params : Promise.resolve({});
  const searchParamsPromise = props?.searchParams ? props.searchParams : Promise.resolve({});

  const [resolvedParams] = await Promise.all([
    paramsPromise,
    searchParamsPromise,
  ]);

  const batchId = resolvedParams?.id;

  if (!batchId) {
    notFound();
  }

  // 1. Fetch Batch Record joined with endorser details
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
    })
    .from(scheduleBatches)
    .leftJoin(users, eq(scheduleBatches.endorsedBy, users.id))
    .where(eq(scheduleBatches.id, batchId))
    .limit(1);

  const batch = batchRows && batchRows.length > 0 ? batchRows[0] : null;

  if (!batch) {
    notFound();
  }

  // 2. Query inspection schedules joined with applications, companies, and facilities
  const rawSchedules = await db
    .select({
      scheduleId: inspectionSchedules.id,
      scheduledDate: inspectionSchedules.scheduledDate,
      status: inspectionSchedules.status,
      companyName: companies.name,
      companyAddress: companies.address,
      facilityAddress: facilities.address,
      inspectionType: applications.type,
      details: applications.details,
    })
    .from(inspectionSchedules)
    .innerJoin(applications, eq(inspectionSchedules.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(facilities, eq(applications.facilityId, facilities.id))
    .where(eq(inspectionSchedules.batchId, batchId));

  const schedules = Array.isArray(rawSchedules) ? rawSchedules : [];

  const scheduleIds: string[] = [];
  for (const s of schedules) {
    if (s && s.scheduleId) {
      scheduleIds.push(s.scheduleId);
    }
  }

  // 3. Query and map team assignments with roles
  const teamBySchedule: Record<
    string,
    { teamLeader?: string; coInspectors: string[]; trainees: string[] }
  > = {};

  if (scheduleIds.length > 0) {
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
  }

  const isApproved = batch.status === "APPROVED";

  const formattedHeaderDate =
    batch.startDate && batch.endDate
      ? `${format(parseISO(String(batch.startDate)), "do MMM yyyy")} - ${format(
          parseISO(String(batch.endDate)),
          "do MMM yyyy"
        )}`
      : "SCHEDULE PERIOD";

  return (
    <main className="min-h-screen bg-slate-100 p-4 print:p-0 print:bg-white text-black font-sans">
      {/* Action Header Controls for Director (Hidden during printing) */}
      <div className="max-w-5xl mx-auto mb-6 p-4 bg-white rounded-lg shadow-md border border-slate-200 flex flex-wrap justify-between items-center gap-4 print:hidden">
        <div className="flex items-center gap-3">
          <Link
            href="/LocalInspectionReports/Director/schedule/inbox"
            className="text-xs font-semibold text-slate-600 hover:text-slate-900 flex items-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Director Inbox
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <BatchHistoryModal
            batchReference={batch.batchReference}
            title={batch.title}
            history={batch.history as any}
          />

          {batch.status === "PENDING_APPROVAL" && (
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
          <div className="p-1.5 flex-1 text-right">Title of Annexure: Inspection Schedule</div>
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
            VMAP INSPECTION SCHEDULE FOR {formattedHeaderDate}
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
              <th className="border-r border-black p-2 w-1/4">NAMES AND ADDRESS OF COMPANY</th>
              <th className="border-r border-black p-2 w-1/5">PURPOSE/TYPES OF INSPECTION</th>
              <th className="border-r border-black p-2 w-1/3">NAME OF INSPECTORS</th>
              <th className="border-r border-black p-2 w-32">DATE OF INSPECTION</th>
              <th className="p-2 w-24">DRIVER</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black">
            {schedules.length === 0 ? (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500 italic">
                  No inspection schedules linked to this batch reference ({batchId}).
                </td>
              </tr>
            ) : (
              schedules.map((row, index) => {
                const team = teamBySchedule[row.scheduleId] || {
                  coInspectors: [],
                  trainees: [],
                };
                const address = row.facilityAddress || row.companyAddress || row.details?.companyAddress || "N/A";

                return (
                  <tr key={row.scheduleId} className="border-b border-black align-top">
                    <td className="border-r border-black p-2 text-center font-bold">
                      {index + 1}.
                    </td>
                    <td className="border-r border-black p-2 uppercase font-semibold">
                      <div>{row.companyName || "N/A"}</div>
                      <div className="text-[11px] font-normal text-slate-700 mt-1">
                        {address}
                      </div>
                    </td>
                    <td className="border-r border-black p-2 uppercase font-medium">
                      {row.inspectionType || "ROUTINE INSPECTION"}
                    </td>
                    <td className="border-r border-black p-2 uppercase">
                      <div className="space-y-1">
                        {team.teamLeader && (
                          <div className="font-semibold flex justify-between items-center pr-1">
                            <span>{team.teamLeader}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(TL)</span>
                          </div>
                        )}
                        {team.coInspectors.map((name, i) => (
                          <div key={i} className="font-semibold flex justify-between items-center pr-1">
                            <span>{name}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Co-Inspector)</span>
                          </div>
                        ))}
                        {team.trainees.map((name, i) => (
                          <div key={i} className="font-semibold flex justify-between items-center pr-1">
                            <span>{name}</span>
                            <span className="text-[10px] font-normal text-slate-600 lowercase italic">(Trainee)</span>
                          </div>
                        ))}
                        {!team.teamLeader && team.coInspectors.length === 0 && (
                          <span className="text-slate-400 italic">Unassigned</span>
                        )}
                      </div>
                    </td>
                    <td className="border-r border-black p-2 text-center font-bold">
                      {row.scheduledDate ? String(row.scheduledDate) : "N/A"}
                    </td>
                    <td className="p-2 text-center font-semibold uppercase">
                      {row.details?.assignedDriver || "DAN BABA"}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>

        {/* Official Endorsement & Approval Signature Footer */}
        <div className="mt-12 pt-4 flex justify-between items-end text-xs font-bold px-8">
          {/* Endorsed By Block */}
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

          {/* Approved By Block */}
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
            <p className="uppercase">MUDASHIRU, I. A.</p>
            <p className="text-[11px] font-normal">DDi/c</p>
          </div>
        </div>

      </div>
    </main>
  );
}