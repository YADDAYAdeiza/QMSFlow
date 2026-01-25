import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";
import { ShieldCheck, FileWarning, Search, Landmark } from "lucide-react"; 

export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string; id: string }> }) {
  const { division, id } = await params;
  const applicationId = parseInt(id);
  
  // CURRENT TESTER: Switch this UUID to test different roles (Staff vs DDD)
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 1. Fetch User and Application Context
  const user = await db.query.users.findFirst({ where: eq(users.id, currentStaffId) });
  const appData = await db
    .select({
      id: applications.id,
      applicationNumber: applications.applicationNumber,
      details: applications.details, 
      currentPoint: applications.currentPoint,
    })
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  const app = appData[0];
  if (!app || !user) return notFound();

  const details = (app.details as any) || {};
  const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  
  // 2. Hydrate Form: Find the latest set of CAPAs submitted in the trail
  const lastSubmission = [...commentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_FOR_REVIEW" || c.action === "SUBMITTED_TO_DDD");
    
  const initialFindings = { capas: lastSubmission?.observations || lastSubmission?.observations?.capas || [] };

  // 3. QMS & Task Validation
  const allSegments = await db.select().from(qmsTimelines).where(eq(qmsTimelines.applicationId, applicationId)).orderBy(asc(qmsTimelines.startTime));
  const activeTask = allSegments.find(s => s.endTime === null && s.staffId === currentStaffId);

  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic leading-none text-slate-900">Task Out of Scope</h2>
          <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">Currently at: {app.currentPoint}</p>
        </div>
      </div>
    );
  }

  const secondsUsed = allSegments.filter(s => s.staffId === currentStaffId).reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);
  const remaining = (48 * 60 * 60) - secondsUsed;

  const rawUrl = details.inspectionReportUrl || details.poaUrl || "";
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(rawUrl.split('/').pop() || "");

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* LEFT: DOSSIER VIEWER */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative shadow-inner">
        {urlData.publicUrl ? (
          <iframe src={`${urlData.publicUrl}#view=FitH&toolbar=0`} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex items-center justify-center h-full"><Search className="opacity-20" /></div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-8 pb-32">
          <div className="mb-8 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
                {user.division} {user.role === 'Divisional Deputy Director' ? 'DDD' : user.role}
              </span>
              
              {/* Dynamic Logic: If it's at IRSD, show the final gate badge */}
              {app.currentPoint.includes("IRSD") ? (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-widest flex items-center gap-1">
                  <Landmark className="w-3 h-3" /> IRSD Final Clearance
                </span>
              ) : app.currentPoint !== 'Divisional Deputy Director' && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-rose-600 text-white uppercase tracking-widest flex items-center gap-1">
                  <FileWarning className="w-3 h-3" /> Rework Mode
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
              {user.role === 'Staff' ? 'Technical Review' : 'Supervisory Review'}
            </h1>
            <p className="text-sm font-mono text-blue-600 font-bold mt-2">{app.applicationNumber}</p>
          </div>

          <div className="mb-12">
            <ReviewSubmissionForm 
              appId={applicationId} 
              division={division} 
              staffId={currentStaffId} 
              initialFindings={initialFindings} 
              comments={commentsTrail}
            />
          </div>
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}