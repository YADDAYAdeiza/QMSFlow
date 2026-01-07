import { db } from "@/db";
import { qmsTimelines, applications, companies } from "@/db/schema";
import { eq, asc } from "drizzle-orm";
import AuditTrail from "@/components/AuditTrail";
import { supabase } from "@/lib/supabase";

export default async function DirectorReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const appId = parseInt(id);

  // 1. Fetch History (Audit Trail)
  const history = await db.query.qmsTimelines.findMany({
    where: eq(qmsTimelines.applicationId, appId),
    orderBy: [asc(qmsTimelines.startTime)]
  });

  // 2. Fetch App Info
  const app = await db.query.applications.findFirst({
    where: eq(applications.id, appId),
    with: { company: true }
  });

  // 3. Dossier URL (Placeholder for testing)
  const { data: urlData } = supabase.storage.from('documents').getPublicUrl('0.9259922577723769.pdf');

  return (
    <div className="flex h-screen bg-slate-100 overflow-hidden">
      {/* LEFT: Dossier Preview */}
      <div className="w-1/2 h-full bg-white border-r">
         <iframe src={urlData.publicUrl} className="w-full h-full border-none" />
      </div>

      {/* RIGHT: Director's Panel */}
      <div className="w-1/2 h-full flex flex-col p-8 overflow-y-auto">
        <div className="mb-6">
          <h1 className="text-2xl font-black text-slate-900 tracking-tight">DIRECTORATE FINAL REVIEW</h1>
          <p className="text-slate-500">Application: <span className="font-mono font-bold text-blue-600">{app?.applicationNumber}</span></p>
        </div>

        {/* Audit Trail Section */}
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
          <h2 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-6">Workflow History & Timelines</h2>
          <AuditTrail segments={history} />
        </div>

        {/* Final Actions */}
        <div className="mt-auto bg-slate-900 p-6 rounded-xl text-white">
          <h3 className="text-sm font-bold mb-4 uppercase text-slate-400">Final Decision</h3>
          <div className="grid grid-cols-2 gap-4">
            <button className="bg-green-600 hover:bg-green-500 py-3 rounded font-bold transition-all">
              Issue Certificate
            </button>
            <button className="bg-red-600 hover:bg-red-500 py-3 rounded font-bold transition-all">
              Reject Application
            </button>
          </div>
          <p className="text-[10px] text-slate-500 mt-4 text-center">
            * This action will close the Director's clock and generate a final regulatory output.
          </p>
        </div>
      </div>
    </div>
  );
}