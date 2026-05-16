'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, ShieldCheck, X, PackageSearch, 
  Search, Building2, Microscope, AlertCircle, Edit3,
  Globe, Activity, Zap, Check, ChevronRight, Loader2, Sparkles
} from 'lucide-react';
import { enrollFPPHeader, updateFPPRegistration } from '@/lib/actions/Vetstat/Registration/registrationAction'; 
import { createClient } from '@/utils/supabase/client'; 

// Master Data Lists
const COUNTRIES = [
  "Nigeria", "India", "China", "United Kingdom", "USA", 
  "Germany", "Egypt", "South Africa", "Vietnam", "Pakistan", "France", "Malaysia",
  "Israel", "Spain"
];

const ROUTE_GROUPS = {
  "Oral": ["Oral"],
  "Parenteral": ["Intramuscular (IM)", "Intravenous (IV)", "Subcutaneous"],
  "Other": ["Topical", "Intramammary", "Intrauterine"]
};

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

// Instantiate outside component to guarantee a stable single instance reference across renders
const supabase = createClient();

export default function CertificateEnrollment({ 
  companies = [], 
  atcCodes = [],
  editData = null, 
  onClose 
}: { 
  companies: Company[], 
  atcCodes: ATCCode[],
  editData?: any | null,
  onClose?: () => void
}) {
  const [isOpen, setIsOpen] = useState(!!editData);
  const [isPending, setIsPending] = useState(false);
  
  // Local Database/Form Field States
  const [regNumber, setRegNumber] = useState(editData?.permit_number || '');
  const [productName, setProductName] = useState(editData?.product_name || '');
  const [shippingPackSize, setShippingPackSize] = useState(editData?.shipping_pack_size || '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(editData?.country_of_origin || "Nigeria");

  const [searchTerm, setSearchTerm] = useState('');
  const [substanceSearch, setSubstanceSearch] = useState('');
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [selectedSubstance, setSelectedSubstance] = useState<ATCCode | null>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  
  // API Reference / Lookup Status Indicators
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastInitializedIdRef = useRef<string | null>(null);

  // Sync prop arrays into refs to protect the lookup routine from parent reference updates
  const companiesRef = useRef(companies);
  const atcCodesRef = useRef(atcCodes);

  useEffect(() => { companiesRef.current = companies; }, [companies]);
  useEffect(() => { atcCodesRef.current = atcCodes; }, [atcCodes]);

  const router = useRouter();

  // Sync state when entering edit mode (guarded against reference resets while typing)
  useEffect(() => {
    if (editData && editData.id !== lastInitializedIdRef.current) {
      lastInitializedIdRef.current = editData.id;
      setIsOpen(true);
      setRegNumber(editData.permit_number || '');
      setProductName(editData.product_name || '');
      setShippingPackSize(editData.shipping_pack_size || '');
      setCountryOfOrigin(editData.country_of_origin || "Nigeria");
      setSearchTerm(editData.company_name || '');
      
      const matchedATC = atcCodes.find(a => a.substance === editData.active_substance);
      if (matchedATC) {
        setSelectedSubstance(matchedATC);
        setSubstanceSearch('');
      } else {
        setSelectedSubstance(null);
        setSubstanceSearch(editData.active_substance || '');
      }
      
      if (editData.route_of_administration) {
        setSelectedRoutes(editData.route_of_administration.split(', '));
      } else {
        setSelectedRoutes([]);
      }
    }
  }, [editData, atcCodes]);

  // Debounced Auto-Lookup on Registration Number Input
  useEffect(() => {
    if (editData) return; 
    
    const trimmedReg = regNumber.trim();
    if (trimmedReg.length < 4) {
      setLookupStatus('idle');
      return;
    }

    if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);

    setLookupStatus('checking');

    lookupTimeoutRef.current = setTimeout(async () => {
      try {
        // Changed from .maybeSingle() to .limit(1) to safely handle multiple matching rows
        const { data, error } = await supabase
          .from('napams_cache')
          .select('*')
          .ilike('nafdac_number', trimmedReg)
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const matchedRecord = data[0];
          console.log('Autofill registry reference data found: ', matchedRecord);
          setProductName(matchedRecord.product_name || '');
          setShippingPackSize(matchedRecord.raw_pack_size || '');
          
          if (matchedRecord.manufacturer_country && COUNTRIES.includes(matchedRecord.manufacturer_country)) {
            setCountryOfOrigin(matchedRecord.manufacturer_country);
          }

          if (matchedRecord.active_substance) {
            const matchedATC = atcCodesRef.current.find(a => a.substance.toLowerCase() === matchedRecord.active_substance.toLowerCase());
            if (matchedATC) {
              setSelectedSubstance(matchedATC);
              setSubstanceSearch('');
            } else {
              setSelectedSubstance(null);
              setSubstanceSearch(matchedRecord.active_substance);
            }
          }

          if (matchedRecord.applicant_name) {
            const matchedCompany = companiesRef.current.find(c => c.company_name.toLowerCase() === matchedRecord.applicant_name.toLowerCase());
            if (matchedCompany) {
              setSelectedCompany(matchedCompany);
              setSearchTerm('');
            } else {
              setSelectedCompany(null);
              setSearchTerm(matchedRecord.applicant_name);
            }
          }

          setLookupStatus('found');
        } else {
          setLookupStatus('not_found');
        }
      } catch (err: any) {
        console.error("Lookup error details:", {
          message: err?.message || err,
          code: err?.code,
          details: err?.details,
          hint: err?.hint
        });
        setLookupStatus('not_found');
      }
    }, 600); 

    return () => {
      if (lookupTimeoutRef.current) clearTimeout(lookupTimeoutRef.current);
    };
  }, [regNumber, editData]);

  const toggleRoute = (route: string) => {
    setSelectedRoutes(prev => 
      prev.includes(route) ? prev.filter(r => r !== route) : [...prev, route]
    );
  };

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

  const filteredCompanies = useMemo(() => {
    if (!searchTerm || selectedCompany) return [];
    const search = searchTerm.toLowerCase();
    return companies.filter(c => 
      (c?.company_name?.toLowerCase() || '').includes(search)
    ).slice(0, 5);
  }, [searchTerm, companies, selectedCompany]);

  const handleClose = () => {
    setIsOpen(false);
    setRegNumber('');
    setProductName('');
    setShippingPackSize('');
    setCountryOfOrigin('Nigeria');
    setSearchTerm('');
    setSubstanceSearch('');
    setSelectedCompany(null);
    setSelectedSubstance(null);
    setSelectedRoutes([]);
    setLookupStatus('idle');
    lastInitializedIdRef.current = null;
    if (onClose) onClose();
  };

  const handleAction = async (formData: FormData) => {
    setIsPending(true);
    const mahName = selectedCompany ? selectedCompany.company_name : searchTerm;
    formData.set('company_name', mahName);
    formData.set('active_substance', selectedSubstance ? selectedSubstance.substance : (substanceSearch || '')); 
    formData.set('route_of_administration', selectedRoutes.join(', '));
    if (selectedSubstance) formData.set('atc_id', selectedSubstance.id);

    try {
      const result = editData 
        ? await updateFPPRegistration(editData.id, formData)
        : await enrollFPPHeader(formData);

      if (result.success) {
        router.refresh();
        handleClose();
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
      {!editData && (
        <button 
          onClick={() => setIsOpen(true)} 
          className="flex items-center gap-2 bg-emerald-700 text-white px-5 py-2.5 rounded-xl font-bold hover:bg-emerald-800 transition shadow-lg shadow-emerald-900/20"
        >
          <Plus size={18} /> Enroll FPP Certificate
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center z-[100] p-4 text-slate-900">
          <form action={handleAction} className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-200 flex flex-col">
            
            <div className="bg-slate-50 p-6 border-b border-slate-100 flex justify-between items-center shrink-0">
              <div>
                <h2 className="text-xl font-black text-slate-800 tracking-tight">
                  {editData ? 'Edit Registration' : 'FPP Registration'}
                </h2>
                <p className="text-[10px] text-emerald-600 font-bold uppercase tracking-widest">
                  {editData ? 'Updating Master Record' : 'Master Data Enrollment [VMD]'}
                </p>
              </div>
              <button type="button" onClick={handleClose} className="text-slate-400 hover:text-slate-600 transition">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-6 space-y-4 max-h-[65vh] overflow-y-auto custom-scrollbar">
              
              {/* Row 1: Reg No & Trade Name */}
              <div className="grid grid-cols-2 gap-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Reg Number</label>
                    <input 
                      name="nafdac_reg_no" 
                      value={regNumber}
                      onChange={(e) => setRegNumber(e.target.value)}
                      placeholder="A4-XXXX" 
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" 
                      required 
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Trade Name</label>
                    <input 
                      name="product_name" 
                      value={productName}
                      onChange={(e) => setProductName(e.target.value)}
                      placeholder="FPP Name" 
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" 
                      required 
                    />
                 </div>
              </div>

              {/* API Verification Notice Box */}
              {!editData && lookupStatus !== 'idle' && (
                <div className={`p-2.5 rounded-xl border text-[11px] font-bold flex items-center gap-2 transition-all duration-300 ${
                  lookupStatus === 'checking' ? 'bg-slate-50 border-slate-200 text-slate-600 animate-pulse' :
                  lookupStatus === 'found' ? 'bg-emerald-50/60 border-emerald-200 text-emerald-800' :
                  'bg-amber-50 border-amber-200 text-amber-800'
                }`}>
                  {lookupStatus === 'checking' && (
                    <>
                      <Loader2 size={14} className="animate-spin text-slate-500" />
                      <span>Querying reference tables...</span>
                    </>
                  )}
                  {lookupStatus === 'found' && (
                    <>
                      <Sparkles size={14} className="text-emerald-600" />
                      <span>Registry Record Linked! Data has been populated below.</span>
                    </>
                  )}
                  {lookupStatus === 'not_found' && (
                    <>
                      <AlertCircle size={14} className="text-amber-600" />
                      <span>Not found in reference table. Please fill fields manually.</span>
                    </>
                  )}
                </div>
              )}

              {/* Row 2: API Selection */}
              <div className="relative">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Active Substance (API)</label>
                <div className="relative">
                    <Microscope className="absolute left-3 top-3 text-slate-400" size={14} />
                    <input 
                     type="text" 
                     autoComplete="off"
                     value={selectedSubstance ? selectedSubstance.substance : (substanceSearch || '')}
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

              {/* Row 3: Strength & Route Groupings */}
              <div className="space-y-3">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1">
                      <Zap size={10} /> Strength
                    </label>
                    <input 
                      name="strength" 
                      defaultValue={editData?.strength}
                      placeholder="e.g. 100mg/ml" 
                      className="w-full border border-slate-200 p-3 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-sm font-medium" 
                      required 
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-2 block flex items-center gap-1">
                      <Activity size={10} /> Route(s) of Administration
                    </label>
                    <div className="space-y-3">
                      {Object.entries(ROUTE_GROUPS).map(([group, routes]) => (
                        <div key={group} className="space-y-1">
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-tighter flex items-center gap-1">
                            <ChevronRight size={8} /> {group}
                          </span>
                          <div className="grid grid-cols-2 gap-2">
                            {routes.map((route) => (
                              <button
                                key={route}
                                type="button"
                                onClick={() => toggleRoute(route)}
                                className={`flex items-center gap-2 p-2 rounded-lg border text-[11px] font-bold transition-all ${
                                  selectedRoutes.includes(route) 
                                  ? 'bg-emerald-50 border-emerald-500 text-emerald-700' 
                                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                                }`}
                              >
                                <div className={`w-3 h-3 rounded border flex items-center justify-center transition-colors ${
                                  selectedRoutes.includes(route) ? 'bg-emerald-500 border-emerald-500' : 'bg-white border-slate-300'
                                }`}>
                                  {selectedRoutes.includes(route) && <Check size={8} className="text-white" strokeWidth={4} />}
                                </div>
                                {route}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                 </div>
              </div>

              {/* Row 4: Pack Size & Country Dropdown */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50/30 rounded-xl border border-emerald-100/50">
                  <label className="text-[10px] font-bold text-emerald-700 uppercase mb-1 flex items-center gap-1">
                    <PackageSearch size={12} /> Pack Size
                  </label>
                  <input 
                    name="shipping_pack_size" 
                    value={shippingPackSize}
                    onChange={(e) => setShippingPackSize(e.target.value)}
                    placeholder="40x2x10" 
                    className="w-full border border-emerald-200 p-2 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none bg-white text-sm font-medium" 
                    required 
                  />
                </div>
                <div className="p-3 bg-blue-50/30 rounded-xl border border-blue-100/50">
                  <label className="text-[10px] font-bold text-blue-700 uppercase mb-1 flex items-center gap-1">
                    <Globe size={12} /> Origin
                  </label>
                  <select 
                    name="country_of_origin" 
                    value={countryOfOrigin}
                    onChange={(e) => setCountryOfOrigin(e.target.value)}
                    className="w-full border border-blue-200 p-2 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-sm font-medium cursor-pointer"
                    required
                  >
                    {COUNTRIES.map(country => (
                      <option key={country} value={country}>{country}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Row 5: MAH Selection */}
              <div className="relative pb-4"> 
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Marketing Authorization Holder (MAH)</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-3 flex items-center pointer-events-none text-slate-400">
                    {selectedCompany ? <Building2 size={14} className="text-emerald-600"/> : <Search size={14} />}
                  </div>
                  <input 
                    type="text"
                    autoComplete="off"
                    value={selectedCompany ? selectedCompany.company_name : (searchTerm || '')}
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
                
                {searchTerm && !selectedCompany && filteredCompanies.length === 0 && (
                  <div className="mt-2 flex items-center gap-2 text-amber-600 bg-amber-50 p-2 rounded-lg border border-amber-100">
                    <AlertCircle size={12} />
                    <span className="text-[10px] font-bold uppercase italic">Registering as a new entity</span>
                  </div>
                )}
              </div>
            </div>
            
            <div className="p-6 bg-slate-50 border-t border-slate-100 flex gap-3 shrink-0">
              <button type="button" onClick={handleClose} className="flex-1 bg-white border border-slate-200 p-3 rounded-xl font-bold text-slate-600 hover:bg-slate-100 transition text-sm">Cancel</button>
              <button type="submit" disabled={isPending} className={`flex-1 ${editData ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-600 hover:bg-emerald-700'} text-white p-3 rounded-xl font-bold flex items-center justify-center gap-2 transition disabled:opacity-50 text-sm shadow-lg shadow-emerald-900/10`}>
                {isPending ? 'Processing...' : (
                  <>
                    {editData ? <Edit3 size={18}/> : <ShieldCheck size={18}/>} 
                    {editData ? 'Authorize Update' : 'Authorize Enrollment'}
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}