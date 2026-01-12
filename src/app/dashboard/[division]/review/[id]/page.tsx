import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";

export default async function TechnicalReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string; id: string }> 
}) {
  const { division, id } = await params;
  const applicationId = parseInt(id);

  // 1. Static ID for Vibe-Coding testing
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 2. Fetch ALL history for this staff member on this application
  // This is used for both the "Rework" notice and the Time Calculation
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(and(
      eq(qmsTimelines.applicationId, applicationId),
      eq(qmsTimelines.staffId, currentStaffId)
    ));

  // 3. Find the CURRENT active row to display the main info
  const activeTask = allSegments.find(s => s.endTime === null);

  if (!activeTask) return <div className="p-10 text-center font-bold">Task not found or already completed.</div>;

  // 4. Fetch Application/Company data
  const appData = await db
    .select({
      appNumber: applications.applicationNumber,
      companyName: companies.name,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, applicationId))
    .limit(1);

  const taskInfo = appData[0];

  // 5. CLOCK LOGIC: Calculate cumulative seconds already spent in PAST sessions
  const secondsAlreadyUsed = allSegments.reduce((acc, segment) => {
    if (segment.startTime && segment.endTime) {
      return acc + Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000);
    }
    return acc;
  }, 0);

  // SOP Limit is 48 hours
  const QMS_LIMIT_SECONDS = 48 * 60 * 60; 
  const totalRemainingSeconds = QMS_LIMIT_SECONDS - secondsAlreadyUsed;

  // 6. Generate Supabase URL for the iFrame
  const dossierPath = `0.9554887811327575.pdf`;
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(dossierPath);
  console.log("DEBUG: Active Task Division is", activeTask.division)
  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* LEFT: PDF VIEWER (2/3 Screen) */}
      <div className="w-2/3 h-full border-r bg-gray-200">
        <iframe 
          src={`${urlData.publicUrl}#view=FitH&toolbar=0`} 
          className="w-full h-full border-none"
          title="Dossier"
        />
      </div>

      {/* RIGHT: CONTROL PANEL (1/3 Screen) */}
      <div className="w-1/3 h-full flex flex-col p-6 bg-white overflow-y-auto">
        
        {/* REWORK ALERT: Show if there is more than 1 segment */}
        {allSegments.length > 1 && (
          <div className="bg-amber-50 border-l-4 border-amber-400 p-4 mb-6 rounded-r">
            <h4 className="text-amber-800 font-bold text-xs uppercase mb-1 tracking-wider">
              DDD Feedback (Rework Session)
            </h4>
            <p className="text-sm text-amber-900 italic">
              "{ (activeTask.details as any)?.previous_ddd_comment || 'Correction required by DDD.' }"
            </p>
          </div>
        )}

        <div className="mb-8 border-b pb-4">
          <h1 className="text-xl font-black text-slate-900 uppercase italic">Technical Review</h1>
          <p className="text-sm font-mono text-blue-600">{taskInfo?.appNumber}</p>
          <p className="font-bold text-gray-700">{taskInfo?.companyName}</p>
        </div>

        <div className="flex-grow">
          <ReviewSubmissionForm 
            appId={applicationId} 
            division={activeTask.division ?? 'VMD'} // Pull from the DB record instead of URL
            staffId={currentStaffId} 
          />
        </div>

        {/* THE CLOCK: Passing the calculated seconds remaining */}
        <div className="mt-8 pt-4 border-t">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">
            Time Remaining (Net QMS)
          </p>
          <QMSCountdown 
            startTime={activeTask.startTime!} 
            initialRemainingSeconds={totalRemainingSeconds} 
          />
        </div>
      </div>
    </div>
  );
}