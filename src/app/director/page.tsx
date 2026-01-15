import { supabase } from "@/lib/supabase"; // Ensure this path is correct
import { getDirectorInbox } from "@/app/actions/director";
import PushToDDDButton from "@/components/PushToDDDButton";
import AssignToDDDButton from "@/components/AssignToDDDButton";

export default async function DirectorPage() {
  const inbox = await getDirectorInbox();

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <h1 className="text-2xl font-bold mb-6">Director's Inbox (Awaiting Division Assignment)</h1>
      
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-gray-100">
            <tr>
              <th className="p-4 border-b">App #</th>
              <th className="p-4 border-b">Company</th>
              <th className="p-4 border-b">Documents</th>
              <th className="p-4 border-b">Assigned Divisions</th>
              <th className="p-4 border-b">Action</th>
            </tr>
          </thead>
          <tbody>
            {inbox.map((app) => (
              <tr key={app.id} className="hover:bg-gray-50">
                <td className="p-4 border-b font-mono">{app.applicationNumber}</td>
                <td className="p-4 border-b">{(app as any).company?.name}</td>
                <td className="p-4 border-b">
                  {(() => {
                    const details = (app.details as any);
                    // Extract filename from any of your possible URL fields
                    const rawUrl = details?.poaUrl || details?.inspectionReportUrl || "";
                    const filename = rawUrl.split('/').pop();

                    if (!filename) return <span className="text-slate-400 italic text-xs">No Document</span>;

                    // Use lowercase 'documents' as we identified earlier
                    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(filename);

                    return (
                      <a
                        href={urlData.publicUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 bg-blue-600 text-white rounded-md text-[10px] font-black uppercase tracking-widest hover:bg-blue-700 transition-all shadow-sm"
                      >
                        View Dossier ↗
                      </a>
                    );
                  })()}
              </td>
                <td className="p-4 border-b">
                  {(app.details as any).assignedDivisions.join(", ")}
                </td>
                <td className="p-4 border-b">
                  <AssignToDDDButton
                    appId={app.id} 
                    divisions={(app.details as any).assignedDivisions} 
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
