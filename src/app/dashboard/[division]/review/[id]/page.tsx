// import { supabase } from "@/lib/supabase"; // Your supabase client
// import { db } from "@/db";
// import { qmsTimelines, applications } from "@/db/schema";
// import { eq, and, isNull } from "drizzle-orm";
// import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
// import QMSCountdown from "@/components/QMSCountdown";

// export default async function TechnicalReviewPage({ params }: { params: Promise<{ division: string, id: string }> }) {
//   const { division, id } = await params;
//   const appId = parseInt(id);

//   // 1. Fetch Application Data (using the robust Join fix)
//   const results = await db.select().from(qmsTimelines)
//     .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
//     .where(and(eq(qmsTimelines.applicationId, appId), isNull(qmsTimelines.endTime)))
//     .limit(1);

//   const data = results[0];
//   // const dossierPath = `${data.applications.applicationNumber}/main_dossier.pdf`;
//   const dossierPath = `0.9764079573198993.jpg`;

//   // 2. Get the PDF link from your 'Documents' bucket
//   const { data: urlData } = supabase.storage
//     .from('documents')
//     .getPublicUrl(dossierPath);

//   return (
//     <div className="flex h-screen overflow-hidden bg-gray-100">
//       {/* LEFT SIDE: The Dossier Viewer (iFrame) */}
//       <div className="w-2/3 h-full border-r bg-white">
//         <iframe 
//           src={`${urlData.publicUrl}#toolbar=0`} 
//           className="w-full h-full"
//           title="Dossier Viewer"
//         />
//       </div>

//       {/* RIGHT SIDE: Review Form & QMS Info */}
//       <div className="w-1/3 h-full overflow-y-auto p-6 flex flex-col">
//         <div className="mb-6">
//           <h1 className="text-xl font-bold uppercase tracking-tight">Technical Review</h1>
//           <p className="text-sm text-gray-500">{data.applications.applicationNumber}</p>
//         </div>

//         <div className="flex-grow">
//            {/* Your ReviewSubmissionForm component here */}
//            <ReviewSubmissionForm appId={appId} division={division} />
//         </div>

//         <div className="mt-auto p-4 bg-blue-50 rounded-lg border border-blue-100">
//           <p className="text-[10px] font-bold text-blue-400 uppercase">QMS Deadline Remaining</p>
//           <QMSCountdown startTime={data.qms_timelines.startTime} />
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

export default async function TechnicalReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string; id: string }> 
}) {
  const { division, id } = await params;
  const applicationId = parseInt(id);

  // 1. Static ID for Vibe-Coding testing
  // const currentStaffId = "ST-123-UUID"; 
  const currentStaffId = "60691c7a-3b54-4231-944d-da95f114fa85"; 

  // 2. Fetch Task Data using robust Joins
  const results = await db
    .select({
      timelineId: qmsTimelines.id,
      startTime: qmsTimelines.startTime,
      appNumber: applications.applicationNumber,
      companyName: companies.name,
    })
    .from(qmsTimelines)
    .innerJoin(applications, eq(qmsTimelines.applicationId, applications.id))
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(and(
        eq(qmsTimelines.applicationId, applicationId),
        eq(qmsTimelines.division, division.toUpperCase()),
        isNull(qmsTimelines.endTime)
    ))
    .limit(1);

  const task = results[0];
  if (!task) return <div className="p-10">Task not found or already completed.</div>;

  // 3. Generate Supabase URL for the iFrame
  // const dossierPath = `${task.appNumber}/main_dossier.pdf`;
  const dossierPath = `0.9554887811327575.pdf`;
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl(dossierPath);

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      {/* LEFT: PDF VIEWER (2/3 Screen) */}
      <div className="w-2/3 h-full border-r bg-gray-200">
        <iframe 
          src={`${urlData.publicUrl}#view=FitH&toolbar=0`} 
          className="w-full h-full"
          title="Dossier"
        />
      </div>

      {/* RIGHT: CONTROL PANEL (1/3 Screen) */}
      <div className="w-1/3 h-full flex flex-col p-6 bg-white overflow-y-auto">
        <div className="mb-8 border-b pb-4">
          <h1 className="text-xl font-black text-slate-900 uppercase italic">Technical Review</h1>
          <p className="text-sm font-mono text-blue-600">{task.appNumber}</p>
          <p className="font-bold text-gray-700">{task.companyName}</p>
        </div>

        <div className="flex-grow">
          <ReviewSubmissionForm 
            appId={applicationId} 
            division={division} 
            staffId={currentStaffId} 
          />
        </div>

        <div className="mt-8 pt-4 border-t">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Time Remaining (QMS)</p>
          <QMSCountdown startTime={task.startTime!} />
        </div>
      </div>
    </div>
  );
}