export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc, and, isNull } from "drizzle-orm";
import { supabase } from "@/lib/supabase";
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound } from "next/navigation";
import { Lock } from "lucide-react"; 

interface PageProps {
  params: Promise<{ division: string; id: string }>;
  searchParams: Promise<{ division?: string }>;
}

export default async function TechnicalReviewPage({ params, searchParams }: PageProps) {
  const { division: pathDiv, id } = await params;
  const sParams = await searchParams;

  const applicationId = parseInt(id);
  if (isNaN(applicationId)) return notFound();

  const resolvedDivision = (sParams.division || pathDiv).toUpperCase();

  // 1. Fetch Application with Risk Data
  const appData = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { riskAssessments: true }
  });

  if (!appData) return notFound();

  const riskData = appData.riskAssessments?.[0] as any;
  const details = (appData.details as any) || {};
  
  // 2. Data Handshake: Extract the ledger directly from the details object
  const prevFindings = details.findings_ledger || [];
  const prevIsSra = details.is_sra || false;

  // 3. Resolve PDF URL from Supabase 'Documents' bucket
  const rawPath = details.poaUrl || details.dossierPath || details.reportUrl || ""; 
  let publicUrl = "";
  if (rawPath) {
    if (rawPath.startsWith('http')) { 
      publicUrl = rawPath; 
    } else {
      const { data: urlData } = supabase.storage.from('Documents').getPublicUrl(rawPath);
      publicUrl = urlData.publicUrl;
    }
  }

  // 4. Access Control Logic
  const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
  const staffIdToLookup = isHubVetting ? details.irsd_reviewer_id : details.staff_reviewer_id;

  const [assignedUser] = await db
    .select()
    .from(users)
    .where(and(eq(users.id, staffIdToLookup), eq(users.division, resolvedDivision)))
    .limit(1);

  if (!assignedUser) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center p-6">
        <div className="p-12 bg-white rounded-[3rem] shadow-xl border border-rose-100 max-w-md">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Denied</h2>
        </div>
      </div>
    );
  }

  // 5. QMS Timing Logic
  const allSegments = await db.select().from(qmsTimelines).where(eq(qmsTimelines.applicationId, applicationId)).orderBy(asc(qmsTimelines.startTime));
  const activeTask = allSegments.find(s => isNull(s.endTime) && s.staffId === assignedUser.id);
  
  if (!activeTask) return <div className="p-20 text-center font-black uppercase text-slate-300 tracking-widest">Task Inactive</div>;

  const secondsUsed = allSegments
    .filter(s => s.staffId === assignedUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  const remaining = (48 * 60 * 60) - secondsUsed;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50">
      {/* LEFT: PDF VIEWER */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-800 relative">
        <iframe src={`${publicUrl}#toolbar=0`} className="w-full h-full border-none" title="Dossier" />
      </div>

      {/* RIGHT: VETTING FORM */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto">
        <div className="p-8 pb-32">
          
          <div className="mb-8 flex items-center justify-between bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Intrinsic Risk</span>
              <div className="px-3 py-1 rounded-full border border-amber-200 bg-amber-50 text-amber-600 text-[9px] font-bold uppercase">
                {riskData?.intrinsicLevel || "Low"}
              </div>
            </div>
            
            <div className="flex flex-col items-end">
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest mb-1">Current Status</span>
              <div className="px-3 py-1 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-[9px] font-bold uppercase">
                {appData.status?.replace(/_/g, ' ')}
              </div>
            </div>
          </div>

          <ReviewSubmissionForm 
            appId={applicationId} 
            staffId={assignedUser.id} 
            staffName={assignedUser.name}
            comments={details.comments || []}
            isHubVetting={isHubVetting}
            riskId={riskData?.id}
            previousFindings={prevFindings}
            previousIsSra={prevIsSra}
          />
        </div>
        
        {/* STICKY QMS TIMER */}
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}