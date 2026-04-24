export const dynamic = "force-dynamic";

import { db } from "@/db";
import { qmsTimelines, applications, users } from "@/db/schema";
import { eq, asc, isNull, and } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import QMSCountdown from "@/components/QMSCountdown";
import ReviewSubmissionForm from "@/components/ReviewSubmissionForm";
import { notFound, redirect } from "next/navigation";
import { Lock, ShieldAlert, FileText, Activity, FileCheck } from "lucide-react"; 

interface PageProps {
  params: Promise<{ id: string; division: string }>;
  searchParams: Promise<{ as?: string }>;
}

export default async function TechnicalReviewPage(props: PageProps) {
  const { id, division: urlDivision } = await props.params;
  const sParams = await props.searchParams;
  
  const applicationId = parseInt(id);
  if (isNaN(applicationId)) return notFound();

  const supabase = await createClient();
  const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();

  if (authError || !authUser) redirect("/login");

  // 1. FETCH PROFILE
  const [profile] = await db
    .select()
    .from(users)
    .where(eq(users.id, authUser.id))
    .limit(1);

  if (!profile) redirect("/login?error=unregistered");

  /**
   * SECURITY: ZONED ACCESS LOCK
   * We compare the user's assigned division in the DB against the URL.
   * We remove the hardcoded "VMD" fallback to support IRSD, PAD, etc.
   */
  const userDivision = (profile.division || "").toLowerCase().trim();
  const requestedDivision = urlDivision.toLowerCase().trim();

  // If the user isn't an Admin and tries to access a division they aren't assigned to
  if (profile.role !== "Admin" && userDivision !== requestedDivision) {
    console.warn(`🚨 ACCESS DENIED: ${profile.email} (Assigned: ${userDivision}) tried to review in ${requestedDivision} zone.`);
    return redirect(`/dashboard/${userDivision}`);
  }

  // 2. FETCH APPLICATION DATA
  const appData = await db.query.applications.findFirst({
    where: eq(applications.id, applicationId),
    with: { riskAssessments: true }
  });

  if (!appData) return notFound();

  const details = (appData.details as any) || {};
  const riskData = appData.riskAssessments?.[0] as any;

  /**
   * PASS LOGIC
   * determines if we show the initial Dossier (Pass 1) or Inspection Report (Pass 2)
   */
  const hasInspection = !!details.inspectionReportUrl;
  const hasStaffVerification = !!details.verificationReportUrl;

  const isComplianceReview = 
    details.isComplianceReview === true || 
    hasInspection || 
    appData.currentPoint === "Technical DD Review Return";

  // 3. STAFF ASSIGNMENT LOCK (File-level security)
  // Check if this specific file is actually assigned to this user
  const isHubVetting = appData.currentPoint === "IRSD Staff Vetting";
  const staffIdToLookup = isHubVetting ? details.irsd_reviewer_id : details.staff_reviewer_id;

  if (authUser.id !== staffIdToLookup && profile.role !== "Admin") {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-50">
        <div className="p-12 bg-white rounded-[3rem] shadow-2xl border border-rose-100 max-w-md text-center">
          <Lock className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h2 className="text-xl font-black uppercase italic text-slate-900">Access Restricted</h2>
          <p className="text-[10px] text-slate-400 mt-4 uppercase font-bold tracking-widest leading-relaxed">
            This dossier is locked to another officer's credentials.
          </p>
        </div>
      </div>
    );
  }

  // 4. URL RESOLUTION (Bucket: 'Documents')
  const activeDocPath = hasInspection ? details.inspectionReportUrl : details.poaUrl;
  const secondaryDocPath = hasStaffVerification ? details.verificationReportUrl : null;

  const getPath = (pathOrUrl: string) => {
    if (!pathOrUrl) return "";
    if (pathOrUrl.startsWith("http")) {
      const parts = pathOrUrl.split("/documents/");
      return parts.length > 1 ? parts[1] : pathOrUrl;
    }
    return pathOrUrl;
  };

  let publicUrl = "";
  if (activeDocPath) {
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(getPath(activeDocPath));
    publicUrl = urlData.publicUrl;
  }
  
  let secondaryUrl = "";
  if (secondaryDocPath) {
    const { data: secData } = supabase.storage.from('documents').getPublicUrl(getPath(secondaryDocPath));
    secondaryUrl = secData.publicUrl;
  }

  // 5. QMS TIMELINE & REMAINING TIME
  const allSegments = await db
    .select()
    .from(qmsTimelines)
    .where(eq(qmsTimelines.applicationId, applicationId))
    .orderBy(asc(qmsTimelines.startTime));

  const activeTask = allSegments.find(s => isNull(s.endTime) && s.staffId === authUser.id);
  
  if (!activeTask) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-slate-50 font-sans">
        <Activity className="w-12 h-12 text-slate-200 animate-pulse mb-4" />
        <div className="font-black uppercase text-slate-300 tracking-[0.3em] text-xs">Task Inactive</div>
        <p className="text-[8px] font-bold text-slate-400 mt-2">NO ACTIVE QMS SEGMENT FOUND FOR THIS USER</p>
      </div>
    );
  }

  // Calculate total seconds spent on this application by this staff member across all segments
  const secondsUsed = allSegments
    .filter(s => s.staffId === authUser.id)
    .reduce((acc, s) => (s.startTime && s.endTime) ? acc + Math.floor((s.endTime.getTime() - s.startTime.getTime()) / 1000) : acc, 0);

  // Default QMS TAT is 48 hours
  const remaining = (48 * 60 * 60) - secondsUsed;

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 font-sans">
      {/* --- VIEWER PANEL (LEFT) --- */}
      <div className="w-2/3 h-full border-r border-slate-200 bg-slate-900 relative">
        <div className="absolute top-6 left-6 z-10 flex gap-3">
            <div className={`px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-2xl flex items-center gap-2 border ${
              hasInspection ? 'bg-purple-600 border-purple-400 text-white' : 'bg-white border-slate-100 text-slate-900'
            }`}>
                {hasInspection ? <ShieldAlert className="w-3.5 h-3.5" /> : <FileText className="w-3.5 h-3.5" />}
                {hasInspection ? 'Pass 2: Inspection Report' : 'Pass 1: Intake Dossier'}
            </div>

            {secondaryUrl && (
              <a 
                href={secondaryUrl} 
                target="_blank" 
                rel="noreferrer" 
                className="px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase shadow-2xl flex items-center gap-2 border bg-emerald-600 text-white border-emerald-400 hover:bg-emerald-700 transition-all"
              >
                <FileCheck className="w-3 h-3" /> View Verification Report
              </a>
            )}
        </div>
        
        {publicUrl ? (
          <iframe src={`${publicUrl}#toolbar=0`} className="w-full h-full border-none opacity-95 bg-slate-800" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-slate-500 font-bold uppercase text-[10px] tracking-widest">
            Document Reference Not Found
          </div>
        )}
      </div>

      {/* --- ACTION PANEL (RIGHT) --- */}
      <div className="w-1/3 h-full flex flex-col bg-white overflow-y-auto custom-scrollbar">
        <div className="p-8 pb-32">
          <ReviewSubmissionForm 
            appId={applicationId} 
            staffId={profile.id} 
            staffName={profile.name || "Specialist"}
            currentDivision={userDivision.toUpperCase()} 
            comments={details.comments || []}
            isHubVetting={isHubVetting} 
            isComplianceReview={isComplianceReview}
            riskId={riskData?.id} 
            previousFindings={details.findings_ledger || details.findingsLedger || []}
            previousIsSra={details.is_sra || details.isSra || false}
          />
        </div>
        
        <div className="mt-auto p-6 border-t border-slate-100 bg-white sticky bottom-0 z-20 shadow-2xl">
          <QMSCountdown 
            startTime={activeTask.startTime!} 
            initialRemainingSeconds={remaining} 
          />
        </div>
      </div>
    </div>
  );
}