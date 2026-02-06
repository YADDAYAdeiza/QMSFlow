// // @/app/dashboard/director/review/[id]/page.tsx
// import { db } from "@/db";
// import { applications, users } from "@/db/schema";
// import { eq } from "drizzle-orm";
// import { notFound } from "next/navigation";
// import DirectorReviewClient from "./DirectorReviewClient";
// import { supabase } from "@/lib/supabase";

// export default async function DirectorReviewPage({ 
//   params 
// }: { 
//   params: Promise<{ id: string }> 
// }) {
//   const { id } = await params;

//   if (!id || id === "undefined") return notFound();
//   const appId = parseInt(id);
//   if (isNaN(appId)) return notFound();

//   const app = await db.query.applications.findFirst({
//     where: eq(applications.id, appId),
//     with: { company: true }
//   });

//   if (!app) return notFound();

//   const appDetails = (app.details as any) || {};
//   const commentsTrail = Array.isArray(appDetails.comments) ? appDetails.comments : [];
  
//   // Find the Endorsement from a Divisional Deputy Director
//   const dddMinute = [...commentsTrail]
//     .reverse()
//     .find((c: any) => 
//       (c.action === "ENDORSED_FOR_DIRECTOR" || c.action === "SUBMITTED_TO_DIRECTOR") && 
//       c.role === "Divisional Deputy Director"
//     );

//   /**
//    * ✅ FIX 1: Accessing the correct JSON key 'inspectionReportUrl'
//    * We also check 'reportUrl' as a fallback.
//    */
//   let finalPdfUrl = appDetails.inspectionReportUrl || appDetails.reportUrl || "";
  
//   // ✅ FIX 2: Using the correct case-sensitive bucket name 'Documents'
//   if (finalPdfUrl && !finalPdfUrl.startsWith('http')) {
//     const { data } = supabase.storage
//       .from('documents') 
//       .getPublicUrl(finalPdfUrl);
//     finalPdfUrl = data.publicUrl;
//   }

//   // Debugging log to verify the URL in terminal
//   console.log('Final Resolved PDF URL:', finalPdfUrl);

//   const cleanApp = {
//     ...app,
//     details: appDetails,
//     commentsTrail: commentsTrail,
//     // Provide the actual text from the endorsement
//     dddInstruction: dddMinute?.text || "Technical review complete. Awaiting final executive decision."
//   };

//   const usersList = await db.select({ 
//     id: users.id, 
//     name: users.name,
//     role: users.role,
//     division: users.division
//   }).from(users);

//   // Determine stream - your JSON shows "division": "VMD" in the latest comment
//   const activeStream = appDetails.division || dddMinute?.division || "VMD";

//   return (
//     <DirectorReviewClient 
//       app={cleanApp} 
//       usersList={usersList}
//       currentUserId="DIR-001" 
//       stream={activeStream}
//       pdfUrl={finalPdfUrl}
//     />
//   );
// }

// @/app/dashboard/director/review/[id]/page.tsx
import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import DirectorReviewClient from "./DirectorReviewClient";
import { supabase } from "@/lib/supabase";

export default async function DirectorReviewPage({ 
  params 
}: { 
  params: Promise<{ id: string }> 
}) {
  const { id } = await params;

  if (!id || id === "undefined") return notFound();
  const appId = parseInt(id);
  if (isNaN(appId)) return notFound();

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) return notFound();

  const appDetails = (app.details as any) || {};
  const commentsTrail = Array.isArray(appDetails.comments) ? appDetails.comments : [];
  
  // 1. Resolve the active stream (Priority: explicit key -> assigned list -> fallback)
  const activeStream = appDetails.division || appDetails.assignedDivisions?.[0] || "VMD";

  // 2. Find the technical endorsement from a Divisional Deputy Director
  const dddMinute = [...commentsTrail]
    .reverse()
    .find((c: any) => 
      (c.action === "ENDORSED_FOR_DIRECTOR" || c.action === "SUBMITTED_TO_DIRECTOR") && 
      c.role === "Divisional Deputy Director"
    );

  // 3. Resolve the PDF URL from 'inspectionReportUrl' (targeting the Supabase bucket)
  let finalPdfUrl = appDetails.inspectionReportUrl || appDetails.reportUrl || "";
  
  if (finalPdfUrl && !finalPdfUrl.startsWith('http')) {
    const { data } = supabase.storage
      .from('documents') // Case-sensitive bucket name
      .getPublicUrl(finalPdfUrl);
    finalPdfUrl = data.publicUrl;
  }

  const cleanApp = {
    ...app,
    details: appDetails,
    commentsTrail: commentsTrail,
    dddInstruction: dddMinute?.text || "Technical assessment finalized. Ready for executive sign-off."
  };

  const usersList = await db.select({ 
    id: users.id, 
    name: users.name,
    role: users.role,
    division: users.division
  }).from(users);

  return (
    <DirectorReviewClient 
      app={cleanApp} 
      usersList={usersList}
      currentUserId="DIR-001" 
      stream={activeStream}
      pdfUrl={finalPdfUrl}
    />
  );
}