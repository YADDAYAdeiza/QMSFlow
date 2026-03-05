// export const dynamic = "force-dynamic";

// import { db } from "@/db";
// import { qmsTimelines, applications, users } from "@/db/schema";
// import { eq, asc, and } from "drizzle-orm";
// import { supabase } from "@/lib/supabase";
// import QMSCountdown from "@/components/QMSCountdown";
// import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
// import { notFound } from "next/navigation";
// import { ShieldCheck, Search, Lock, Gavel } from "lucide-react"; 

// export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string; id: string }> }) {
//   const { division, id } = await params;
//   const applicationId = parseInt(id);
//   const upperDiv = division.toUpperCase();

//   // 1. Fetch Application
//   const [appData] = await db
//     .select()
//     .from(applications)
//     .where(eq(applications.id, applicationId))
//     .limit(1);

//   if (!appData) return notFound();

//   const details = (appData.details as any) || {};
  
//   // ✅ LOGIC: Use irsd_reviewer_id for Hub Vetting to maintain history
//   const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
//   const staffIdToLookup = isHubVetting 
//     ? details.irsd_reviewer_id 
//     : details.staff_reviewer_id;

//   // 2. Fetch the Assigned User
//   const [assignedUser] = await db
//     .select()
//     .from(users)
//     .where(
//       and(
//         eq(users.id, staffIdToLookup),
//         eq(users.division, upperDiv)
//       )
//     )
//     .limit(1);

//   // Access Control
//   if (!assignedUser) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
//         <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
//           <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
//           <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
//             Application #{id} is not assigned to a staff in {upperDiv}.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // 3. QMS Validation
//   const allSegments = await db
//     .select()
//     .from(qmsTimelines)
//     .where(eq(qmsTimelines.applicationId, applicationId))
//     .orderBy(asc(qmsTimelines.startTime));

//   const activeTask = allSegments.find(s => 
//     s.endTime === null && 
//     s.staffId === assignedUser.id
//   );

//   if (!activeTask) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
//         <div className="p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
//           <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Task Inactive</h2>
//           <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">
//             Status: {appData.currentPoint}
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // QMS Calculation
//   const secondsUsed = allSegments
//     .filter(s => s.staffId === assignedUser.id)
//     .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

//   const remaining = (48 * 60 * 60) - secondsUsed;
//   const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  
//   // ✅ Get Dossier URL (The main file uploaded by the company)
//   const mainDossierPath = details.dossierPath || ""; 
//   const { data: urlData } = supabase.storage.from('Documents').getPublicUrl(mainDossierPath);

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50">
//       {/* LEFT: DOSSIER VIEWER */}
//       <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative">
//         {urlData.publicUrl ? (
//           <iframe src={`${urlData.publicUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
//         ) : (
//           <div className="flex flex-col items-center justify-center h-full text-slate-300">
//              <Search className="w-12 h-12 opacity-20 mb-2" />
//              <p className="text-[10px] font-bold uppercase tracking-widest">Dossier File Not Found</p>
//           </div>
//         )}
//       </div>

//       {/* RIGHT: CONTROL PANEL */}
//       <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
//         <div className="p-8 pb-32">
//           <div className="mb-8 pb-8 border-b border-slate-100">
//             <div className="flex items-center gap-2 mb-3">
//               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isHubVetting ? 'bg-emerald-600 text-white' : 'bg-slate-900 text-white'}`}>
//                 {assignedUser.division} {assignedUser.role === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : 'Officer'}
//               </span>
//               {isHubVetting && (
//                 <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-widest flex items-center gap-1">
//                   <Gavel className="w-3 h-3" /> Hub Phase
//                 </span>
//               )}
//             </div>
            
//             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
//               {isHubVetting ? 'Verification' : 'Technical Review'}
//             </h1>
//             <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned to: {assignedUser.name}</p>
//           </div>

//           <div className="mb-12">
//             {/* ✅ This form now handles BOTH technical and hub vetting */}
//             <ReviewSubmissionForm 
//               appId={applicationId} 
//               division={division} 
//               staffId={assignedUser.id} 
//               comments={commentsTrail}
//               isHubVetting={isHubVetting}
//             />
//           </div>
//         </div>
        
//         <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
//           <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
//         </div>
//       </div>
//     </div>
//   );
// }


// export const dynamic = "force-dynamic";

// import { db } from "@/db";
// import { qmsTimelines, applications, users } from "@/db/schema";
// import { eq, asc, and, isNull } from "drizzle-orm";
// import { supabase } from "@/lib/supabase";
// import QMSCountdown from "@/components/QMSCountdown";
// import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
// import { notFound } from "next/navigation";
// import { ShieldCheck, Search, Lock, Gavel } from "lucide-react"; 

// interface PageProps {
//   params: Promise<{ division: string; id: string }>;
//   searchParams: Promise<{ division?: string }>;
// }

// export default async function TechnicalReviewPage({ params, searchParams }: PageProps) {
//   const { division: pathDiv, id } = await params;
//   const sParams = await searchParams;

//   // 1. Resolve exact division and ID
//   const resolvedDivision = (sParams.division || pathDiv).toUpperCase();
//   const applicationId = parseInt(id);

//   // 2. Fetch Application Data
//   const [appData] = await db
//     .select()
//     .from(applications)
//     .where(eq(applications.id, applicationId))
//     .limit(1);

//   if (!appData) return notFound();

//   const details = (appData.details as any) || {};
  
//   // 3. Extract Audit Trail (The "Missing" Piece)
//   // We ensure this is an array and passed to the form
//   const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  
//   // 4. Resolve the intended staff member
//   const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
//   const staffIdToLookup = isHubVetting 
//     ? details.irsd_reviewer_id 
//     : details.staff_reviewer_id;

//   // 5. Fetch Assigned User with Division Guard
//   const [assignedUser] = await db
//     .select()
//     .from(users)
//     .where(
//       and(
//         eq(users.id, staffIdToLookup),
//         eq(users.division, resolvedDivision)
//       )
//     )
//     .limit(1);

//   // Access Control UI
//   if (!assignedUser) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
//         <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
//           <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
//           <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
//             Application #{id} is not assigned to you in {resolvedDivision}.
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // 6. QMS & Task Validation
//   const allSegments = await db
//     .select()
//     .from(qmsTimelines)
//     .where(eq(qmsTimelines.applicationId, applicationId))
//     .orderBy(asc(qmsTimelines.startTime));

//   const activeTask = allSegments.find(s => 
//     s.endTime === null && 
//     s.staffId === assignedUser.id
//   );

//   if (!activeTask) {
//     return (
//       <div className="flex items-center justify-center h-screen bg-slate-50 text-center">
//         <div className="p-12 bg-white rounded-[3rem] border border-slate-200 shadow-xl">
//           <ShieldCheck className="w-12 h-12 text-slate-300 mx-auto mb-4" />
//           <h2 className="text-xl font-black uppercase italic text-slate-900">Task Inactive</h2>
//           <p className="text-slate-500 text-[10px] mt-2 font-mono uppercase tracking-[0.2em]">
//             Current Stage: {appData.currentPoint}
//           </p>
//         </div>
//       </div>
//     );
//   }

//   // 7. QMS Clock Math
//   const secondsUsed = allSegments
//     .filter(s => s.staffId === assignedUser.id)
//     .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

//   const remaining = (48 * 60 * 60) - secondsUsed;

//   // 8. Resolve PDF Document URL
//   const mainDossierPath = details.dossierPath || details.poaUrl || ""; 
//   let publicUrl = "";
//   if (mainDossierPath) {
//     const { data: urlData } = supabase.storage.from('documents').getPublicUrl(mainDossierPath);
//     publicUrl = urlData.publicUrl;
//   }

//   return (
//     <div className="flex h-screen overflow-hidden bg-slate-50">
//       {/* LEFT: DOSSIER VIEWER */}
//       <div className="w-2/3 h-full border-r border-slate-200 bg-slate-100 relative">
//         {publicUrl ? (
//           <iframe src={`${publicUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
//         ) : (
//           <div className="flex flex-col items-center justify-center h-full text-slate-300">
//              <Search className="w-12 h-12 opacity-20 mb-2" />
//              <p className="text-[10px] font-bold uppercase tracking-widest">Dossier URL Missing</p>
//           </div>
//         )}
//       </div>

//       {/* RIGHT: CONTROL PANEL */}
//       <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
//         <div className="p-8 pb-32">
//           <div className="mb-8 pb-8 border-b border-slate-100">
//             <div className="flex items-center gap-2 mb-3">
//               <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isHubVetting ? 'bg-emerald-600 text-white shadow-lg' : 'bg-slate-900 text-white'}`}>
//                 {assignedUser.division} {assignedUser.role === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : 'Officer'}
//               </span>
//               {isHubVetting && (
//                 <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-widest flex items-center gap-1">
//                   <Gavel className="w-3 h-3" /> Hub Phase
//                 </span>
//               )}
//             </div>
            
//             <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
//               {isHubVetting ? 'Verification' : 'Technical Review'}
//             </h1>
//             <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned to: {assignedUser.name}</p>
//           </div>

//           <div className="mb-12">
//             {/* ✅ Audit trail is passed here via comments prop */}
//             <ReviewSubmissionForm 
//               appId={applicationId} 
//               division={resolvedDivision} 
//               staffId={assignedUser.id} 
//               comments={commentsTrail}
//               isHubVetting={isHubVetting}
//             />
//           </div>
//         </div>
        
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
import { eq, asc, and, isNull } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";
import { ShieldCheck, Search, Lock, Gavel, FileText } from "lucide-react"; 

interface PageProps {
  params: Promise<{ division: string; id: string }>;
  searchParams: Promise<{ division?: string }>;
}

export default async function TechnicalReviewPage({ params, searchParams }: PageProps) {
  const { division: pathDiv, id } = await params;
  const sParams = await searchParams;

  // 1. Resolve Division & Application ID
  const resolvedDivision = (sParams.division || pathDiv).toUpperCase();
  const applicationId = parseInt(id);

  // 2. Fetch Application
  const [appData] = await db
    .select()
    .from(applications)
    .where(eq(applications.id, applicationId))
    .limit(1);

  if (!appData) return notFound();

  const details = (appData.details as any) || {};
  
  // 3. Extract Audit Trail
  const commentsTrail = Array.isArray(details.comments) ? details.comments : [];
  
  // 4. Resolve PDF URL (Fixed for Full URLs vs Paths)
  const rawPath = details.poaUrl || details.dossierPath || details.reportUrl || ""; 
  let publicUrl = "";

  if (rawPath) {
    if (rawPath.startsWith('http')) {
      // It's already a full URL (as seen in your JSON), use as-is
      publicUrl = rawPath;
    } else {
      // It's a relative path, fetch from bucket
      const { data: urlData } = supabase.storage
        .from('documents') 
        .getPublicUrl(rawPath);
      publicUrl = urlData.publicUrl;
    }
  }

  // 5. Access Control Logic
  const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
  const staffIdToLookup = isHubVetting 
    ? details.irsd_reviewer_id 
    : details.staff_reviewer_id;

  const [assignedUser] = await db
    .select()
    .from(users)
    .where(
      and(
        eq(users.id, staffIdToLookup),
        eq(users.division, resolvedDivision)
      )
    )
    .limit(1);

  if (!assignedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center p-6">
        <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
          <p className="text-slate-500 text-xs mt-2 font-mono uppercase leading-relaxed">
            Application #{id} is not assigned to you in {resolvedDivision}.
          </p>
        </div>
      </div>
    );
  }

  // 6. QMS Validation
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
            Current Point: {appData.currentPoint}
          </p>
        </div>
      </div>
    );
  }

  // 7. QMS Math
  const secondsUsed = allSegments
    .filter(s => s.staffId === assignedUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  const remaining = (48 * 60 * 60) - secondsUsed;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* LEFT: PDF VIEWER */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-800 relative">
        {publicUrl ? (
          <iframe 
            src={`${publicUrl}#toolbar=0`} 
            className="w-full h-full border-none bg-slate-800" 
            title="Dossier Document" 
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-slate-500">
             <Search className="w-12 h-12 opacity-20 mb-2" />
             <p className="text-[10px] font-bold uppercase tracking-widest">Document Path Not Resolved</p>
          </div>
        )}
      </div>

      {/* RIGHT: ACTION PANEL */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-8 pb-32">
          {/* Header */}
          <div className="mb-8 pb-8 border-b border-slate-100">
            <div className="flex items-center gap-2 mb-3">
              <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${isHubVetting ? 'bg-emerald-600' : 'bg-slate-900'} text-white`}>
                {assignedUser.division} {assignedUser.role === 'Divisional Deputy Director' ? 'Divisional Deputy Director' : 'Officer'}
              </span>
              {isHubVetting && (
                <span className="px-3 py-1 rounded-full text-[10px] font-black bg-blue-100 text-blue-700 uppercase tracking-widest flex items-center gap-1">
                  <Gavel className="w-3 h-3" /> Hub
                </span>
              )}
            </div>
            
            <h1 className="text-3xl font-black text-slate-900 uppercase tracking-tighter italic leading-none">
              {isHubVetting ? 'Verification' : 'Technical Review'}
            </h1>
            <p className="text-[10px] font-black text-slate-400 mt-2 uppercase tracking-[0.2em]">Assigned: {assignedUser.name}</p>
          </div>

          {/* Review Form & Audit Trail */}
          <div className="mb-12">
            <ReviewSubmissionForm 
              appId={applicationId} 
              division={resolvedDivision} 
              staffId={assignedUser.id} 
              comments={commentsTrail}
              isHubVetting={isHubVetting}
            />
          </div>
        </div>
        
        {/* QMS Timer */}
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}