// import { db } from "@/db";
// import { qmsTimelines, applications, users } from "@/db/schema";
// import { eq, asc, and, sql } from "drizzle-orm";
// import { supabase } from "@/lib/supabase";
// import QMSCountdown from "@/components/QMSCountdown";
// import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
// import { notFound } from "next/navigation";
// import { ShieldCheck, FileWarning, Search, Landmark, Lock } from "lucide-react"; 

// export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string; id: string }> }) {
//   const { division, id } = await params;
//   const applicationId = parseInt(id);
//   const upperDiv = division.toUpperCase();

//   // 1. Fetch Application joined with the Assigned User
//   // This filters by Application ID AND Division at the Database level
//   const appData = await db
//     .select({
//       id: applications.id,
//       applicationNumber: applications.applicationNumber,
//       details: applications.details, 
//       currentPoint: applications.currentPoint,
//       assignedStaffId: users.id,
//       assignedStaffName: users.name,
//       assignedStaffRole: users.role,
//       assignedStaffDivision: users.division,
//     })
//     .from(applications)
//     // We join the user table based on the ID stored in the JSONB details
//     .leftJoin(users, eq(sql`${applications.details}->>'staff_reviewer_id'`, users.id))
//     .where(
//       and(
//         eq(applications.id, applicationId),
//         eq(users.division, upperDiv) 
//       )
//     )
//     .limit(1);

//   const app = appData[0];

//   // 2. Access Control: If no record found, it's either the wrong ID or wrong Division
//   if (!app) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
//         <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
//           <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
//           <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
//             Application #{id} is not assigned to the {upperDiv} division or does not exist.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   const details = (app.details as any) || {};
//   const assignedStaffId = app.assignedStaffId;

//   // 3. QMS & Task Validation
//   const allSegments = await db
//     .select()
//     .from(qmsTimelines)
//     .where(eq(qmsTimelines.applicationId, applicationId))
//     .orderBy(asc(qmsTimelines.startTime));

//   // Find the active clock for the assigned user
//   const activeTask = allSegments.find(s => 
//     s.endTime === null && 
//     s.staffId === assignedStaffId
//   );

//   if (!activeTask) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50">
//         <div className="text-center p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
//           <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Task Out of Scope</h2>
//           <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">Currently at: {app.currentPoint}</p>
//         </div>
//       </div>
//     );
//   }

//   // QMS Timing Calculations
//   const secondsUsed = allSegments
//     .filter(s => s.staffId === assignedStaffId)
//     .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

//   const remaining = (48 * 60 * 60) - secondsUsed;

//   // Data Hydration for Form
//   const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
//   const lastSubmission = [...commentsTrail]
//     .reverse()
//     .find((c: any) => c.action === "SUBMITTED_FOR_REVIEW" || c.action === "SUBMITTED_TO_DDD");
    
//   const initialFindings = { capas: lastSubmission?.observations || lastSubmission?.observations?.capas || [] };
  
//   // Storage Logic
//   const rawUrl = details.inspectionReportUrl || details.poaUrl || "";
//   const { data: urlData } = supabase.storage.from('Documents').getPublicUrl(rawUrl.split('/').pop() || "");

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50">
//       {/* LEFT: DOSSIER VIEWER */}
//       <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative">
//         {urlData.publicUrl ? (
//           <iframe src={`${urlData.publicUrl}#view=FitH&toolbar=0`} className="w-full h-full border-none" title="Dossier" />
//         ) : (
//           <div className="flex items-center justify-center h-full"><Search className="opacity-20" /></div>
//         )}
//       </div>

//       {/* RIGHT: CONTROL PANEL */}
//       <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
//         <div className="p-8 pb-32">
//           <div className="mb-8 pb-8 border-b border-slate-100">
//             <div className="flex items-center gap-2 mb-3">
//               <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
//                 {app.assignedStaffDivision} {app.assignedStaffRole === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : app.assignedStaffRole}
//               </span>
//               {app.currentPoint.includes("IRSD") && (
//                 <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-widest flex items-center gap-1">
//                   <Landmark className="w-3 h-3" /> IRSD Final
//                 </span>
//               )}
//             </div>
            
//             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
//               {app.assignedStaffRole === 'Staff' ? 'Technical Review' : 'Supervisory Review'}
//             </h1>
//             <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned to: {app.assignedStaffName}</p>
//             <p className="text-sm font-mono text-blue-600 font-bold mt-1">{app.applicationNumber}</p>
//           </div>

//           <div className="mb-12">
//             <ReviewSubmissionForm 
//               appId={applicationId} 
//               division={division} 
//               staffId={assignedStaffId!} 
//               initialFindings={initialFindings} 
//               comments={commentsTrail}
//             />
//           </div>
//         </div>
        
//         {/* QMS FOOTER */}
//         <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
//           <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
//         </div>
//       </div>
//     </div>
//   );
// }


export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc, and } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";
import { ShieldCheck, Search, Landmark, Lock } from "lucide-react"; 

export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string; id: string }> }) {
  const { division, id } = await params;
  const applicationId = parseInt(id);
  const upperDiv = division.toUpperCase();

  // 1. Fetch Application ALONE (Removes the crashing join)
  const [appData] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!appData) return notFound();

  const details = (appData.details as any) || {};
  const staffIdFromDetails = details.staff_reviewer_id;

  // 2. Fetch the Assigned User separately (Safe & Stable)
  const [assignedUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, staffIdFromDetails),
        eq(users.division, upperDiv)
      )
    )
    .limit(1);

  // Access Control: If user not found in this division
  if (!assignedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
        <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
            Application #{id} is not assigned to a staff in {upperDiv} or the user is invalid.
          </p>
        </div>
      </div>
    );
  }

  // 3. QMS & Task Validation (Using your existing logic)
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
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="text-center p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
          <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Task Out of Scope</h2>
          <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">Currently at: {appData.currentPoint}</p>
        </div>
      </div>
    );
  }

  // QMS Timing Calculations
  const secondsUsed = allSegments
    .filter(s => s.staffId === assignedUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  const remaining = (48 * 60 * 60) - secondsUsed;

  // Data Hydration for Form
  const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  const lastSubmission = [...commentsTrail]
    .reverse()
    .find((c: any) => c.action === "SUBMITTED_FOR_REVIEW" || c.action === "SUBMITTED_TO_DDD");
    
  const initialFindings = { capas: lastSubmission?.observations || lastSubmission?.observations?.capas || [] };
  
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
          <div className="flex items-center justify-center h-full"><Search className="opacity-20" /></div>
        )}
      </div>

      {/* RIGHT: CONTROL PANEL */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-8 pb-32">
          <div className="mb-8 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className="px-3 py-1 rounded-full text-[10px] font-black bg-slate-900 text-white uppercase tracking-widest">
                {assignedUser.division} {assignedUser.role === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : assignedUser.role}
              </span>
              {appData.currentPoint.includes("IRSD") && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-emerald-600 text-white uppercase tracking-widest flex items-center gap-1">
                  <Landmark className="w-3 h-3" /> IRSD Final
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
              {assignedUser.role === 'Staff' ? 'Technical Review' : 'Supervisory Review'}
            </h1>
            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned to: {assignedUser.name}</p>
            <p className="text-sm font-mono text-blue-600 font-bold mt-1">{appData.applicationNumber}</p>
          </div>

          <div className="mb-12">
            <ReviewSubmissionForm 
              appId={applicationId} 
              division={division} 
              staffId={assignedUser.id} 
              initialFindings={initialFindings} 
              comments={commentsTrail}
            />
          </div>
        </div>
        
        {/* QMS FOOTER */}
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}