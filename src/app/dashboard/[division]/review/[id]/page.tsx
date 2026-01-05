import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import StaffReviewForm from "@/components/StaffReviewForm";

export default async function StaffReviewPage({ 
  params 
}: { 
  params: Promise<{ division: string, id: string }> 
}) {
  // 1. UNWRAP PARAMS (Required in latest Next.js)
  const resolvedParams = await params;
  const appId = parseInt(resolvedParams.id);

  // 2. SAFETY CHECK: If it's not a number, the URL is wrong
  if (isNaN(appId)) {
    console.error("Invalid Application ID in URL:", resolvedParams.id);
    return notFound();
  }
  
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) return notFound();

  // Extract relevant PDF
  const documentUrl = (app.details as any).inputs.poaUrl || (app.details as any).inputs.inspectionReportUrl;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* LEFT: PDF Viewer */}
      <div className="w-1/2 h-full border-r bg-black">
        <div className="p-3 bg-gray-900 text-white flex justify-between items-center">
          <span className="text-sm font-bold tracking-widest uppercase">Dossier View</span>
        </div>
        {documentUrl ? (
          <iframe src={`${documentUrl}#toolbar=0`} className="w-full h-[calc(100%-44px)]" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500 bg-gray-800">No document found.</div>
        )}
      </div>

      {/* RIGHT: History & Technical Finding Form */}
      <div className="w-1/2 h-full overflow-y-auto p-8 bg-white">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{app.applicationNumber}</h1>
          <p className="text-blue-600 font-medium">{app.type}</p>
        </div>

        {/* Technical Input Form */}
        <StaffReviewForm appId={app.id} division={resolvedParams.division} />
      </div>
    </div>
  );
}