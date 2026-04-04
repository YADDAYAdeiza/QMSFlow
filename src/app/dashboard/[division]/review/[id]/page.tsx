export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc, isNull } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound, redirect } from "next/navigation";
import { Lock, ShieldAlert, FileText, Activity, History, ListChecks } from "lucide-react"; 

interface PageProps {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ as?: string }>;
}

export default async function TechnicalReviewPage(props: PageProps) {
  const { id } = await props.params;
  const sParams = await props.searchParams;
  
  const applicationId = parseInt(id);
  if (isNaN(applicationId)) return notFound();

  // Maintain division context (default to vmd)
  const currentDivision = sParams.as || "vmd";

  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  const appData = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { riskAssessments: true }
  });

  if (!appData) return notFound();

  const details = (appData.details as any) || {};
  const isComplianceReview = 
    details.isComplianceReview === true || 
    !!details.inspectionReportUrl || 
    appData.currentPoint === "Technical DD Review Return";

  const riskData = appData.riskAssessments?.[0] as any;
  const findingsLedger = details.findings_ledger || details.findingsLedger || [];
  const auditTrail = details.comments || [];
  const prevIsSra = details.is_sra || details.isSra || false;

  const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
  const staffIdToLookup = isHubVetting ? details.irsd_reviewer_id : details.staff_reviewer_id;

  // Security Check
  if (user.id !== staffIdToLookup) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-rose-100 max-w-md text-center">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Restricted</h2>
          <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest">
            This dossier is currently locked to another officer's credentials. 
          </p>
        </div>
      </div>
    );
  }

  const [assignedUser] = await db.select().from(users).where(eq(users.id, user.id)).limit(1);
  if (!assignedUser) return notFound();

  // Resolve URL from 'Documents' bucket
  const rawPath = details.inspectionReportUrl || details.poaUrl || details.dossierPath;
  let publicUrl = "";
  if (rawPath) {
    if (rawPath.startsWith('http')) { 
      publicUrl = rawPath; 
    } else {
      const { data: urlData } = supabase.storage.from('documents').getPublicUrl(rawPath);
      publicUrl = urlData.publicUrl;
    }
  }

  const allSegments = await db.select().from(qmsTimelines).where(eq(qmsTimelines.applicationId, applicationId)).orderBy(asc(qmsTimelines.startTime));
  const activeTask = allSegments.find(s => isNull(s.endTime) && s.staffId === assignedUser.id);
  
  if (!activeTask) return (
    <div className="p-20 text-center flex flex-col items-center justify-center h-screen bg-slate-50">
      <Activity className="w-12 h-12 text-slate-200 animate-pulse mb-4" />
      <div className="font-black uppercase text-slate-300 tracking-[0.3em]">Task Inactive</div>
    </div>
  );

  const secondsUsed = allSegments
    .filter(s => s.staffId === assignedUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  const remaining = (48 * 60 * 60) - secondsUsed;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* VIEWER PANEL */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-900 relative">
        <div className="absolute top-6 left-6 z-10">
            <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-2xl flex items-center gap-2 border ${
              isComplianceReview ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
                {isComplianceReview ? <ShieldAlert className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                {isComplianceReview ? 'Compliance Audit' : 'Technical Vetting'}
            </div>
        </div>
        
        {publicUrl ? (
          <iframe src={`${publicUrl}#toolbar=0`} className="w-full h-full border-none opacity-95 bg-slate-800" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-[10px]">
            Document Reference not found
          </div>
        )}
      </div>

      {/* ACTION PANEL */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-32">
          <ReviewSubmissionForm 
            appId={applicationId} 
            staffId={assignedUser.id} 
            staffName={assignedUser.name}
            currentDivision={currentDivision} // Passed for redirect logic
            comments={auditTrail}
            isHubVetting={isHubVetting}
            isComplianceReview={isComplianceReview}
            riskId={riskData?.id}
            previousFindings={findingsLedger}
            previousIsSra={prevIsSra}
          />
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20 shadow-2xl">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}