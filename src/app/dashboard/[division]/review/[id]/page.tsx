import { db } from "@/db";
import { applications } from "@/db/schema";
import { eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import StaffReviewForm from "@/components/StaffReviewForm";

export default async function StaffReviewPage({ params }: { params: { division: string, id: string } }) {
  const appId = parseInt(params.id);
  
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  if (!app) notFound();

  // Extract relevant PDF from JSONB details
  const documentUrl = app.details.inputs.poaUrl || app.details.inputs.inspectionReportUrl;

  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* LEFT: PDF Viewer */}
      <div className="w-1/2 h-full border-r bg-black">
        <div className="p-3 bg-gray-900 text-white flex justify-between items-center">
          <span className="text-sm font-bold tracking-widest uppercase">Dossier View</span>
          <a href={documentUrl} target="_blank" className="text-xs bg-blue-600 px-3 py-1 rounded hover:bg-blue-500">
            Pop-out PDF
          </a>
        </div>
        {documentUrl ? (
          <iframe src={`${documentUrl}#toolbar=0`} className="w-full h-[calc(100%-44px)]" />
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">No document found.</div>
        )}
      </div>

      {/* RIGHT: History & Technical Finding Form */}
      <div className="w-1/2 h-full overflow-y-auto p-8 bg-white">
        <div className="mb-6 border-b pb-4">
          <h1 className="text-2xl font-bold text-gray-800">{app.applicationNumber}</h1>
          <p className="text-blue-600 font-medium">{app.type}</p>
          <p className="text-sm text-gray-500 mt-1">Company: {app.company?.name}</p>
        </div>

        {/* Previous Comments Trail */}
        <div className="mb-10">
          <h3 className="text-sm font-bold text-gray-400 uppercase mb-4 tracking-wider">Comment History</h3>
          <div className="space-y-4">
            {app.details.comments.map((comment, i) => (
              <div key={i} className="p-4 rounded-lg bg-gray-50 border-l-4 border-blue-400">
                <div className="flex justify-between text-xs mb-1">
                  <span className="font-bold text-gray-700">{comment.role} ({comment.from})</span>
                  <span className="text-gray-400">{new Date(comment.timestamp).toLocaleDateString()}</span>
                </div>
                <p className="text-sm text-gray-600 italic">"{comment.text}"</p>
              </div>
            ))}
          </div>
        </div>

        {/* Technical Input Form */}
        <StaffReviewForm appId={app.id} division={params.division} />
      </div>
    </div>
  );
}