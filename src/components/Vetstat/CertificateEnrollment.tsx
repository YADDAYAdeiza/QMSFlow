'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, ShieldCheck, X, PackageSearch, 
  Search, Building2, Microscope, AlertCircle 
} from 'lucide-react';
import { enrollFPPHeader } from '@/lib/actions/Vetstat/Registration/registrationAction'; 

interface Company { 
  id: string; 
  company_name: string; 
}

interface ATCCode { 
  id: string; 
  substance: string; 
  vet_atc: string; 
  human_atc: string; 
}

export default function CertificateEnrollment({ 
  companies = [], 
  atcCodes = [] 
}: { 
  companies: Company[], 
  atcCodes: ATCCode[] 
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  
  // Search and Selection States
  const [searchTerm, setSearchTerm] = useState('');
  const [substanceSearch, setSubstanceSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSubstance, setSelectedSubstance] = useState<ATCCode | null>(null);
  
  const router = useRouter();

  // Search logic for ATC Codes (Substances)
  const filteredSubstances = useMemo(() => {
    if (!substanceSearch || selectedSubstance) return [];
    const search = substanceSearch.toLowerCase();
    
    return atcCodes.filter(a => {
      const name = a?.substance?.toLowerCase() || '';
      const vCode = a?.vet_atc?.toLowerCase() || '';
      const hCode = a?.human_atc?.toLowerCase() || '';
      return name.includes(search) || vCode.includes(search) || hCode.includes(search);
    }).slice(0, 8);
  }, [substanceSearch, atcCodes, selectedSubstance]);

  // Search logic for Companies
  const filteredCompanies = useMemo(() => {
    if (!searchTerm || selectedCompany) return [];
    const search = searchTerm.toLowerCase();

    return companies.filter(c => 
      (c?.company_name?.toLowerCase() || '').includes(search)
    ).slice(0, 5);
  }, [searchTerm, companies, selectedCompany]);

  const handleAction = async (formData: FormData) => {
    setIsPending(true);
    
    // Logic: If a company was clicked from the list, use that name. 
    // Otherwise, use the typed searchTerm (New Company).
    const mahName = selectedCompany ? selectedCompany.company_name : searchTerm;
    
    formData.set('company_name', mahName);
    formData.set('active_substance', selectedSubstance ? selectedSubstance.substance : substanceSearch); 
    
    // Pass the ATC ID if selected for backend precision
    if (selectedSubstance) formData.set('atc_id', selectedSubstance.id);

    try {
      const result = await enrollFPPHeader(formData);
      if (result.success) {
        router.refresh();
        setIsOpen(false);
        setSearchTerm('');
        setSubstanceSearch('');
        setSelectedCompany(null);
        setSelectedSubstance(null);
      } else {
        alert(`Regulatory Error: ${result.message}`);
      }
    } catch (error) {
      alert("A system error occurred.");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <>
      <button 
        onClick={() => setIsOpen(true)} 
        className="flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-800 transition shadow-lg shadow-emerald-900/20"
      >
        <Plus size={18} /> Enroll FPP Certificate
      </button>

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 text-slate-900">
          <form action={handleAction} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col">
            
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">FPP Registration</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">Master Data Enrollment [VMD]</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Reg Number</label>
                    <input name="nafdac_reg_no" placeholder="A4-XXXX" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" required />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Trade Name</label>
                    <input name="product_name" placeholder="FPP Name" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" required />
                 </div>
              </div>

              {/* ACTIVE SUBSTANCE SEARCH SECTION */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Active Substance (API)</label>
                <div className="relative">
                   <Microscope className="absolute left-3 top-3 text-slate-400" size={14} />
                   <input 
                    type="text" 
                    autoComplete="off"
                    value={selectedSubstance ? selectedSubstance.substance : substanceSearch}
                    onChange={(e) => {
                        setSubstanceSearch(e.target.value);
                        if (selectedSubstance) setSelectedSubstance(null);
                    }}
                    placeholder="Search API or ATC code..." 
                    className={`w-full border p-3 pl-9 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm font-medium ${selectedSubstance ? 'bg-blue-50 border-blue-200 text-blue-800' : 'border-slate-200'}`}
                    required 
                   />
                   {(selectedSubstance || substanceSearch) && (
                    <button 
                      type="button" 
                      onClick={() => { setSelectedSubstance(null); setSubstanceSearch(''); }} 
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>
                
                {filteredSubstances.length > 0 && (
                  <div className="absolute mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[110] overflow-hidden max-h-60 overflow-y-auto">
                    {filteredSubstances.map((s) => (
                      <button 
                        key={s.id} 
                        type="button" 
                        onClick={() => { setSelectedSubstance(s); setSubstanceSearch(''); }} 
                        className="w-full text-left p-3 hover:bg-emerald-50 border-b border-slate-50 last:border-0 transition-colors group"
                      >
                        <div className="text-xs font-bold text-slate-700 group-hover:text-emerald-700">{s.substance}</div>
                        <div className="flex gap-2 mt-1">
                          {s.vet_atc && <span className="text-[9px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-500 font-mono">V: {s.vet_atc}</span>}
                          {s.human_atc && <span className="text-[9px] bg-blue-50 px-1.5 py-0.5 rounded text-blue-500 font-mono">H: {s.human_atc}</span>}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <label className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                  <PackageSearch size={12} /> Shipping Pack Size
                </label>
                <input name="shipping_pack_size" placeholder="e.g., 40x2x10" className="w-full border border-emerald-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium" required />
              </div>

              {/* MAH SEARCH / INPUT SECTION */}
              <div className="relative pb-10"> 
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Marketing Authorization Holder (MAH)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    {selectedCompany ? <Building2 size={14} className="text-emerald-600"/> : <Search size={14} />}
                  </div>
                  <input 
                    type="text"
                    autoComplete="off"
                    value={selectedCompany ? selectedCompany.company_name : searchTerm}
                    onChange={(e) => { 
                      setSearchTerm(e.target.value); 
                      if (selectedCompany) setSelectedCompany(null); 
                    }}
                    placeholder="Search or type new company..." 
                    className={`w-full border p-3 pl-9 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm font-medium ${selectedCompany ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'border-slate-200'}`}
                    required 
                  />
                  {(selectedCompany || searchTerm) && (
                    <button 
                      type="button" 
                      onClick={() => { setSelectedCompany(null); setSearchTerm(''); }} 
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {/* MAH Dropdown Results */}
                {filteredCompanies.length > 0 && (
                  <div className="absolute mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden">
                    {filteredCompanies.map((company) => (
                      <button 
                        key={company.id} 
                        type="button" 
                        onClick={() => { setSelectedCompany(company); setSearchTerm(''); }} 
                        className="w-full text-left p-3 hover:bg-emerald-50 flex items-center gap-2 border-b border-slate-50 last:border-0 transition-colors"
                      >
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">{company.company_name}</span>
                      </button>
                    ))}
                  </div>
                )}
                
                {/* Visual indicator for New Company input */}
                {searchTerm && !selectedCompany && filteredCompanies.length === 0 && (
                  <div className="mt-2 flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase italic">Registering as a new entity</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50 text-sm shadow-lg shadow-emerald-900/10">
                {isPending ? 'Enrolling...' : <><ShieldCheck size={18}/> Authorize Enrollment</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}