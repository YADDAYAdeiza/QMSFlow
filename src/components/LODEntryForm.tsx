"use client"

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { CompanySearch } from './CompanySearch';
import { 
  Plus, Trash2, Globe, Building2, Save, Loader2, 
  MessageSquare, Share2, X, ChevronDown, Mail, RefreshCcw,
  CheckCircle2, ArrowRight, Activity, ShieldAlert
} from 'lucide-react';
import { cn } from "@/lib/utils";

const CURRENT_USER = { 
  id: "477d0494-3cfc-44c1-979d-5602eb01aabe", 
  name: "LOD", 
  role: "Specialist" 
};

const DIVISION_OPTIONS = ["VMD", "PAD", "AFPD", "IRSD"];

const RISK_CATEGORIES = [
  { name: "VACCINES / BIOLOGICALS", comp: 3, crit: 3 },
  { name: "STERILE INJECTABLES", comp: 3, crit: 2 },
  { name: "POWDER BETA-LACTAMS", comp: 2, crit: 3 },
  { name: "TABLETS (GENERAL)", comp: 1, crit: 2 },
  { name: "MULTIVITAMINS", comp: 1, crit: 1 },
];

const getRiskLevel = (score: number) => {
  if (score >= 7) return { label: "High", color: "bg-rose-500 text-white" };
  if (score >= 4) return { label: "Medium", color: "bg-amber-500 text-white" };
  if (score >= 1) return { label: "Low", color: "bg-emerald-500 text-white" };
  return null;
};

function CreatableSelect({ value, onChange, options, placeholder, onSelectOption }: any) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setIsOpen(false);
    };
    window.addEventListener('mousedown', handleClick);
    return () => window.removeEventListener('mousedown', handleClick);
  }, []);

  const filteredOptions = (options || []).filter((opt: any) => 
    opt.name?.toLowerCase().includes(search.toLowerCase())
  );
  const showCreateOption = search.length > 0 && !options?.some((opt: any) => opt.name?.toLowerCase() === search.toLowerCase());

  const handleSelect = (name: string, fullOption?: any) => {
    onChange(name);
    if (onSelectOption && fullOption) onSelectOption(fullOption);
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div className="relative flex-1" ref={containerRef}>
      <div 
        onClick={() => setIsOpen(!isOpen)}
        className="w-full bg-slate-50 p-4 rounded-xl text-[11px] font-bold uppercase flex items-center justify-between cursor-pointer border-2 border-transparent hover:border-slate-200 transition-all shadow-sm"
      >
        <span className={value ? "text-slate-900" : "text-slate-400"}>
          {value || placeholder}
        </span>
        <ChevronDown className={cn("w-3 h-3 transition-transform", isOpen && "rotate-180")} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden">
          <div className="p-2 border-b border-slate-50">
            <input 
              autoFocus
              placeholder="Filter..."
              className="w-full p-3 text-[10px] outline-none bg-slate-50 rounded-lg font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((opt: any, idx: number) => (
              <div 
                key={`${opt.id || idx}`}
                onClick={() => handleSelect(opt.name, opt)}
                className="p-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer"
              >
                {opt.name}
              </div>
            ))}
            {showCreateOption && (
              <div 
                onClick={() => handleSelect(search)}
                className="p-3 text-[10px] font-bold uppercase text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white cursor-pointer flex items-center gap-2"
              >
                <Plus className="w-3 h-3" /> Add: "{search}"
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function LODEntryForm({ initialData, isUpdate = false }: { initialData?: any; isUpdate?: boolean }) {
  const router = useRouter();
  const initialized = useRef(false);
  const [availableLines, setAvailableLines] = useState<any[]>(initialData?.productLines || []);
  const [showSuccess, setShowSuccess] = useState(false);

  const defaultValues = useMemo(() => ({
    appNumber: initialData?.appNumber || "", 
    type: isUpdate ? "Inspection Report Review (Foreign)" : (initialData?.type || "Facility Verification"), 
    companyName: initialData?.companyName || "", 
    companyAddress: initialData?.companyAddress || "", 
    notificationEmail: initialData?.notificationEmail || "",
    facilityName: initialData?.facilityName || "", 
    facilityAddress: initialData?.facilityAddress || "", 
    lodRemarks: "",
    productLines: initialData?.productLines || [{ lineName: "", riskCategory: "", products: [{ name: "" }] }],
    divisions: initialData?.divisions || ["VMD"], 
    poaUrl: initialData?.poaUrl || "", 
    inspectionReportUrl: initialData?.inspectionReportUrl || ""
  }), [initialData, isUpdate]);

  const { 
    register, handleSubmit, watch, setValue, control, reset, 
    formState: { isSubmitting } 
  } = useForm({
    resolver: zodResolver(lodFormSchema),
    defaultValues
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({ control, name: "productLines" });
  const watchProductLines = watch("productLines");

  useEffect(() => {
    if (initialData && !initialized.current) {
      reset(defaultValues);
      setAvailableLines(initialData.productLines || []);
      initialized.current = true;
    }
  }, [initialData, reset, defaultValues]);

  const handleGracefulExit = (path: string) => {
    // 1. Wipe the form data back to absolute defaults
    reset({
      appNumber: "", 
      type: "Facility Verification",
      companyName: "", 
      companyAddress: "", 
      notificationEmail: "",
      facilityName: "", 
      facilityAddress: "", 
      lodRemarks: "",
      productLines: [{ lineName: "", riskCategory: "", products: [{ name: "" }] }],
      divisions: ["VMD"], 
      poaUrl: "", 
      inspectionReportUrl: ""
    });
    
    // 2. Clear state
    setShowSuccess(false);
    initialized.current = false;

    // 3. Navigate
    router.push(path);
    router.refresh();
  };

  const watchType = watch("type");
  const selectedDivs = watch("divisions") || [];

  const toggleDivision = (div: string) => {
    const updated = selectedDivs.includes(div) 
        ? (selectedDivs.length > 1 ? selectedDivs.filter(d => d !== div) : selectedDivs)
        : [...selectedDivs, div];
    setValue("divisions", updated, { shouldDirty: true, shouldValidate: true });
  };

  const onSubmit = async (data: any) => {
    const result = await submitLODApplication(data, CURRENT_USER.id, CURRENT_USER.name, CURRENT_USER.role);
    if (result.success) {
        setShowSuccess(true);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20 relative">
      
      {showSuccess && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl">
          <div className="bg-white p-10 md:p-14 rounded-[4rem] shadow-2xl max-w-xl w-full text-center space-y-10 border border-slate-100 animate-in fade-in zoom-in duration-300">
            <div className="relative mx-auto w-24 h-24 flex items-center justify-center">
              <div className="absolute inset-0 bg-emerald-50 rounded-full scale-125 animate-pulse" />
              <div className="relative z-10 w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center shadow-lg shadow-emerald-200">
                <CheckCircle2 className="w-10 h-10 text-white" />
              </div>
            </div>
            
            <div className="space-y-4">
              <h2 className="text-4xl font-black text-slate-900 uppercase italic tracking-tighter leading-tight">Registration Complete</h2>
              <p className="text-slate-500 text-[13px] font-medium px-6">Application <span className="text-blue-600 font-bold">#{watch("appNumber")}</span> has been successfully logged.</p>
            </div>

            <div className="grid grid-cols-1 gap-4 pt-4">
              <button 
                // onClick={() => handleGracefulExit("/dashboard/lod/daily-status")} 
                onClick={() => handleGracefulExit("/dashboard/lod/applications")} 
                className="w-full py-6 bg-blue-600 text-white rounded-[2rem] font-black uppercase text-[11px] tracking-widest flex items-center justify-center gap-3 hover:bg-blue-700 shadow-xl shadow-blue-100 transition-all"
              >
                <Activity className="w-4 h-4" /> View Live Status
              </button>
              
              <button 
                onClick={() => handleGracefulExit("/dashboard/lod")} 
                className="w-full py-5 bg-slate-50 text-slate-600 rounded-[2rem] font-black uppercase text-[10px] tracking-widest flex items-center justify-center gap-2 hover:bg-slate-100 transition-all border border-slate-200/50"
              >
                Return to Dashboard <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      <form 
        onSubmit={handleSubmit(onSubmit)} 
        className={cn(
          "space-y-8 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100 transition-all duration-500", 
          showSuccess && "opacity-20 scale-95 blur-sm pointer-events-none"
        )}
      >
        <div className="flex items-center justify-between mb-4">
            <div className={cn("px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2", isUpdate ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700")}>
                {isUpdate ? <RefreshCcw className="w-3 h-3 animate-spin-slow" /> : <Plus className="w-3 h-3" />}
                {isUpdate ? "Compliance Review" : "Initial Intake"}
            </div>
        </div>

        <header className="flex justify-between items-center border-b border-slate-100 pb-8">
          <div>
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">{isUpdate ? "Compliance" : "LOD Entry"}</h2>
            <p className="text-[9px] font-bold uppercase text-slate-400 mt-2 tracking-widest">Directorate of Veterinary Medicines</p>
          </div>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">App Number</label>
            <input {...register("appNumber")} readOnly={isUpdate} className={cn("bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold border-2 border-transparent focus:border-blue-500/20 uppercase outline-none", isUpdate && "opacity-60")} />
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Review Type</label>
            <select {...register("type")} className="bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold outline-none cursor-pointer">
              <option value="Facility Verification">Facility Verification (Pass 1)</option>
              <option value="Inspection Report Review (Foreign)">Compliance Review (Pass 2)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
            <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Building2 className="w-4 h-4" /> Local Applicant</h3>
            {!isUpdate && (
              <CompanySearch category="LOCAL" onSelect={(company) => {
                  setValue("companyName", company.name, { shouldDirty: true });
                  setValue("companyAddress", company.address, { shouldDirty: true });
                  if (company.email) setValue("notificationEmail", company.email, { shouldDirty: true });
                }}
              />
            )}
            <input {...register("companyName")} placeholder="Company Name" className="w-full p-4 rounded-xl text-sm font-semibold uppercase shadow-sm border-none" />
            <input {...register("companyAddress")} placeholder="Address" className="w-full p-4 rounded-xl text-sm shadow-sm border-none" />
            <div className="relative">
              <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-blue-400" />
              <input {...register("notificationEmail")} placeholder="Email" className="w-full p-4 pl-10 rounded-xl text-sm font-bold text-blue-600 shadow-sm border-none" />
            </div>
          </div>

          <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] space-y-4">
            <h3 className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2"><Globe className="w-4 h-4" /> Manufacturing Site</h3>
            {!isUpdate && (
              <CompanySearch category="FOREIGN" onSelect={(factory) => {
                  setValue("facilityName", factory.name, { shouldDirty: true });
                  setValue("facilityAddress", factory.address, { shouldDirty: true });
                  setAvailableLines(factory.product_lines || []);
                }}
              />
            )}
            <input {...register("facilityName")} placeholder="Factory Name" className="w-full p-4 rounded-xl text-sm font-semibold uppercase shadow-sm border-none" />
            <input {...register("facilityAddress")} placeholder="Address" className="w-full p-4 rounded-xl text-sm shadow-sm border-none" />
            <FileUpload label={watchType === "Facility Verification" ? "Power of Attorney (POA)" : "Inspection Report (PDF)"} onUploadComplete={(url) => setValue(watchType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl", url, { shouldDirty: true })} />
          </div>
        </div>

        <div className="space-y-4">
          <div className="flex justify-between items-center px-4">
            <h3 className="text-[11px] font-black text-slate-400 uppercase italic">Technical Scope</h3>
            <button type="button" onClick={() => appendLine({ lineName: "", riskCategory: "", products: [{ name: "" }] })} className="text-[10px] font-black text-blue-600 bg-blue-50 px-5 py-2 rounded-full hover:bg-blue-100 transition-all flex items-center gap-2">
              <Plus className="w-3 h-3" /> ADD LINE
            </button>
          </div>

          {lineFields.map((line, index) => {
            const currentCat = RISK_CATEGORIES.find(r => r.name === watchProductLines[index]?.riskCategory);
            const score = currentCat ? currentCat.comp * currentCat.crit : 0;
            const level = getRiskLevel(score);

            return (
              <div key={line.id} className="p-8 bg-white border border-slate-100 rounded-[3rem] relative shadow-sm">
                <button type="button" onClick={() => removeLine(index)} className="absolute top-8 right-8 p-2 text-slate-200 hover:text-rose-500 rounded-full transition-all">
                  <Trash2 className="w-4 h-4" />
                </button>

                <div className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-400 uppercase ml-2">Line Name</label>
                      <Controller
                        name={`productLines.${index}.lineName`}
                        control={control}
                        render={({ field }) => (
                          <CreatableSelect 
                            value={field.value}
                            options={availableLines}
                            onChange={field.onChange}
                            placeholder="Line Category..."
                            onSelectOption={(opt: any) => {
                              setValue(`productLines.${index}.products`, opt.products?.map((p: any) => ({ name: p.name })) || [{ name: "" }]);
                            }}
                          />
                        )}
                      />
                    </div>
                    <div className="space-y-2">
                      <div className="flex items-center justify-between ml-2">
                        <label className="text-[9px] font-black text-blue-400 uppercase tracking-tighter">Intrinsic Risk Rating</label>
                        {level && (
                          <div className={cn("flex items-center gap-1 px-2.5 py-1 rounded-full text-[8px] font-black uppercase tracking-widest shadow-sm", level.color)}>
                            <ShieldAlert className="w-3 h-3" /> {level.label} ({score})
                          </div>
                        )}
                      </div>
                      <select 
                        {...register(`productLines.${index}.riskCategory`)}
                        className="w-full bg-blue-50/50 p-4 rounded-xl text-[11px] font-bold uppercase outline-none border-2 border-transparent focus:border-blue-200 cursor-pointer shadow-sm"
                      >
                        <option value="">Select Category...</option>
                        {RISK_CATEGORIES.map(r => <option key={r.name} value={r.name}>{r.name}</option>)}
                      </select>
                    </div>
                  </div>
                  <NestedProductArray nestIndex={index} control={control} />
                </div>
              </div>
            );
          })}
        </div>

        <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl">
          <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Share2 className="text-blue-400 w-5 h-5" /> Target Units</h3>
          <div className="flex flex-wrap gap-3">
            {DIVISION_OPTIONS.map(div => (
              <button key={div} type="button" onClick={() => toggleDivision(div)} className={cn("px-8 py-3 rounded-2xl text-[11px] font-black border-2 transition-all", selectedDivs.includes(div) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300')}>
                {div}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> Specialist Remarks</label>
          <textarea {...register("lodRemarks")} className="w-full p-6 bg-slate-50 rounded-[2rem] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" rows={3} placeholder="Technical vetting notes..." />
        </div>

        <button type="submit" disabled={isSubmitting} className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50">
          {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5" /> {isUpdate ? "Update LOD" : "Initiate Workflow"}</>}
        </button>
      </form>
    </div>
  );
}

function NestedProductArray({ nestIndex, control }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: `productLines.${nestIndex}.products` });
  return (
    <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
      <div className="flex justify-between items-center px-2 mb-2">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Products</span>
        <button type="button" onClick={() => append({ name: "" })} className="text-[9px] font-black text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-all"><Plus className="w-3 h-3" /> ADD PRODUCT</button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((item, k) => (
          <div key={item.id} className="flex items-center gap-2">
            <Controller name={`productLines.${nestIndex}.products.${k}.name`} control={control} render={({ field }) => (
              <CreatableSelect value={field.value} onChange={field.onChange} options={[]} placeholder="Product..." />
            )}/>
            <button type="button" onClick={() => remove(k)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors"><X className="w-4 h-4" /></button>
          </div>
        ))}
      </div>
    </div>
  );
}