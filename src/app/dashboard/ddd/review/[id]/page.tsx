export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
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

  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { 
      localApplicant: true,
      foreignFactory: true,
      riskAssessments: true 
    }
  });

  if (!app) return <div className="p-20 text-center font-bold font-sans text-slate-400">Application Not Found</div>;

  const staffList = await db.select().from(users);
  const riskRecord = app.riskAssessments?.[0] as any;
  const details = (app.details as any) || {};

  // Construct the clean data object for the DD
  const cleanApp = {
    ...app,
    company: app.localApplicant, 
    details,
    narrativeHistory: details.comments || [],
    
    // Risk Levels (Pass 1 vs Pass 2)
    intrinsicLevel: riskRecord?.intrinsicLevel ?? riskRecord?.intrinsic_level ?? "Low",
    complianceLevel: riskRecord?.complianceLevel ?? riskRecord?.compliance_level ?? null,
    
    // Evidence Data (The "Why")
    findingsLedger: details.findings_ledger || [],
    complianceSummary: details.compliance_summary || { criticalCount: 0, majorCount: 0, otherCount: 0 },
    
    overallRiskRating: riskRecord?.overallRiskRating ?? riskRecord?.overall_risk_rating ?? null,
  };

  const currentReportUrl = details.verificationReportUrl || details.technicalAssessmentUrl || details.poaUrl || "";

  return (
    <div className="relative">
      <div className="fixed top-4 right-8 z-[200] flex items-center gap-2 bg-white/90 backdrop-blur p-2 rounded-full border border-slate-200 shadow-2xl font-sans">
        <Link href={`?as=vmd`} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as !== 'irsd' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>Technical DD (VMD)</Link>
        <Link href={`?as=irsd`} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as === 'irsd' ? 'bg-rose-600 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>IRSD Hub</Link>
      </div>

      <DeputyDirectorReviewClient 
        app={cleanApp} 
        staffList={staffList} 
        pdfUrl={currentReportUrl} 
        loggedInUserId={loggedInUserId} 
      />
    </div>
  );
}