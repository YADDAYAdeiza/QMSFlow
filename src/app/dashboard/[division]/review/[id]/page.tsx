import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull, asc } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import AuditTrail from "@/components/AuditTrail"; 
import { notFound } from "next/navigation";
import { MessageSquare, History, ShieldCheck } from "lucide-react"; 

export default async function TechnicalReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string; id: string }> 
}) {
  const { division, id } = await params;
  const applicationId = parseInt(id);

  // 1. Current Staff ID (Static for Vibe-Coding/Testing phase)
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 2. Fetch the Application with Company data
  const appData = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details, 
      status: applications.status,
      currentPoint: applications.currentPoint,
      companyName: companies.name,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  const app = appData[0];
  if (!app) return notFound();

  // 3. Extract Unified Comments & Latest Directive
  const details = (app.details as any) || {};
  const commentsTrail = details.comments || [];

  // Get the very last instruction sent to staff (either from Assignment or Rework)
  const latestDirective = [...commentsTrail]
    .reverse()
    .find(c => c.action === "ASSIGNED_TO_STAFF" || c.action === "RETURNED_FOR_REWORK")?.text;

  // 4. QMS Clock Logic
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(asc(qmsTimelines.startTime));

  const activeTask = allSegments.find(s => s.endTime === null && s.staffId === currentStaffId);

  // Safety Gate: If this staff member shouldn't be here, show out-of-scope
  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 font-mono">
        <div className="text-center p-12 bg-white rounded-3xl border border-slate-200 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic">Task Out of Scope</h2>
          <p className="text-slate-500 text-sm mt-2">This application is no longer at your desk.</p>
        </div>
      </div>
    );
  }

  // Calculate used time for this specific staff member's total involvement
  const secondsAlreadyUsed = allSegments
    .filter(s => s.staffId === currentStaffId)
    .reduce((acc, segment) => {
      if (segment.startTime && segment.endTime) {
        return acc + Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000);
      }
      return acc;
    }, 0);

  const QMS_LIMIT_SECONDS = 48 * 60 * 60; // 48 Hours
  const totalRemainingSeconds = QMS_LIMIT_SECONDS - secondsAlreadyUsed;

  // 5. Dossier Fetching (Using Supabase 'Documents' bucket)
  const rawUrl = details.poaUrl || "";
  const dossierFilename = rawUrl.split('/').pop() || "";
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(dossierFilename);
  const finalPdfUrl = dossierFilename ? urlData.publicUrl : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      {/* LEFT: PDF VIEWER (2/3 Screen) */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative">
        {finalPdfUrl ? (
          <iframe 
            src={`${finalPdfUrl}#view=FitH&toolbar=0`} 
            className="w-full h-full border-none"
            title="Dossier Viewer"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400 font-black uppercase text-[10px] tracking-widest">
            Document Not Found
          </div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL (1/3 Screen) */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        
        <div className="p-8 pb-32"> {/* Bottom padding for sticky footer */}
          
          {/* HEADER SECTION */}
          <div className="mb-6 pb-6 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
                {division.toUpperCase()} Division
              </span>
              {app.status === 'PENDING_REWORK' && (
                 <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-widest animate-pulse">
                  Rework Session
                </span>
              )}
            </div>
            <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Technical Review</h1>
            <p className="text-xs font-mono text-blue-600 font-bold">{app.applicationNumber}</p>
            <p className="text-sm font-bold text-slate-500 mt-1">{app.companyName}</p>
          </div>

          {/* LATEST DIRECTIVE ALERT BOX */}
          {latestDirective && (
            <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl shadow-sm">
              <div className="flex items-center gap-2 mb-1">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Current Directive</span>
              </div>
              <p className="text-xs text-slate-700 font-medium italic leading-relaxed">"{latestDirective}"</p>
            </div>
          )}

          {/* THE SUBMISSION FORM */}
          <div className="mb-12">
            <ReviewSubmissionForm 
              appId={applicationId} 
              division={division} 
              staffId={currentStaffId} 
              comments={commentsTrail} 
            />
          </div>

          {/* AUDIT TRAIL SECTION */}
          <div className="mt-8 border-t border-slate-100 pt-8">
             <div className="flex items-center gap-2 mb-6">
                <History className="w-4 h-4 text-slate-400" />
                <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Full Lifecycle History</h2>
             </div>
             <AuditTrail segments={commentsTrail} />
          </div>
        </div>

        {/* QMS COUNTDOWN FOOTER (Sticky) */}
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Net QMS Clock</p>
            <p className="text-[10px] font-bold text-blue-600 uppercase italic">48H Limit</p>
          </div>
          <QMSCountdown 
            startTime={activeTask.startTime!} 
            initialRemainingSeconds={totalRemainingSeconds} 
          />
        </div>

      </div>
    </div>
  );
}