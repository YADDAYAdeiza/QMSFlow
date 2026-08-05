import { db } from "@/db";
import { applications, companies, capaSubmissions } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Building2, ShieldAlert, FileSpreadsheet, HardHat, FileText } from "lucide-react";
import Link from "next/link";
import React from "react";

export const dynamic = "force-dynamic";

function Timeline({ children }: { children: React.ReactNode }) {
  return <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">{children}</div>;
}

function TimelineEvent({ time, title, children }: { time: string; title: string; children: React.ReactNode }) {
  return (
    <div className="relative">
      <div className="absolute -left-[31px] top-1 bg-white border-2 border-indigo-600 rounded-full w-4 h-4 flex items-center justify-center z-10 shadow-sm" />
      <div className="mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
        <time className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded self-start sm:self-auto">{time}</time>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}

interface RawCommentLog {
  text: string;
  action: string;
  toStep?: string;
  fromStep: string;
  actorName: string;
  timestamp: string;
}

interface HistoryLogsContainer {
  comments?: RawCommentLog[];
}

// Structuring Industry-Agency shapes from user input
interface CapaItem {
  id: string;
  status: string;
  severity: string;
  timeline: string;
  observation: string;
  rootCause: string;
  correction: string;
  correctiveAction: string;
  responsibility: string;
  inspectorStatus: string;
  inspectorRemarks: string;
  uploadedEvidenceUrl?: string;
}

export default async function ApplicationAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appId = parseInt(id, 10);
  if (isNaN(appId)) notFound();

  const queryResult = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      status: applications.status,
      currentPoint: applications.currentPoint,
      details: sql<any>`COALESCE(${sql.raw('applications.details')}, '{}'::jsonb)`,
      companyName: companies.name,
      capaItemsRaw: capaSubmissions.capaItems,
      capaSubmittedAt: capaSubmissions.submittedAt,
      capaVerifiedStatus: capaSubmissions.status
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(capaSubmissions, eq(applications.id, capaSubmissions.applicationId))
    .where(eq(applications.id, appId));

  const record = queryResult[0];
  if (!record) notFound();

  // 1. Process Internal Agency Banter
  let container: HistoryLogsContainer = {};
  try {
    if (typeof record.details === "string") container = JSON.parse(record.details);
    else if (record.details) container = record.details;
  } catch (e) {
    console.error("Failed parsing internal logs:", e);
  }
  const rawLogs = Array.isArray(container?.comments) ? container.comments : [];

  const internalAuditLogs = rawLogs.map((log, index) => {
    let daysSpent = 0;
    if (index > 0 && log?.timestamp && rawLogs[index - 1]?.timestamp) {
      const diffMs = new Date(log.timestamp).getTime() - new Date(rawLogs[index - 1].timestamp).getTime();
      daysSpent = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }
    let division = "VMD";
    if (log?.actorName?.includes("(IRSD)")) division = "IRSD";
    else if (log?.actorName?.includes("(PAD)")) division = "PAD";
    else if (log?.actorName?.includes("(AFPD)")) division = "AFPD";

    return {
      timestamp: log?.timestamp ? new Date(log.timestamp).toLocaleString() : "Unknown Date",
      stage: log?.fromStep || "System Core",
      actorName: log?.actorName || "System Process",
      actorDivision: division,
      actionType: log?.action || "FORWARD",
      comments: log?.text || "",
      daysSpentAtDesk: daysSpent
    };
  });

  const totalDaysInWorkflow = internalAuditLogs.reduce((acc, log) => acc + (log?.daysSpentAtDesk || 0), 0);

  // 2. Process Industry-Agency Banter
  let industryCapaLogs: CapaItem[] = [];
  if (record.capaItemsRaw) {
    try {
      industryCapaLogs = typeof record.capaItemsRaw === "string" 
        ? JSON.parse(record.capaItemsRaw) 
        : record.capaItemsRaw;
    } catch (e) {
      console.error("Failed parsing industry CAPA JSON structure:", e);
    }
  }

  return (
    <main className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <Link 
          href="/LocalInspectionReports/ddd/inbox" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Divisional Deputy Director Inbox
        </Link>

        {/* Top Meta Details Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3">
                <span className="text-xs font-bold uppercase tracking-wider bg-slate-900 text-white px-2.5 py-1 rounded">
                  {record.type}
                </span>
                <span className="font-mono text-sm font-semibold text-slate-500">
                  Ref: {record.applicationNumber}
                </span>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 mt-2 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-slate-400" /> {record.companyName}
              </h1>
            </div>
            
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Internal Velocity Log</p>
                <p className="text-sm font-bold text-slate-800">{totalDaysInWorkflow} Days Processed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Two Independent Audit Columns */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          
          {/* Column A: Internal Agency Banter */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 border-b pb-2 border-slate-200">
              <FileSpreadsheet className="w-5 h-5 text-indigo-600" /> Internal Agency Banter
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm min-h-[400px]">
              {internalAuditLogs.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-6">No internal records found.</p>
              ) : (
                <Timeline>
                  {internalAuditLogs.map((log, index) => {
                    const isReversion = log.actionType.includes("REVERT");
                    return (
                      <TimelineEvent key={index} time={log.timestamp} title={`${log.stage} — ${log.actionType}`}>
                        <div className="space-y-2 text-slate-700 text-xs">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">{log.actorName}</span>
                            <span className="text-slate-400">|</span>
                            <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">{log.actorDivision}</span>
                          </div>
                          {log.comments && (
                            <div className={`p-2.5 rounded border text-sm ${isReversion ? "bg-amber-50 border-amber-100 text-amber-900" : "bg-slate-50 border-slate-100 text-slate-800"}`}>
                              <strong>Notes:</strong> {log.comments}
                            </div>
                          )}
                        </div>
                      </TimelineEvent>
                    );
                  })}
                </Timeline>
              )}
            </div>
          </div>

          {/* Column B: Industry-Agency Banter (CAPA Actions) */}
          <div className="space-y-4">
            <h2 className="text-lg font-bold text-slate-900 mb-2 flex items-center gap-2 border-b pb-2 border-slate-200">
              <HardHat className="w-5 h-5 text-emerald-600" /> Industry-Agency Banter (CAPA Items)
            </h2>
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6 min-h-[400px]">
              {industryCapaLogs.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-12">
                  No active CAPA items or industry corrections have been recorded for this application profile.
                </p>
              ) : (
                <div className="space-y-6">
                  {record.capaSubmittedAt && (
                    <div className="text-xs text-slate-400 bg-emerald-50 text-emerald-800 border border-emerald-100 p-2.5 rounded-lg flex justify-between">
                      <span><strong>CAPA Cycle Status:</strong> {record.capaVerifiedStatus}</span>
                      <span><strong>Submitted:</strong> {new Date(record.capaSubmittedAt).toLocaleDateString()}</span>
                    </div>
                  )}

                  {industryCapaLogs.map((item) => (
                    <div key={item.id} className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 space-y-3">
                      <div className="flex justify-between items-start gap-2 border-b pb-2">
                        <div>
                          <span className="text-xs font-bold text-slate-400 uppercase tracking-wide">Observation</span>
                          <p className="text-sm font-semibold text-slate-900">{item.observation || "Unspecified deficiency"}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold uppercase ${item.severity === "Critical" ? "bg-rose-100 text-rose-800" : "bg-amber-100 text-amber-800"}`}>
                          {item.severity}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-slate-700">
                        <div className="bg-white p-2.5 rounded border border-slate-100 shadow-2xs">
                          <strong className="text-amber-700 block mb-1">🏭 Facility Defection & Root Cause:</strong>
                          <p className="whitespace-pre-wrap italic">{item.rootCause || "None provided"}</p>
                          <strong className="text-slate-700 block mt-2 mb-1">Correction Implemented:</strong>
                          <p className="whitespace-pre-wrap">{item.correction}</p>
                        </div>

                        <div className="bg-white p-2.5 rounded border border-slate-100 shadow-2xs">
                          <strong className="text-indigo-700 block mb-1">🔬 Inspector Audit Remarks:</strong>
                          <p className="whitespace-pre-wrap italic bg-indigo-50/40 p-1.5 rounded text-slate-900">{item.inspectorRemarks || "Awaiting evaluation"}</p>
                          <div className="mt-2 flex justify-between text-[11px]">
                            <span>Status: <strong>{item.inspectorStatus}</strong></span>
                            <span>Sign-Off: <strong>{item.responsibility}</strong></span>
                          </div>
                        </div>
                      </div>

                      {item.uploadedEvidenceUrl && (
                        <div className="pt-1 text-right">
                          <a 
                            href={item.uploadedEvidenceUrl} 
                            target="_blank" 
                            rel="noreferrer" 
                            className="inline-flex items-center gap-1.5 text-xs text-blue-600 hover:underline font-medium"
                          >
                            <FileText className="w-3.5 h-3.5" /> View Uploaded Evidence PDF
                          </a>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      </div>
    </main>
  );
}