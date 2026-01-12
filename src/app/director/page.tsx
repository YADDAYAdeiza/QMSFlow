import { getDirectorInbox } from "@/app/actions/director";
import PushToDDDButton from "@/components/PushToDDDButton";

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
                    // Look for the URL in multiple possible locations
                    const details = (app.details as any);
                    const docUrl = details?.inspectionReportUrl || 
                                  details?.poaUrl || 
                                  details?.inputs?.poaUrl || 
                                  details?.inputs?.inspectionReportUrl;

                    if (!docUrl) return <span className="text-slate-400 italic text-xs">No Document</span>;

                    return (
                      <a
                        href={docUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:underline font-bold text-sm"
                      >
                        VIEW DOSSIER ↗
                      </a>
                    );
                  })()}
                </td>
                <td className="p-4 border-b">
                  {(app.details as any).assignedDivisions.join(", ")}
                </td>
                <td className="p-4 border-b">
                  <PushToDDDButton
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
