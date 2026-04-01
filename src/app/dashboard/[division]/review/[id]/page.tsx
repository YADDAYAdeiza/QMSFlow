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
  params: Promise<{ division: string; id: string }>;
  searchParams: Promise<{ division?: string }>;
}

export default async function TechnicalReviewPage(props: PageProps) {
  // 1. UNWRAP PROMISES (Fixes: Cannot convert undefined or null to object)
  const { id } = await props.params;
  const sParams = await props.searchParams;
  
  const applicationId = parseInt(id);
  if (isNaN(applicationId)) return notFound();

  // 2. AUTH HANDSHAKE (Using getUser for Next.js 16/Turbopack stability)
  const supabase = createClient();
  const { data: { user }, error: authError } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect("/login");
  }

  // 3. FETCH DATA
  const appData = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { riskAssessments: true }
  });

  if (!appData) return notFound();

  // 4. EXTRACT JSONB & LOGIC
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

  // 5. SECURITY CHECK
  if (user.id !== staffIdToLookup) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50 text-center p-6">
        <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-rose-100 max-w-md">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900 leading-tight">Access Restricted</h2>
          <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest leading-relaxed">
            This dossier is currently locked to another officer's credentials. 
          </p>
          <div className="mt-6 pt-6 border-t border-slate-50">
            <span className="text-[8px] font-mono text-slate-300 uppercase">Secure Auth ID: {user.id.slice(0, 8)}...</span>
          </div>
        </div>
      </div>
    );
  }

  // 6. FETCH USER RECORD
  const [assignedUser] = await db
    .select()
    .from(users)
    .where(eq(users.id, user.id))
    .limit(1);

  if (!assignedUser) return notFound();

  // 7. RESOLVE DOCUMENT URL (Supabase 'Documents' Bucket)
  const rawPath = details.inspectionReportUrl || details.poaUrl || details.dossierPath;
  let publicUrl = "";
  if (rawPath) {
    if (rawPath.startsWith('http')) { 
      publicUrl = rawPath; 
    } else {
      const { data: urlData } = supabase.storage.from('Documents').getPublicUrl(rawPath);
      publicUrl = urlData.publicUrl;
    }
  }

  // 8. QMS TIMING LOGIC (Safeguarded against null segments)
  const allSegments = (await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(asc(qmsTimelines.startTime))) || [];

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
      {/* VIEWER PANEL (LEFT 2/3) */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-900 relative">
        <div className="absolute top-6 left-6 z-10 flex gap-2">
            <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-2xl flex items-center gap-2 border transition-colors ${
              isComplianceReview ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
                {isComplianceReview ? <ShieldAlert className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                {isComplianceReview ? 'Compliance Audit' : 'Technical Vetting'}
            </div>
        </div>
        
        {publicUrl ? (
          <iframe 
            src={`${publicUrl}#toolbar=0`} 
            className="w-full h-full border-none opacity-95 bg-slate-800" 
            key={isComplianceReview ? 'compliance' : 'technical'}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            Document Reference not found
          </div>
        )}
      </div>

      {/* SUBMISSION & HISTORY PANEL (RIGHT 1/3) */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-32">
          
          {/* RISK & COMPANY HEADER */}
          <div className="mb-8 flex items-center justify-between bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100">
            <div className="flex flex-col">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Risk</span>
              <div className={`px-3 py-1 rounded-full border text-[9px] font-black uppercase ${
                riskData?.intrinsicLevel === 'High' ? 'bg-rose-50 border-rose-100 text-rose-600' : 'bg-emerald-50 border-emerald-100 text-emerald-600'
              }`}>
                {riskData?.intrinsicLevel || "Low"}
              </div>
            </div>
            <div className="flex flex-col items-end">
              <span className="text-[7px] font-black text-slate-400 uppercase tracking-widest mb-1">Company</span>
              <span className="text-[10px] font-black text-slate-900 uppercase truncate max-w-[120px]">
                {details.companyName || "N/A"}
              </span>
            </div>
          </div>

          {/* COMPLIANCE AUDIT LEDGER */}
          {findingsLedger.length > 0 && (
            <div className="mb-10 animate-in fade-in slide-in-from-top-4 duration-700">
              <div className="flex items-center gap-2 mb-4">
                <ListChecks className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Compliance Audit Ledger</h3>
              </div>
              <div className="space-y-3">
                {findingsLedger.map((finding: any, idx: number) => (
                  <div key={idx} className="p-4 rounded-[1.5rem] bg-slate-50 border border-slate-100">
                    <div className="flex justify-between items-start mb-2">
                      <span className={`px-2 py-0.5 rounded text-[7px] font-black uppercase ${
                         finding.severity === 'Critical' ? 'bg-rose-500 text-white' : 'bg-slate-200 text-slate-600'
                      }`}>
                        {finding.severity || "Observation"}
                      </span>
                      <span className="text-[8px] font-bold text-slate-300">Round {finding.round || 1}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-relaxed font-medium">{finding.finding}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* AUDIT TRAIL (HISTORY) */}
          {auditTrail.length > 0 && (
            <div className="mb-10 opacity-60 hover:opacity-100 transition-opacity">
              <div className="flex items-center gap-2 mb-4">
                <History className="w-4 h-4 text-slate-400" />
                <h3 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Audit Trail</h3>
              </div>
              <div className="space-y-4 border-l-2 border-slate-50 ml-2 pl-6">
                {auditTrail.map((comment: any, idx: number) => (
                  <div key={idx} className="relative">
                    <div className="absolute -left-[31px] top-1 w-2 h-2 rounded-full bg-slate-200 border-2 border-white" />
                    <span className="text-[8px] font-black uppercase text-slate-400">
                      {comment.from} • {new Date(comment.timestamp).toLocaleDateString()}
                    </span>
                    <p className="text-[10px] text-slate-500 italic mt-1 line-clamp-2">{comment.text}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* FORM INTERFACE */}
          <ReviewSubmissionForm 
            appId={applicationId} 
            staffId={assignedUser.id} 
            staffName={assignedUser.name}
            comments={auditTrail}
            isHubVetting={isHubVetting}
            isComplianceReview={isComplianceReview}
            riskId={riskData?.id}
            previousFindings={findingsLedger}
            previousIsSra={prevIsSra}
          />
        </div>
        
        {/* QMS TIMER (STICKY) */}
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20 shadow-2xl">
          <QMSCountdown startTime={activeTask.startTime!} initialRemainingSeconds={remaining} />
        </div>
      </div>
    </div>
  );
}