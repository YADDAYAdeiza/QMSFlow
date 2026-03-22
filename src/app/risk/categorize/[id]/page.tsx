import { getApplicationForEditing } from "@/lib/actions/risk";
import LODEntryForm from "@/components/LODEntryForm";
import { notFound } from "next/navigation";

// Next.js 15 requirement: Params must be handled as a Promise
interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function CategorizationPage({ params }: PageProps) {
  const { id } = await params;
  const applicationId = parseInt(id);

  if (isNaN(applicationId)) return notFound();

  const result = await getApplicationForEditing(applicationId);
  if (!result.success || !result.data) return notFound(); 

  return (
    <div className="p-10 bg-slate-50 min-h-screen">
      <div className="max-w-4xl mx-auto mb-10">
        <div className="flex items-center gap-3 mb-2">
           <span className="px-3 py-1 rounded-full bg-blue-600 text-white text-[9px] font-black uppercase">
             Pass 2: Compliance Vetting
           </span>
        </div>
        <h1 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter">
          Reviewing: <span className="text-blue-600">{result.data.appNumber}</span>
        </h1>
        <p className="text-slate-400 text-[11px] font-bold uppercase tracking-[0.2em] mt-2">
          {result.data.facilityName} — {result.data.facilityAddress}
        </p>
      </div>

      <div className="max-w-4xl mx-auto">
        <LODEntryForm 
          initialData={result.data} 
          isUpdate={true} 
        />
      </div>
    </div>
  );
}