export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";
import Link from "next/link";

export default async function Page({ 
  params,
  searchParams 
}: { 
  params: Promise<{ id: string }>,
  searchParams: Promise<{ as?: string }> 
}) {
  const { id } = await params;
  const { as } = await searchParams;
  const appId = parseInt(id);

  const DD_VMD = "9215bf99-489e-4468-b9aa-bcd926d11c08"; 
  const DD_IRSD = "cfb8ccbd-7753-43f0-aa51-a9c449a52de6"; 
  const loggedInUserId = as === "irsd" ? DD_IRSD : DD_VMD;

  // ✅ FIX: Changed 'company' to 'localApplicant' to match schema.ts
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { 
      localApplicant: true,
      foreignFactory: true 
    }
  });

  if (!app) return <div className="p-20 text-center font-bold font-sans">Application Not Found</div>;

  const timelineSegments = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)],
  });

  const staffList = await db.select({ 
    id: users.id, 
    name: users.name,
    division: users.division,
    role: users.role 
  }).from(users);

  const appDetails = (app.details as Record<string, any>) || {};
  const history = Array.isArray(appDetails.comments) ? appDetails.comments : [];

  const latestAttachment = [...history].reverse().find((c: any) => c.attachmentUrl)?.attachmentUrl;
  
  const activePdfUrl = 
    appDetails.verificationReportUrl || 
    latestAttachment ||
    appDetails.technicalAssessmentUrl ||
    appDetails.inspectionReportUrl || 
    appDetails.poaUrl || 
    "";

  const cleanApp = {
    ...app,
    // ✅ Re-mapping localApplicant back to 'company' so the Client Component 
    // doesn't break if it's expecting 'app.company'
    company: app.localApplicant, 
    details: appDetails,
    narrativeHistory: history,
    hasEvidence: !!(appDetails.verificationReportUrl || latestAttachment || appDetails.technicalAssessmentUrl),
    latestCapas: ([...history].reverse().find((c: any) => c.observations?.capas)?.observations?.capas) || [],
  };

  return (
    <div className="relative">
      <div className="fixed top-4 right-8 z-[200] flex items-center gap-2 bg-white/90 backdrop-blur p-2 rounded-full border border-slate-200 shadow-2xl">
        <span className="text-[9px] font-black uppercase px-3 text-slate-400">Reviewing as:</span>
        <Link 
          href={`?as=vmd`}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as !== 'irsd' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          Technical DD (VMD)
        </Link>
        <Link 
          href={`?as=irsd`}
          className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as === 'irsd' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}
        >
          IRSD DD
        </Link>
      </div>

      <DeputyDirectorReviewClient 
        timeline={timelineSegments} 
        app={cleanApp} 
        staffList={staffList} 
        pdfUrl={activePdfUrl} 
        loggedInUserId={loggedInUserId} 
      />
    </div>
  );
}