import { createClient } from '@/utils/supabase/server';
import LedgerForm from "@/components/Vetstat/LedgerForm";
import CertificateEnrollment from "@/components/Vetstat/CertificateEnrollment";
import RegistrationDashboard from "@/components/Vetstat/RegistrationDashboard";
import {
  Ship,
  Flame,
  Stethoscope,
  ClipboardCheck,
  Activity,
  History
} from 'lucide-react';

export default async function LedgerPage({
  searchParams
}: {
  searchParams: Promise<{ type?: string }>
}) {
  const supabase = await createClient();
  
  const params = await searchParams;
  const activeType = (params.type as 'IMPORT' | 'DESTRUCTION' | 'CONSUMPTION') || 'IMPORT';

  // Fetching all regulatory data including existing registration history
  const [atcResponse, companiesResponse, ledgerResponse] = await Promise.all([
    supabase
      .from('atc_codes')
      .select('*')
      .order('substance'),
    supabase
      .from('permits')
    // ADDED: product_name and active_substance
    .select('id, company_name, permit_number, product_name, active_substance, shipping_pack_size') 
    .order('company_name', { ascending: true }),
    supabase
    .from('ledger_entries') 
    .select('*')
    .order('created_at', { ascending: false })
]);

  const atcCodes = atcResponse.data || [];
  const companies = companiesResponse.data || [];
  const registrationHistory = ledgerResponse.data || [];

  // Error handling for transparency in the regulatory workflow
  if (atcResponse.error) console.error("ATC Fetch Error:", atcResponse.error);
  if (companiesResponse.error) console.error("Permits Fetch Error:", companiesResponse.error.message);
  if (ledgerResponse.error) console.error("Ledger Fetch Error:", ledgerResponse.error);

  const tabConfig = {
    IMPORT: {
      icon: <Ship size={18} />,
      color: 'text-emerald-600',
      border: 'border-emerald-600',
      bg: 'bg-emerald-50'
    },
    DESTRUCTION: {
      icon: <Flame size={18} />,
      color: 'text-rose-600',
      border: 'border-rose-600',
      bg: 'bg-rose-50'
    },
    CONSUMPTION: {
      icon: <Stethoscope size={18} />,
      color: 'text-amber-600',
      border: 'border-amber-600',
      bg: 'bg-amber-50'
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 p-8 text-slate-900">
      <div className="max-w-5xl mx-auto">
        
        {/* Header Section */}
        <header className="mb-10 flex justify-between items-end">
          <div>
            <div className="flex items-center gap-2 mb-1">
                <Activity className="text-emerald-600" size={24} />
                <span className="text-xs font-black text-emerald-600 uppercase tracking-[0.2em]">Regulatory Portal</span>
            </div>
            <h1 className="text-4xl font-black text-slate-900 tracking-tight">
              Antimicrobial Ledger Hub
            </h1>
            <p className="text-slate-500 font-medium">Monitoring controlled substance lifecycle for VMD Oversight.</p>
          </div>
          
          <div className="flex flex-col items-end gap-3">
            {/* Added atcCodes prop to enable searchable substance dropdown */}
            <CertificateEnrollment 
              companies={companies} 
              atcCodes={atcCodes} 
            />
            
            <div className="hidden md:block text-right border-r-2 border-slate-200 pr-3">
               <span className="text-[10px] font-bold text-slate-400 uppercase block tracking-widest">Authored by</span>
               <span className="text-sm font-bold text-slate-700 italic text-nowrap">Divisional Deputy Director</span>
            </div>
          </div>
        </header>
        
        <div className="grid grid-cols-1 gap-8">
          
          {/* Section 1: Data Entry Form */}
          <section className="space-y-6">
            <div className="flex gap-2 bg-slate-200/50 p-1.5 rounded-xl w-fit">
              {Object.entries(tabConfig).map(([t, config]) => {
                const isActive = activeType === t;
                return (
                  <a
                    key={t}
                    href={`/Vetstat/Ledger?type=${t}`}
                    className={`flex items-center gap-2 px-6 py-2.5 rounded-lg font-bold text-sm transition-all duration-200 ${
                      isActive
                        ? `bg-white ${config.color} shadow-sm ring-1 ring-slate-200`
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'
                    }`}
                  >
                    {config.icon}
                    {t}
                  </a>
                );
              })}
            </div>

            <div className="bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200 overflow-hidden">
              <div className={`h-1.5 w-full ${tabConfig[activeType].border} bg-current opacity-20`} />
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-8 pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                        <div className={`p-3 rounded-xl ${tabConfig[activeType].bg} ${tabConfig[activeType].color}`}>
                            {tabConfig[activeType].icon}
                        </div>
                        <div>
                            <h2 className="text-xl font-black text-slate-800 leading-tight">
                                New {activeType} Entry
                            </h2>
                            <p className="text-xs text-slate-400 font-bold uppercase tracking-wider">Formal Log Submission</p>
                        </div>
                    </div>
                    <div className="flex items-center gap-1 text-slate-300">
                        <ClipboardCheck size={20} />
                    </div>
                </div>

                <LedgerForm
                  type={activeType}
                  atcCodes={atcCodes}
                  companies={companies}
                />
              </div>
            </div>
          </section>

          {/* Section 2: Management Dashboard (History) */}
          <section className="space-y-4 pt-10">
            <div className="flex items-center gap-2 border-b-2 border-slate-200 pb-2">
              <History className="text-slate-400" size={20} />
              <h2 className="text-lg font-black text-slate-700 uppercase tracking-tight">Registry Management</h2>
            </div>
            
            <RegistrationDashboard 
              initialData={registrationHistory} 
              atcCodes={atcCodes}
              companies={companies}
            />
          </section>

        </div>

        <footer className="mt-12 mb-8 text-center">
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest leading-loose">
                All ledger entries are subject to immediate audit under QMS requirements. <br/>
                Verify Shipping Pack Sizes prior to authorization.
            </p>
        </footer>
      </div>
    </div>
  );
}