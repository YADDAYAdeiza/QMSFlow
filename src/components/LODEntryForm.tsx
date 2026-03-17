"use client"

import React, { useState, useRef, useEffect } from 'react';
import { useForm, useFieldArray, Controller } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { CompanySearch } from './CompanySearch';
import { 
  Plus, Trash2, Globe, Building2, Save, Loader2, 
  MessageSquare, Share2, X, ChevronDown, AlertCircle
} from 'lucide-react';
import { cn } from "@/lib/utils";

const DIVISION_OPTIONS = ["VMD", "AFPD", "PAD", "IRSD"];

/**
 * Generic Custom Creatable Dropdown
 */
function CreatableSelect({ 
  value, 
  onChange, 
  options, 
  placeholder, 
  onSelectOption 
}: { 
  value: string, 
  onChange: (val: string) => void, 
  options: any[], 
  placeholder: string,
  onSelectOption?: (option: any) => void
}) {
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

  const filteredOptions = options.filter(opt => opt.name.toLowerCase().includes(search.toLowerCase()));
  const showCreateOption = search.length > 0 && !options.some(opt => opt.name.toLowerCase() === search.toLowerCase());

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
        <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white border border-slate-100 shadow-2xl rounded-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
          <div className="p-2 border-b border-slate-50">
            <input 
              autoFocus
              placeholder="Filter or type new..."
              className="w-full p-3 text-[10px] outline-none bg-slate-50 rounded-lg font-medium"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="max-h-48 overflow-y-auto">
            {filteredOptions.map((opt) => (
              <div 
                key={opt.id}
                onClick={() => handleSelect(opt.name, opt)}
                className="p-3 text-[10px] font-bold uppercase text-slate-600 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors"
              >
                {opt.name}
              </div>
            ))}
            {showCreateOption && (
              <div 
                onClick={() => handleSelect(search)}
                className="p-3 text-[10px] font-bold uppercase text-blue-600 bg-blue-50 hover:bg-blue-600 hover:text-white cursor-pointer transition-colors flex items-center gap-2"
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

function NestedProductArray({ nestIndex, control, register, suggestedProducts }: any) {
  const { fields, append, remove } = useFieldArray({ control, name: `productLines.${nestIndex}.products` });

  return (
    <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Line Products</span>
        <button type="button" onClick={() => append({ name: "" })} className="text-[9px] font-black text-blue-500 hover:text-blue-700 flex items-center gap-1 transition-colors">
          <Plus className="w-3 h-3" /> ADD PRODUCT
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((item, k) => (
          <div key={item.id} className="group flex items-center gap-2">
            <Controller
              name={`productLines.${nestIndex}.products.${k}.name`}
              control={control}
              render={({ field }) => (
                <CreatableSelect 
                  value={field.value}
                  options={suggestedProducts || []}
                  onChange={field.onChange}
                  placeholder="Select Product..."
                />
              )}
            />
            <button type="button" onClick={() => remove(k)} className="p-2 text-slate-300 hover:text-rose-500 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LODEntryForm() {
  const router = useRouter();
  const [availableLines, setAvailableLines] = useState<any[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  
  const { 
    register, handleSubmit, watch, setValue, control, reset, 
    formState: { isSubmitting, isSubmitSuccessful, errors } 
  } = useForm({
    resolver: zodResolver(lodFormSchema),
    defaultValues: {
      appNumber: "", type: "Facility Verification", companyName: "", companyAddress: "", notificationEmail: "",
      facilityName: "", facilityAddress: "", lodRemarks: "",
      productLines: [{ lineName: "", products: [{ name: "" }] }],
      divisions: ["VMD"], poaUrl: "", inspectionReportUrl: ""
    }
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({ control, name: "productLines" });
  const selectedType = watch("type");
  const selectedDivs = watch("divisions");
  const watchProductLines = watch("productLines");

  const toggleDivision = (div: string) => {
    const current = [...selectedDivs];
    const updated = current.includes(div) 
        ? (current.length > 1 ? current.filter(d => d !== div) : current)
        : [...current, div];
    setValue("divisions", updated);
  };

  const onSubmit = async (data: any) => {
    setSubmitError(null);
    const result = await submitLODApplication(data);
    if (result.success) {
      router.refresh();
    } else {
      setSubmitError(result.error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {isSubmitSuccessful ? (
        <div className="bg-emerald-50 border border-emerald-200 p-12 rounded-[3rem] text-center shadow-xl animate-in zoom-in-95">
          <h3 className="text-2xl font-black text-emerald-900 uppercase italic">Application Submitted</h3>
          <button onClick={() => { reset(); setAvailableLines([]); }} className="mt-6 px-10 py-4 bg-emerald-600 text-white rounded-full font-black text-[11px] uppercase tracking-widest hover:bg-emerald-700 transition-all">Process Another</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
          <header className="border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">LOD Intake</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dossier Receipt & Initial Routing</p>
          </header>

          {/* APP NUMBER & CATEGORY */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">App Number</label>
              <input 
                {...register("appNumber")} 
                className={cn(
                  "bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold outline-none border-2 transition-all uppercase",
                  submitError?.includes("already exists") ? "border-rose-500 bg-rose-50" : "border-transparent focus:border-blue-500/20"
                )} 
              />
              {submitError?.includes("already exists") && (
                <span className="text-rose-500 text-[9px] font-black uppercase ml-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" /> {submitError}
                </span>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Category</label>
              <select {...register("type")} className="bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold outline-none appearance-none cursor-pointer">
                <option value="Facility Verification">Facility Verification</option>
                <option value="Inspection Report Review (Foreign)">Inspection Report Review (Foreign)</option>
              </select>
            </div>
          </div>

          {/* COMPANIES SECTION */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Building2 className="w-4 h-4" /> Local Company</h3>
              <CompanySearch 
                category="LOCAL" 
                placeholder="Search local agent..." 
                onSelect={(company) => {
                  setValue("companyName", company.name);
                  setValue("companyAddress", company.address);
                  if (company.email) setValue("notificationEmail", company.email);
                }}
              />
              <input {...register("companyName")} placeholder="Company Name" className="w-full p-4 rounded-xl text-sm border-none shadow-sm font-semibold uppercase" />
              <input {...register("companyAddress")} placeholder="Address" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <input {...register("notificationEmail")} placeholder="Email" className="w-full p-4 rounded-xl text-sm border-none shadow-sm font-bold text-blue-600" />
            </div>

            <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2"><Globe className="w-4 h-4" /> Foreign Manufacturer</h3>
              <CompanySearch 
                category="FOREIGN" 
                placeholder="Search factory..." 
                onSelect={(factory) => {
                  setValue("facilityName", factory.name);
                  setValue("facilityAddress", factory.address);
                  setAvailableLines(factory.product_lines || []);
                }}
              />
              <input {...register("facilityName")} placeholder="Factory Name" className="w-full p-4 rounded-xl text-sm border-none shadow-sm font-semibold uppercase" />
              <input {...register("facilityAddress")} placeholder="Address" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <FileUpload 
                label={selectedType === "Facility Verification" ? "POA / Authorization" : "Inspection Report"}
                onUploadComplete={(url) => setValue(selectedType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl", url)} 
              />
            </div>
          </div>

          {/* DIVISIONS */}
          <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl">
            <h3 className="text-[11px] font-black text-white uppercase tracking-widest mb-6 flex items-center gap-2"><Share2 className="text-blue-400 w-5 h-5" /> Assign Divisions</h3>
            <div className="flex flex-wrap gap-3">
              {DIVISION_OPTIONS.map(div => (
                <button 
                  key={div} type="button" onClick={() => toggleDivision(div)}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black border-2 transition-all ${
                    selectedDivs.includes(div) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500 hover:text-slate-300'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

          {/* PRODUCT LINES */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase italic">Product Line Scope</h3>
              <button 
                type="button" 
                onClick={() => appendLine({ lineName: "", products: [{ name: "" }] })}
                className="text-[10px] font-black text-blue-600 bg-blue-50 px-5 py-2 rounded-full hover:bg-blue-100 transition-colors flex items-center gap-2"
              >
                <Plus className="w-3 h-3" /> ADD LINE
              </button>
            </div>

            {lineFields.map((line, index) => {
              const currentLineName = watchProductLines[index]?.lineName;
              const lineData = availableLines.find(al => al.name === currentLineName);
              const suggestedProducts = lineData?.products || [];

              return (
                <div key={line.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] relative shadow-sm group/line animate-in slide-in-from-right-4">
                  <button 
                    type="button" 
                    onClick={() => removeLine(index)} 
                    className="absolute top-6 right-6 p-2 text-slate-200 hover:text-rose-500 hover:bg-rose-50 rounded-full transition-all z-10"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-3 pr-10">
                      <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">{index + 1}</span>
                      
                      <Controller
                        name={`productLines.${index}.lineName`}
                        control={control}
                        render={({ field }) => (
                          <CreatableSelect 
                            value={field.value}
                            options={availableLines}
                            onChange={field.onChange}
                            placeholder="Select or Type Line..."
                            onSelectOption={(opt) => {
                              setValue(`productLines.${index}.products`, opt.products.length > 0 ? opt.products.map((p: any) => ({ name: p.name })) : [{ name: "" }]);
                            }}
                          />
                        )}
                      />
                    </div>
                    
                    <NestedProductArray 
                      nestIndex={index} 
                      control={control} 
                      register={register} 
                      suggestedProducts={suggestedProducts} 
                    />
                  </div>
                </div>
              );
            })}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> LOD Remarks</label>
            <textarea {...register("lodRemarks")} className="w-full p-6 bg-slate-50 rounded-[2rem] text-sm font-medium outline-none focus:ring-4 focus:ring-blue-500/5 transition-all" rows={3} placeholder="Observations for the Director..." />
          </div>

          <button 
            type="submit" disabled={isSubmitting} 
            className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50 active:scale-[0.98]"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5" /> Authorize & Route Application</>}
          </button>
        </form>
      )}
    </div>
  );
}