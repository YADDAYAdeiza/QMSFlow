import { db } from "@/db";
import { applications, companies } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import GMPReportWorkspace from "@/components/LocalInspectionReports/GMPReportWorkspace";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function LocalReportPage({ params }: PageProps) {
  const resolvedParams = await params;
  const targetId = resolvedParams.id;

  // Convert targetId from string to number to satisfy Drizzle's type check for eq
  const numericId = Number(targetId);
  if (isNaN(numericId)) {
    notFound();
  }

  // Fetch baseline tracking parameters
  const appData = await db
    .select({
      id: applications.id,
      companyId: applications.companyId,
      companyName: companies.name,
    })
    .from(applications)
    .leftJoin(companies, eq(applications.companyId, companies.id))
    .where(eq(applications.id, numericId)) // Clean match! No more squiggly line.
    .limit(1);

  const application = appData[0];

  if (!application) {
    notFound();
  }

  return (
    <div className="bg-slate-50 min-h-screen py-6">
      <GMPReportWorkspace 
        applicationId={application.id.toString()} // Converts number to string safely for the component prop
        companyId={application.companyId ? application.companyId.toString() : ""} // Converts companyId if it is numeric too
        companyName={application.companyName || "Unknown Manufacturing Site"}
      />
    </div>
  );
}