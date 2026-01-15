// import { db } from "@/db";
// import { qmsTimelines, applications, companies } from "@/db/schema";
// import { eq, and, isNull } from "drizzle-orm";
// import { supabase } from "@/lib/supabase";
// import QMSCountdown from "@/components/QMSCountdown";
// import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
// import { notFound } from "next/navigation";
// import { Info, MessageSquare } from "lucide-react"; // Added for the Directive UI

// export default async function TechnicalReviewPage({ 
//   params 
// }: { 
//   params: Promise<{ division: string; id: string }> 
// }) {
//   const { division, id } = await params;
//   const applicationId = parseInt(id);

//   const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

//   const appData = await db
//     .select({
//       id: applications.id,
//       applicationNumber: applications.applicationNumber,
//       details: applications.details, 
//       status: applications.status,
//       currentPoint: applications.currentPoint,
//       companyName: companies.name,
//     })
//     .from(applications)
//     .leftJoin(companies, eq(applications.companyId, companies.id))
//     .where(eq(applications.id, applicationId))
//     .limit(1);

//   const app = appData[0];
//   if (!app) return notFound();

//   const allSegments = await db
//     .select()
//     .from(qmsTimelines)
//     .where(eq(qmsTimelines.applicationId, applicationId))
//     .orderBy(qmsTimelines.startTime);

//   const activeTask = allSegments.find(s => s.endTime === null && s.staffId === currentStaffId);

//   if (!activeTask) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50">
//         <div className="text-center p-12 bg-white rounded-3xl shadow-xl border border-slate-200">
//           <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Task Out of Scope</h2>
//           <p className="text-slate-500 italic">This task has already been submitted or reassigned to another officer.</p>
//         </div>
//       </div>
//     );
//   }

//   const staffSegments = allSegments.filter(s => s.staffId === currentStaffId);
//   const secondsAlreadyUsed = staffSegments.reduce((acc, segment) => {
//     if (segment.startTime && segment.endTime) {
//       return acc + Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000);
//     }
//     return acc;
//   }, 0);

//   const QMS_LIMIT_SECONDS = 48 * 60 * 60; 
//   const totalRemainingSeconds = QMS_LIMIT_SECONDS - secondsAlreadyUsed;

//   const rawUrl = (app.details as any)?.poaUrl || "";
//   const dossierFilename = rawUrl.split('/').pop() || "";
  
//   const { data: urlData } = supabase.storage
//     .from('documents') 
//     .getPublicUrl(dossierFilename);

//   const finalPdfUrl = dossierFilename ? urlData.publicUrl : null;

//   // NEW: Get the latest Technical Directive from the DDD
//   const dddToStaffHistory = (app.details as any)?.ddd_to_staff_history || [];
//   const latestDirective = dddToStaffHistory[dddToStaffHistory.length - 1]?.instruction;

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50">
      
//       {/* LEFT: PDF VIEWER */}
//       <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 shadow-inner relative">
//         {finalPdfUrl ? (
//           <iframe 
//             src={`${finalPdfUrl}#view=FitH&toolbar=0`} 
//             className="w-full h-full border-none"
//             title="Dossier Viewer"
//           />
//         ) : (
//           <div className="flex items-center justify-center h-full text-slate-400">
//             <p className="italic">No Dossier Document linked to this application.</p>
//           </div>
//         )}
//       </div>

//       {/* RIGHT: CONTROL PANEL */}
//       <div className="w-1/3 h-full flex flex-col p-8 bg-white overflow-y-auto">
        
//         {/* HEADER SECTION */}
//         <div className="mb-6 pb-6 border-b border-slate-100">
//           <div className="flex items-center gap-2 mb-2">
//             <span className="px-2 py-0.5 rounded text-[10px] font-black bg-blue-600 text-white uppercase tracking-widest">
//               {division.toUpperCase()} Division
//             </span>
//             {app.status === 'PENDING_REWORK' && (
//                <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-100 text-rose-600 uppercase tracking-widest border border-rose-200">
//                 Rework Session
//               </span>
//             )}
//           </div>
//           <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tight italic">Technical Review</h1>
//           <p className="text-xs font-mono text-blue-600 font-bold mb-1">{app.applicationNumber}</p>
//           <p className="text-lg font-bold text-slate-700 leading-tight">{app.companyName}</p>
//         </div>

//         {/* NEW: DDD DIRECTIVE BOX - Shows the specific instruction for this round */}
//         {latestDirective && (
//           <div className="mb-8 p-4 bg-blue-50 border border-blue-100 rounded-2xl shadow-sm">
//             <div className="flex items-center gap-2 mb-2">
//               <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
//               <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest">Supervisor Directive</span>
//             </div>
//             <p className="text-sm text-slate-700 italic leading-relaxed font-medium">
//               "{latestDirective}"
//             </p>
//           </div>
//         )}

//         {/* THE SUBMISSION FORM */}
//         <div className="flex-grow">
//           <ReviewSubmissionForm 
//             appId={applicationId} 
//             division={activeTask.division ?? 'VMD'} 
//             staffId={currentStaffId} 
//             app={app} 
//           />
//         </div>

//         {/* QMS COUNTDOWN FOOTER */}
//         <div className="mt-8 pt-6 border-t border-slate-100 bg-white sticky bottom-0">
//           <div className="flex items-center justify-between mb-2">
//             <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
//               Net QMS Clock
//             </p>
//             <p className="text-[10px] font-bold text-blue-600 uppercase">
//               Limit: 48 Hours
//             </p>
//           </div>
//           <QMSCountdown 
//             startTime={activeTask.startTime!} 
//             initialRemainingSeconds={totalRemainingSeconds} 
//           />
//         </div>
//       </div>
//     </div>
//   );
// }

import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, and, isNull } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import AuditTrail from "@/components/AuditTrail"; // Added this import
import { notFound } from "next/navigation";
import { MessageSquare, History } from "lucide-react"; 

export default async function TechnicalReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string; id: string }> 
}) {
  const { division, id } = await params;
  const applicationId = parseInt(id);

  // 1. Current Staff ID (Static for Vibe-Coding/Testing phase)
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 2. Fetch the Application with FULL details
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

  // 3. Fetch ALL history segments
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(qmsTimelines.startTime);

  // --- MAPPING LOGIC START: Bridge JSONB to Timeline ---
  const details = (app.details as any) || {};
  
  // Clone arrays so we can "shift" them without mutating original data
  const directorHistory = [...(details.director_history || [])];
  const dddHistory = [...(details.ddd_to_staff_history || [])];
  const techHistory = [...(details.technical_history || [])];
  const lodComment = details.initialComment || "";

  const segmentsWithComments = allSegments.map((segment) => {
    let commentText = null;

    if (segment.point === 'LOD Intake') {
      commentText = lodComment;
    } else if (segment.point === 'Director') {
      commentText = directorHistory.shift()?.instruction;
    } else if (segment.point === 'Divisional Deputy Director') {
      commentText = dddHistory.shift()?.instruction;
    } else if (segment.point === 'Technical Review') {
      commentText = techHistory.shift()?.findings;
    }

    return {
      ...segment,
      comments: commentText // This matches the AuditSegment interface
    };
  });
  // --- MAPPING LOGIC END ---

  // 4. Find the CURRENT active row for this staff member
  const activeTask = allSegments.find(s => s.endTime === null && s.staffId === currentStaffId);

  if (!activeTask) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-12 bg-white rounded-3xl shadow-xl border border-slate-200">
          <h2 className="text-2xl font-black text-slate-900 mb-2 uppercase tracking-tight italic">Task Out of Scope</h2>
          <p className="text-slate-500 italic">This task has already been submitted or reassigned.</p>
        </div>
      </div>
    );
  }

  // 5. QMS CLOCK LOGIC
  const staffSegments = allSegments.filter(s => s.staffId === currentStaffId);
  const secondsAlreadyUsed = staffSegments.reduce((acc, segment) => {
    if (segment.startTime && segment.endTime) {
      return acc + Math.floor((segment.endTime.getTime() - segment.startTime.getTime()) / 1000);
    }
    return acc;
  }, 0);

  const QMS_LIMIT_SECONDS = 48 * 60 * 60; 
  const totalRemainingSeconds = QMS_LIMIT_SECONDS - secondsAlreadyUsed;

  // 6. DOSSIER FETCHING
  const rawUrl = (app.details as any)?.poaUrl || "";
  const dossierFilename = rawUrl.split('/').pop() || "";
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(dossierFilename);
  const finalPdfUrl = dossierFilename ? urlData.publicUrl : null;

  // Get only the most recent directive for the blue alert box
  const latestDirective = (app.details as any)?.ddd_to_staff_history?.slice(-1)[0]?.instruction;

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
          <div className="flex items-center justify-center h-full text-slate-400 font-black uppercase text-[10px] tracking-widest">
            Document Fetch Error
          </div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL (1/3 Screen) */}
      <div className="w-1/3 h-full flex flex-col p-8 bg-white overflow-y-auto custom-scrollbar">
        
        {/* HEADER SECTION */}
        <div className="mb-6 pb-6 border-b border-slate-100">
          <div className="flex items-center gap-2 mb-2">
            <span className="px-2 py-0.5 rounded text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
              {division.toUpperCase()} Division
            </span>
            {app.status === 'PENDING_REWORK' && (
               <span className="px-2 py-0.5 rounded text-[10px] font-black bg-rose-600 text-white uppercase tracking-widest animate-pulse">
                Rework
              </span>
            )}
          </div>
          <h1 className="text-2xl font-black text-slate-900 uppercase tracking-tighter italic">Technical Review</h1>
          <p className="text-xs font-mono text-blue-600 font-bold">{app.applicationNumber}</p>
        </div>

        {/* LATEST DIRECTIVE ALERT BOX */}
        {latestDirective && (
          <div className="mb-8 p-4 bg-blue-50 border-l-4 border-blue-600 rounded-r-xl">
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
            division={activeTask.division ?? 'VMD'} 
            staffId={currentStaffId} 
            app={app} 
          />
        </div>

        {/* AUDIT TRAIL SECTION */}
        <div className="mt-8 border-t border-slate-100 pt-8">
           <div className="flex items-center gap-2 mb-6">
              <History className="w-4 h-4 text-slate-400" />
              <h2 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Lifecycle History</h2>
           </div>
           {/* Passing our MAPPED segments here */}
           <AuditTrail segments={segmentsWithComments as any} />
        </div>

        {/* QMS COUNTDOWN FOOTER */}
        <div className="mt-auto pt-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
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