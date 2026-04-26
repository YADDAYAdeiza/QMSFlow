import { createClient } from '@/utils/supabase/server';
import LedgerForm from "@/components/Vetstat/LedgerForm";

export default async function LedgerPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ type?: string }> 
}) {
  const supabase = await createClient();
  
  // Await searchParams as per Next.js 15+ requirements
  const params = await searchParams;
  const activeType = (params.type as 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION') || 'IMPORT';

  // Fetch the ATC intelligence table
  const { data: atcCodes, error } = await supabase
    .from('atc_codes')
    .select('*')
    .order('substance');

  if (error) console.error("Supabase Error:", error);

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-blue-900">
      <div className="max-w-4xl mx-auto">
        {/* Header Section */}
        <header className="mb-8">
          <h1 className="text-3xl font-extrabold text-blue-950 mb-2">Antimicrobial Ledger Hub</h1>
          <p className="text-blue-600">Regulatory Oversight & Consumption Tracking</p>
        </header>
        
        {/* Tab Navigation */}
        <div className="flex gap-1 mb-6 border-b border-blue-200">
          {['IMPORT', 'DESTRUCTION', 'CONSUMPTION'].map((t) => (
            <a 
              key={t} 
              href={`/Vetstat/Ledger?type=${t}`}
              className={`px-6 py-3 font-semibold transition-all ${
                activeType === t 
                  ? 'border-b-2 border-blue-600 text-blue-700 bg-white rounded-t-lg' 
                  : 'text-blue-500 hover:text-blue-700'
              }`}
            >
              {t}
            </a>
          ))}
        </div>

        {/* Form Container */}
        <div className="bg-white p-8 rounded-2xl shadow-sm border border-blue-100">
          <h2 className="text-xl font-bold text-blue-950 mb-6 border-b pb-4">
            New {activeType} Entry
          </h2>
          <LedgerForm 
            type={activeType} 
            atcCodes={atcCodes || []} 
          />
        </div>
      </div>
    </div>
  );
}