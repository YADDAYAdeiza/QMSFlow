// @/app/dashboard/ddd/review/[id]/page.tsx
export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, users } from "@/db/schema";
import { eq } from "drizzle-orm";
import DeputyDirectorReviewClient from "@/components/DeputyDirectorReviewClient";
import Link from "next/link";
import { Landmark, Factory } from "lucide-react";

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

  // Simulation Map for Testing (Matches your User Summary / Saved Info)
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

  // Filter staff by the acting division for targeted assignment
  const currentDiv = as?.toUpperCase() || "VMD";
  const staffList = await db.select().from(users).where(eq(users.division, currentDiv));
  
  const riskRecord = app.riskAssessments?.[0] as any;
  const details = (app.details as any) || {};

  // ROUND 2 DETECTION
  const isComplianceReview = details?.type === "Inspection Report Review (Foreign)" || !!details?.inspectionReportUrl;

  const cleanApp = {
    ...app,
    company: app.localApplicant, 
    details,
    isComplianceReview, // Injecting context
    narrativeHistory: details.comments || [],
    
    // Risk Levels (Pass 1 vs Pass 2)
    intrinsicLevel: riskRecord?.intrinsicLevel ?? "Low",
    complianceLevel: riskRecord?.complianceLevel ?? null,
    
    // Evidence Data (The "Why")
    findingsLedger: details.findings_ledger || [],
    complianceSummary: details.compliance_summary || { criticalCount: 0, majorCount: 0, otherCount: 0 },
  };

  const currentReportUrl = details.inspectionReportUrl || details.verificationReportUrl || details.poaUrl || "";

  return (
    <div className="relative font-sans">
      {/* HUD: Acting Division Switcher */}
      <div className="fixed top-4 right-8 z-[200] flex items-center gap-2 bg-white/90 backdrop-blur p-2 rounded-full border border-slate-200 shadow-2xl">
        <div className={`px-3 py-1 rounded-full text-[9px] font-black uppercase flex items-center gap-2 ${isComplianceReview ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'}`}>
           {isComplianceReview ? <Landmark className="w-3 h-3" /> : <Factory className="w-3 h-3" />}
           {isComplianceReview ? "Round 2: Compliance" : "Round 1: Technical"}
        </div>
        <div className="h-4 w-[1px] bg-slate-200 mx-1" />
        <Link href={`?as=vmd`} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as !== 'irsd' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>VMD</Link>
        <Link href={`?as=irsd`} className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase transition-all ${as === 'irsd' ? 'bg-slate-900 text-white shadow-lg' : 'text-slate-500 hover:bg-slate-100'}`}>IRSD</Link>
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