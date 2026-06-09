'use client';
import { useState, useMemo, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Plus, ShieldCheck, X, PackageSearch, 
  Microscope, AlertCircle, Edit3,
  Globe, Activity, Zap, Check, ChevronRight, Loader2, Sparkles,
  Layers, Stethoscope, Building2
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

// VMD Uniform Master Categorization Lists
const DOSAGE_FORMS = [
  "Oral Powder", "Tablet", "Bolus", "Oral Solution", 
  "Injectable Solution", "Injectable Suspension", "Premix", 
  "Intramammary Ointment", "Vial", "Ampoule", "Capsule"
];

const THERAPEUTIC_CLASSES = [
  "Antibacterial", "Antiviral", "Antifungal", "Anti-protozoal", 
  "Anthelmintic", "Coccidiostat", "Ectoparasiticide", "Nonsteroidal Anti-Inflammatory Drug (NSAID)"
];

interface Company { 
  id: string; 
  company_name: string; 
  country_of_origin?: string | null;
}

interface ATCCode { 
  id: string; 
  substance: string; 
  vet_atc: string; 
  human_atc: string; 
}

const supabase = createClient();

export default function CertificateEnrollment({ 
  companies = [], 
  atcCodes = [],
  editData = null,
  companiesCatalog = [], 
  onClose 
}: { 
  companies: Company[], 
  atcCodes: ATCCode[],
  editData?: any | null,
  companiesCatalog: any[],
  onClose?: () => void
}) {
  const [isOpen, setIsOpen] = useState(!!editData);
  const [isPending, setIsPending] = useState(false);
  
  // Local Database/Form Field States
  const [regNumber, setRegNumber] = useState(editData?.permit_number || '');
  const [productName, setProductName] = useState(editData?.product_name || '');
  const [shippingPackSize, setShippingPackSize] = useState(editData?.shipping_pack_size || '');
  const [countryOfOrigin, setCountryOfOrigin] = useState(editData?.country_of_origin || "Nigeria");
  
  // States for Dosage Form and Therapeutic Class
  const [dosageForm, setDosageForm] = useState(editData?.dosage_form || "Oral Powder");
  const [therapeuticClass, setTherapeuticClass] = useState(editData?.therapeutic_class || "Antibacterial");

  const [substanceSearch, setSubstanceSearch] = useState('');
  const [selectedSubstance, setSelectedSubstance] = useState<ATCCode | null>(null);
  const [selectedRoutes, setSelectedRoutes] = useState<string[]>([]);
  
  // Combobox State management for the unified Company selector
  const [companySearch, setCompanySearch] = useState(editData?.resolved_company_name || '');
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(editData?.company_id || '');
  const [isCompanyDropdownOpen, setIsCompanyDropdownOpen] = useState(false);
  const companyContainerRef = useRef<HTMLDivElement>(null);

  // API Reference Lookup Indicators
  const [lookupStatus, setLookupStatus] = useState<'idle' | 'checking' | 'found' | 'not_found'>('idle');
  const lookupTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Keep stable values for hooks
  const companiesRef = useRef(companies);
  const catalogRef = useRef(companiesCatalog);
  const atcCodesRef = useRef(atcCodes);

  useEffect(() => { companiesRef.current = companies; }, [companies]);
  useEffect(() => { catalogRef.current = companiesCatalog; }, [companiesCatalog]);
  useEffect(() => { atcCodesRef.current = atcCodes; }, [atcCodes]);

  const router = useRouter();

  // Close company dropdown when clicking outside the component
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (companyContainerRef.current && !companyContainerRef.current.contains(event.target as Node)) {
        setIsCompanyDropdownOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Sync state when entering edit mode
  useEffect(() => {
    if (editData) {
      setIsOpen(true);
      setRegNumber(editData.permit_number || '');
      setProductName(editData.product_name || '');
      setShippingPackSize(editData.shipping_pack_size || '');
      setCountryOfOrigin(editData.country_of_origin || "Nigeria");
      setDosageForm(editData.dosage_form || "Oral Powder");
      setTherapeuticClass(editData.therapeutic_class || "Antibacterial");
      setSelectedCompanyId(editData.company_id || '');
      setCompanySearch(editData.resolved_company_name || '');
      
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
        const { data, error } = await supabase
          .from('napams_cache')
          .select('*')
          .ilike('nafdac_number', trimmedReg)
          .limit(1);

        if (error) throw error;

        if (data && data.length > 0) {
          const matchedRecord = data[0];
          setProductName(matchedRecord.product_name || '');
          setShippingPackSize(matchedRecord.raw_pack_size || '');
          
          if (matchedRecord.manufacturer_country && COUNTRIES.includes(matchedRecord.manufacturer_country)) {
            setCountryOfOrigin(matchedRecord.manufacturer_country);
          }

          // --- NORMALIZATION RUNWAY ---
          if (matchedRecord.dosage_form) {
            const rawForm = matchedRecord.dosage_form.trim().toLowerCase();
            const matchedForm = DOSAGE_FORMS.find(f => f.toLowerCase() === rawForm);
            if (matchedForm) {
              setDosageForm(matchedForm);
            } else {
              setDosageForm(rawForm.charAt(0).toUpperCase() + rawForm.slice(1));
            }
          }

          if (matchedRecord.pharmacological_class) {
            const rawClass = matchedRecord.pharmacological_class.trim().toLowerCase();
            const matchedClass = THERAPEUTIC_CLASSES.find(c => c.toLowerCase() === rawClass);
            if (matchedClass) {
              setTherapeuticClass(matchedClass);
            } else {
              if (rawClass.includes('nsaid')) {
                setTherapeuticClass("Nonsteroidal Anti-Inflammatory Drug (NSAID)");
              } else {
                setTherapeuticClass(rawClass.charAt(0).toUpperCase() + rawClass.slice(1));
              }
            }
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
            setCompanySearch(matchedRecord.applicant_name);
            const masterList = catalogRef.current.length > 0 ? catalogRef.current : companiesRef.current;
            const matchedCompany = masterList.find((c: any) => 
              c?.company_name?.toLowerCase() === matchedRecord.applicant_name.toLowerCase()
            );
            if (matchedCompany) {
              setSelectedCompanyId(matchedCompany.id);
            } else {
              setSelectedCompanyId(''); // Accept string field name cleanly as a completely new brand entry
            }
          }
          setLookupStatus('found');
        } else {
          setLookupStatus('not_found');
        }
      } catch (err: any) {
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

  // Filters the companies list based on what the user types in real-time
  const filteredCompanies = useMemo(() => {
    if (!companySearch) return companiesCatalog;
    const search = companySearch.toLowerCase();
    return companiesCatalog.filter((c: any) => 
      c?.company_name?.toLowerCase().includes(search)
    );
  }, [companySearch, companiesCatalog]);

  const handleClose = () => {
    setIsOpen(false);
    if (!editData) {
      setRegNumber('');
      setProductName('');
      setShippingPackSize('');
      setCountryOfOrigin('Nigeria');
      setDosageForm('Oral Powder');
      setTherapeuticClass('Antibacterial');
      setSubstanceSearch('');
      setSelectedCompanyId('');
      setCompanySearch('');
      setSelectedSubstance(null);
      setSelectedRoutes([]);
      setLookupStatus('idle');
    }
    if (onClose) onClose();
  };

  const handleAction = async (formData: FormData) => {
    setIsPending(true);
    
    formData.set('company_name', companySearch);
    formData.set('active_substance', selectedSubstance ? selectedSubstance.substance : (substanceSearch || '')); 
    formData.set('route_of_administration', selectedRoutes.join(', '));
    formData.set('dosage_form', dosageForm);
    formData.set('therapeutic_class', therapeuticClass);
    
    if (selectedSubstance) formData.set('atc_id', selectedSubstance.id);
    if (selectedCompanyId) formData.set('company_id', selectedCompanyId);

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
              
              <div className="grid grid-cols-3 gap-2">
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1">
                      <Zap size={10} /> Strength
                    </label>
                    <input 
                      name="strength" 
                      defaultValue={editData?.strength}
                      placeholder="e.g. 100mg" 
                      className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-medium" 
                      required 
                    />
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1">
                      <Layers size={10} /> Form
                    </label>
                    <select 
                      name="dosage_form"
                      value={dosageForm}
                      onChange={(e) => setDosageForm(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-medium bg-white cursor-pointer"
                      required
                    >
                      {DOSAGE_FORMS.map(form => (
                        <option key={form} value={form}>{form}</option>
                      ))}
                    </select>
                 </div>
                 <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block flex items-center gap-1">
                      <Stethoscope size={10} /> Class
                    </label>
                    <select 
                      name="therapeutic_class"
                      value={therapeuticClass}
                      onChange={(e) => setTherapeuticClass(e.target.value)}
                      className="w-full border border-slate-200 p-2.5 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none text-xs font-medium bg-white cursor-pointer"
                      required
                    >
                      {THERAPEUTIC_CLASSES.map(cls => (
                        <option key={cls} value={cls}>{cls}</option>
                      ))}
                    </select>
                 </div>
              </div>

              <div className="space-y-1">
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

              {/* Combobox Panel for unified custom typing and directory selection */}
              <div ref={companyContainerRef} className="relative pb-4">
                <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Company Name</label>
                <div className="relative">
                  <Building2 className="absolute left-3 top-3.5 text-slate-400" size={14} />
                  <input
                    type="text"
                    autoComplete="off"
                    value={companySearch}
                    onFocus={() => setIsCompanyDropdownOpen(true)}
                    onChange={(e) => {
                      const value = e.target.value;
                      setCompanySearch(value);
                      setIsCompanyDropdownOpen(true);
                      
                      // Check if what they typed exactly matches an item in our inventory
                      const match = companiesCatalog.find(
                        (c: any) => c.company_name.toLowerCase() === value.trim().toLowerCase()
                      );
                      if (match) {
                        setSelectedCompanyId(match.id);
                      } else {
                        setSelectedCompanyId(''); // Accepts input cleanly as an unregistered company name string
                      }
                    }}
                    placeholder="Type a new company or select authorized applicant..."
                    className={`w-full border p-3 pl-9 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none transition text-sm font-medium ${selectedCompanyId ? 'bg-emerald-50/40 border-emerald-300 text-slate-800' : 'border-slate-200 bg-white'}`}
                    required
                  />
                  {companySearch && (
                    <button
                      type="button"
                      onClick={() => { setCompanySearch(''); setSelectedCompanyId(''); }}
                      className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-rose-500"
                    >
                      <X size={14} />
                    </button>
                  )}
                </div>

                {isCompanyDropdownOpen && (
                  <div className="absolute mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-2xl z-[110] overflow-hidden max-h-48 overflow-y-auto">
                    {filteredCompanies.length > 0 ? (
                      filteredCompanies.map((company: any) => (
                        <button
                          key={company.id}
                          type="button"
                          onClick={() => {
                            setCompanySearch(company.company_name);
                            setSelectedCompanyId(company.id);
                            setIsCompanyDropdownOpen(false);
                          }}
                          className={`w-full text-left p-3 text-xs border-b border-slate-50 last:border-0 transition-colors flex justify-between items-center ${selectedCompanyId === company.id ? 'bg-emerald-50 font-bold text-emerald-800' : 'hover:bg-slate-50 text-slate-700'}`}
                        >
                          <span>{company.company_name}</span>
                          {selectedCompanyId === company.id && <Check size={12} className="text-emerald-600" />}
                        </button>
                      ))
                    ) : (
                      <div className="p-3 text-[11px] font-bold text-amber-700 bg-amber-50/40 flex items-center gap-1.5">
                        <Sparkles size={12} className="text-amber-600" />
                        <span>Brand new brand entity detected. Form will register string text.</span>
                      </div>
                    )}
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