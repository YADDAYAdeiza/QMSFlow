'use client';
import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ShieldCheck, 
  X, 
  PackageSearch, 
  Landmark, 
  Search, 
  Building2,
  AlertCircle 
} from 'lucide-react';
import { enrollFPPHeader } from '@/lib/actions/Vetstat/Registration/registrationAction'; 

interface Company {
  id: string;
  company_name: string;
}

export default function CertificateEnrollment({ companies = [] }: { companies: Company[] }) {
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, setIsPending] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const router = useRouter();

  const filteredCompanies = useMemo(() => {
    if (!searchTerm) return [];
    return companies.filter(c => 
      c.company_name.toLowerCase().includes(searchTerm.toLowerCase())
    ).slice(0, 5);
  }, [searchTerm, companies]);

  const handleAction = async (formData: FormData) => {
    setIsPending(true);
    if (selectedCompany) {
      formData.set('company_name', selectedCompany.company_name);
    } else {
      formData.set('company_name', searchTerm);
    }

    try {
      const result = await enrollFPPHeader(formData);
      if (result.success) {
        router.refresh();
        setIsOpen(false);
        setSearchTerm('');
        setSelectedCompany(null);
      } else {
        alert(`Regulatory Error: ${result.message}`);
      }
    } catch (error) {
      alert("A system error occurred during enrollment.");
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
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <form action={handleAction} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col">
            
            {/* STICKY HEADER */}
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">FPP Registration</h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                   Master Data Enrollment [VMD]
                </p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            
            {/* SCROLLABLE BODY */}
            <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">NAFDAC Reg. Number</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    <Landmark size={14} />
                  </div>
                  <input name="nafdac_reg_no" placeholder="e.g., A4-XXXX" className="w-full border border-slate-200 pl-9 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium" required />
                </div>
              </div>
              
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Product Trade Name</label>
                <input name="product_name" placeholder="Enter FPP Trade Name" className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium" required />
              </div>

              <div className="p-4 bg-emerald-50/50 rounded-xl border border-emerald-100/50">
                <label className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                  <PackageSearch size={12} /> Shipping Pack Size
                </label>
                <input name="shipping_pack_size" placeholder="e.g., 40x2x10 tablets" className="w-full border border-emerald-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition bg-white font-medium" required />
              </div>

              {/* SEARCHABLE MAH SECTION - Added bottom padding buffer */}
              <div className="relative pb-32"> 
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">
                  Marketing Authorization Holder
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    {selectedCompany ? <Building2 size={14} className="text-emerald-600"/> : <Search size={14} />}
                  </div>
                  <input 
                    type="text"
                    value={selectedCompany ? selectedCompany.company_name : searchTerm}
                    onChange={(e) => {
                        setSearchTerm(e.target.value);
                        if (selectedCompany) setSelectedCompany(null);
                    }}
                    placeholder="Search for Manufacturer / Importer..." 
                    className={`w-full border p-3 pl-9 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition font-medium ${selectedCompany ? 'bg-emerald-50 border-emerald-200 text-emerald-900' : 'border-slate-200'}`}
                    required 
                  />
                  {selectedCompany && (
                    <button type="button" onClick={() => setSelectedCompany(null)} className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500">
                        <X size={14} />
                    </button>
                  )}
                </div>

                {/* Search Results Dropdown - High Z-Index */}
                {searchTerm && !selectedCompany && (
                  <div className="absolute mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[100] overflow-hidden">
                    {filteredCompanies.map((company) => (
                      <button
                        key={company.id}
                        type="button"
                        onClick={() => {
                            setSelectedCompany(company);
                            setSearchTerm('');
                        }}
                        className="w-full text-left p-3 hover:bg-slate-50 flex items-center gap-2 border-b border-slate-50 last:border-0"
                      >
                        <Building2 size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">{company.company_name}</span>
                      </button>
                    ))}
                    
                    <button
                        type="button"
                        onClick={() => {
                            const confirmed = confirm(`Register "${searchTerm}" as a new entity?`);
                            if (confirmed) setSelectedCompany({ id: 'NEW', company_name: searchTerm });
                        }}
                        className="w-full text-left p-3 bg-slate-50 hover:bg-emerald-50 flex items-center gap-2"
                      >
                        <Plus size={14} className="text-emerald-600" />
                        <span className="text-sm font-bold text-emerald-700">Add "{searchTerm}" as new MAH</span>
                      </button>
                  </div>
                )}
                
                {!selectedCompany && !searchTerm && (
                    <p className="text-[9px] text-slate-400 mt-1 italic">Type to search existing authorized entities.</p>
                )}
                {selectedCompany?.id === 'NEW' && (
                    <div className="mt-2 flex items-center gap-1 text-[10px] text-amber-600 font-bold uppercase tracking-tight">
                        <AlertCircle size={12} /> Creating New Record
                    </div>
                )}
              </div>
            </div>
            
            {/* STICKY FOOTER */}
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition">Cancel</button>
              <button type="submit" disabled={isPending} className="flex-1 bg-emerald-600 text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition disabled:opacity-50">
                {isPending ? 'Enrolling...' : <><ShieldCheck size={18}/> Authorize Enrollment</>}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}