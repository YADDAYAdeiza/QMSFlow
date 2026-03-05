export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc, and, or } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";
import { ShieldCheck, Search, Landmark, Lock, Gavel } from "lucide-react"; 

export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string; id: string }> }) {
  const { division, id } = await params;
  const applicationId = parseInt(id);
  const upperDiv = division.toUpperCase();

  // 1. Fetch Application
  const [appData] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!appData) return notFound();

  const details = (appData.details as any) || {};
  
  // ✅ LOGIC: Determine which ID to use. 
  // IRSD Staff Vetting uses 'irsd_reviewer_id' to preserve original staff history.
  const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
  const staffIdToLookup = isHubVetting 
    ? details.irsd_reviewer_id 
    : details.staff_reviewer_id;

  // 2. Fetch the Assigned User (Safe & Stable)
  const [assignedUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, staffIdToLookup),
        eq(users.division, upperDiv)
      )
    )
    .limit(1);

  // Access Control
  if (!assignedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
        <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
            Application #{id} is not assigned to a staff in {upperDiv}.
          </p>
        </div>
      </div>
    );
  }

  // 3. QMS & Task Validation
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(asc(qmsTimelines.startTime));

  const activeTask = allSegments.find(s => 
    s.endTime === null && 
    s.staffId === assignedUser.id
  );

  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
        <div className="p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Task Inactive</h2>
          <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">
            Status: {appData.currentPoint}
          </p>
        </div>
      </div>
    );
  }

  // QMS Timing (48 Hour Limit)
  const secondsUsed = allSegments
    .filter(s => s.staffId === assignedUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  const remaining = (48 * 60 * 60) - secondsUsed;

  const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  
  // Storage Logic
  const rawUrl = details.inspectionReportUrl || details.poaUrl || "";
  const fileName = rawUrl.split('/').pop() || "";
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* LEFT: DOSSIER VIEWER */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative">
        {urlData.publicUrl ? (
          <iframe src={`${urlData.publicUrl}#view=FitH&toolbar=0`} className="w-full h-full border-none" title="Dossier" />
        ) : (
          <div className="flex items-center justify-center h-full text-slate-300">
             <Search className="w-12 h-12 opacity-20 mb-2" />
             <p className="text-[10px] font-bold uppercase tracking-widest">Document Not Found</p>
          </div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-8 pb-32">
          <div className="mb-8 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
                {assignedUser.division} {assignedUser.role === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : 'Officer'}
              </span>
              {isHubVetting && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-600 text-white uppercase tracking-widest flex items-center gap-1">
                  <Gavel className="w-3 h-3" /> Hub Vetting
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
              {isHubVetting ? 'Verification' : 'Technical Review'}
            </h1>
            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned to: {assignedUser.name}</p>
          </div>

          <div className="mb-12">
            <ReviewSubmissionForm 
              appId={applicationId} 
              division={division} 
              staffId={assignedUser.id} 
              comments={commentsTrail}
              isHubVetting={isHubVetting} // Passing this to the form
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