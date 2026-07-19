import { db } from "@/db";
import { applications, companies } from "@/db/schema";
import { eq, sql } from "drizzle-orm";
import { notFound } from "next/navigation";
import { ArrowLeft, Clock, Building2, ShieldAlert, FileSpreadsheet } from "lucide-react";
import Link from "next/link";
import React from "react";

export const dynamic = "force-dynamic";

// --- Sub-Components ---
function Timeline({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative border-l-2 border-slate-200 ml-4 pl-6 space-y-8">
      {children}
    </div>
  );
}

function TimelineEvent({ 
  time, 
  title, 
  children 
}: { 
  time: string; 
  title: string; 
  children: React.ReactNode 
}) {
  return (
    <div className="relative">
      {/* Visual Indicator Node */}
      <div className="absolute -left-[31px] top-1 bg-white border-2 border-indigo-600 rounded-full w-4 h-4 flex items-center justify-center z-10 shadow-sm" />
      
      <div className="mb-1 flex flex-col sm:flex-row sm:items-center justify-between gap-1">
        <h3 className="text-base font-bold text-slate-900 tracking-tight">{title}</h3>
        <time className="text-xs font-mono text-slate-400 bg-slate-100 px-2 py-0.5 rounded self-start sm:self-auto">
          {time}
        </time>
      </div>
      <div className="mt-2">{children}</div>
    </div>
  );
}
// -----------------------------------------------------------

// Database JSONB format structural shapes
interface RawCommentLog {
  text: string;
  action: string;
  toStep?: string;
  fromStep: string;
  actorId?: string;
  actorName: string;
  actorRole?: string;
  timestamp: string;
  assignedToId?: string;
}

interface HistoryLogsContainer {
  comments?: RawCommentLog[];
  assignedDivisions?: string[];
  notificationEmail?: string;
}

export default async function ApplicationAuditTrailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const appId = parseInt(id, 10);

  if (isNaN(appId)) notFound();

  // Fetch from DB using the correct column 'details' 
  const queryResult = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      type: applications.type,
      status: applications.status,
      currentPoint: applications.currentPoint,
      // Fetches applications.details safely, mapping it explicitly to the details key
      details: sql<any>`COALESCE(${sql.raw('applications.details')}, '{}'::jsonb)`,
      companyName: companies.name,
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, appId));

  const record = queryResult[0];

  if (!record) notFound();

  // Bulletproof Extraction: Safeguard against unexpected payloads or empty logs using record.details
  let container: HistoryLogsContainer = {};
  try {
    if (typeof record.details === "string") {
      container = JSON.parse(record.details);
    } else if (record.details && typeof record.details === "object") {
      container = record.details as unknown as HistoryLogsContainer;
    }
  } catch (e) {
    console.error("Failed to parse history logs structure:", e);
  }

  // Always enforce array default to avoid any unexpected downstream loops crashing
  const rawLogs = Array.isArray(container?.comments) ? container.comments : [];

  // Map database properties dynamically and calculate dynamic time gaps
  const auditLogs = rawLogs.map((log, index) => {
    let daysSpent = 0;
    
    if (index > 0 && log?.timestamp && rawLogs[index - 1]?.timestamp) {
      const current = new Date(log.timestamp).getTime();
      const previous = new Date(rawLogs[index - 1].timestamp).getTime();
      const diffMs = current - previous;
      // Convert millisecond gap to day units safely
      daysSpent = Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    // Extract jurisdictional information safely
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
  
  // Aggregate dynamic metrics from workflow calculations safely
  const totalDaysInWorkflow = auditLogs.reduce((acc, log) => acc + (log?.daysSpentAtDesk || 0), 0);

  return (
    <main className="p-8 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        
        {/* Navigation Breadcrumb */}
        <Link 
          href="/LocalInspectionReports/ddd/inbox" 
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 transition-colors mb-6"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Divisional Deputy Director Inbox
        </Link>

        {/* Application Core Meta Card */}
        <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm mb-6">
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
            
            {/* Operational Metrics Monitor */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
              <Clock className="w-5 h-5 text-indigo-600" />
              <div>
                <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">Total Velocity Log</p>
                <p className="text-sm font-bold text-slate-800">{totalDaysInWorkflow} Days Processed</p>
              </div>
            </div>
          </div>
        </div>

        {/* Flow History Title */}
        <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
          <FileSpreadsheet className="w-5 h-5 text-slate-500" /> Cross-Functional Action History
        </h2>

        {/* Visual Workflow Chronology Component Stack */}
        <div className="bg-white border border-slate-200 rounded-xl p-8 shadow-sm">
          {auditLogs.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-6">No historical records logged for this tracking number.</p>
          ) : (
            <Timeline>
              {auditLogs.map((log, index) => {
                const isCapaReversion = log.actionType.includes("REVERT") || log.stage.includes("CAPA");
                
                return (
                  <TimelineEvent 
                    key={index} 
                    time={log.timestamp} 
                    title={`${log.stage} — ${log.actionType}`}
                  >
                    <div className="space-y-2 text-slate-700">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="font-medium text-slate-900">Actor:</span> 
                        <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded font-medium">
                          {log.actorName} 
                        </span>
                        <span className="text-slate-400">|</span>
                        <span className="font-medium text-slate-900">Desk Jurisdiction:</span>
                        <span className="bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded font-bold">
                          {log.actorDivision}
                        </span>
                      </div>

                      {/* Conditional comment color styling */}
                      {log.comments && (
                        <div className={`p-3 rounded-lg text-sm border ${
                          isCapaReversion 
                            ? "bg-amber-50 border-amber-100 text-amber-900" 
                            : "bg-slate-50 border-slate-100 text-slate-800"
                        }`}>
                          {isCapaReversion && <ShieldAlert className="w-4 h-4 inline mr-1.5 align-text-bottom text-amber-600" />}
                          <strong>Notes:</strong> {log.comments}
                        </div>
                      )}

                      {/* Operational Velocity Data Label */}
                      <div className="text-[11px] text-slate-400 flex items-center gap-1 font-medium">
                        <Clock className="w-3 h-3 text-slate-300" /> 
                        {index === 0 
                          ? "Initial application entry created in system workflow." 
                          : `Retained at previous location for ${log.daysSpentAtDesk} days against scheduled timeline boundaries.`}
                      </div>
                    </div>
                  </TimelineEvent>
                );
              })}
            </Timeline>
          )}
        </div>

      </div>
    </main>
  );
}