export const dynamic = "force-dynamic";

import { db } from "@/db";
import { applications, companies, inspectionSchedules } from "@/db/schema";
import { eq } from "drizzle-orm";
import { createClient } from "@/utils/supabase/server"; 
import DDInspectionScheduler from "@/components/LocalInspectionReports/DDInspectionScheduler";
import { notFound } from "next/navigation";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function DDDApplicationReviewPage({ params }: PageProps) {
  const { id } = await params;
  const appId = parseInt(id, 10);

  if (isNaN(appId)) return notFound();

  // 1. Authenticate and pull user role context
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  // Replace with your actual user profile/metadata check mapping to QMS roles
  const userRole = user?.user_metadata?.role || "Divisional Deputy Director"; 

  // 2. Fetch critical dossier context AND existing schedule ID from database
  const applicationData = await db
    .select({
      id: applications.id,
      companyName: companies.name,
      scheduleId: inspectionSchedules.id, // Fetch the existing UUID primary key
    })
    .from(applications)
    .innerJoin(companies, eq(applications.companyId, companies.id))
    .leftJoin(inspectionSchedules, eq(applications.id, inspectionSchedules.applicationId))
    .where(eq(applications.id, appId))
    .then((res) => res[0]);

  if (!applicationData) return notFound();

  return (
    <main className="p-6 bg-slate-50 min-h-screen">
      <div className="max-w-5xl mx-auto mb-6">
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
          Dossier Assessment Workshop
        </h1>
        <p className="text-sm text-slate-500">
          Application Tracking ID: #{applicationData.id}
        </p>
      </div>

      {/* Inject the scheduling module directly into the canvas workflow */}
      <DDInspectionScheduler 
        applicationId={applicationData.id}
        scheduleId={applicationData.scheduleId || null}
        companyName={applicationData.companyName}
        userRole={userRole}
      />
    </main>
  );
}