import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";

export default async function TechnicalReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string; id: string }> 
}) {
  const { division, id } = await params;
  const applicationId = parseInt(id);

  // 1. Current Staff ID (Static for Vibe-Coding/Testing phase)
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 2. Fetch the Application with FULL details and Company info
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

  // 3. Fetch ALL history segments for this application to calculate QMS time
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(qmsTimelines.startTime);

  // 4. Find the CURRENT active row for this staff member
  const activeTask = allSegments.find(s => s.endTime === null && s.staffId === currentStaffId);

  // Safety Gate: If no active clock exists for this user, they shouldn't be here
  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-12 bg-white rounded-3xl shadow-xl border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Task Out of Scope</h2>
          <p className="text-slate-500 italic">This task has already been submitted or reassigned to another officer.</p>
        </div>
      </div>
    );
  }

  // 5. QMS CLOCK LOGIC: Calculate cumulative seconds spent by THIS staff member across all rounds
  const staffSegments = allSegments.filter(s => s.staffId === currentStaffId);
  const secondsAlreadyUsed = staffSegments.reduce((acc, segment) => {
    if (segment.startTime && segment.endTime) {
      return acc + Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000);
    }
    return acc;
  }, 0);

  // SOP Limit is 48 hours total for technical review
  const QMS_LIMIT_SECONDS = 48 * 60 * 60; 
  const totalRemainingSeconds = QMS_LIMIT_SECONDS - secondsAlreadyUsed;

  // 6. DYNAMIC DOSSIER FETCHING (Using your 'Documents' bucket)
  // Extracting filename from the poaUrl stored in JSONB
  const rawUrl = (app.details as any)?.poaUrl || "";
  const dossierFilename = rawUrl.split('/').pop() || "";
  
  // Generate the public URL for the iframe
  const { data: urlData } = supabase.storage
    .from('documents') 
    .getPublicUrl(dossierFilename);

  const finalPdfUrl = dossierFilename ? urlData.publicUrl : null;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      
      {/* LEFT: PDF VIEWER (2/3 Screen) */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 shadow-inner relative">
        {finalPdfUrl ? (
          <iframe 
            src={`${finalPdfUrl}#view=FitH&toolbar=0`} 
            className="w-full h-full border-none"
            title="Dossier Viewer"
          />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-400">
            <p className="italic">No Dossier Document linked to this application.</p>
          </div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL (1/3 Screen) */}
      <div className="w-1/3 h-full flex flex-col p-8 bg-white overflow-y-auto">
        
        {/* HEADER SECTION */}
        <div className="mb-8 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white uppercase tracking-widest">
              {division.toUpperCase()} Division
            </span>
            {app.status === 'PENDING_REWORK' && (
               <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-600 uppercase tracking-widest border border-rose-200">
                Rework Session
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Technical Review</h1>
          <p className="text-xs font-mono text-blue-600 font-bold mb-1">{app.applicationNumber}</p>
          <p className="text-lg font-bold text-slate-700 leading-tight">{app.companyName}</p>
        </div>

        {/* THE SUBMISSION FORM */}
        <div className="flex-grow">
          <ReviewSubmissionForm 
            appId={applicationId} 
            division={activeTask.division ?? 'VMD'} 
            staffId={currentStaffId} 
            app={app} 
          />
        </div>

        {/* QMS COUNTDOWN FOOTER */}
        <div className="mt-8 pt-6 border-t border-slate-100 bg-white sticky bottom-0">
          <div className="flex items-center justify-between mb-2">
            <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
              Net QMS Clock
            </p>
            <p className="text-[10px] font-bold text-blue-600 uppercase">
              Limit: 48 Hours
            </p>
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