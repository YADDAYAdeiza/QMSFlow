"use client"

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { Plus, Trash2, Globe, Building2, Save, Loader2, MessageSquare, Share2 } from 'lucide-react';

const DIVISION_OPTIONS = ["VMD", "AFPD", "PAD", "IRSD"];

export default function LODEntryForm() {
  const { 
    register, handleSubmit, watch, setValue, control, reset, 
    formState: { isSubmitting, isSubmitSuccessful, errors } 
  } = useForm({
    resolver: zodResolver(lodFormSchema),
    defaultValues: {
      appNumber: "",
      type: "Facility Verification",
      companyName: "",
      companyAddress: "",
      notificationEmail: "",
      facilityName: "",
      facilityAddress: "",
      lodRemarks: "",
      productLines: [{ lineName: "", products: "" }],
      hasOAI: "No",
      lastInspected: "Recent",
      failedSystems: [],
      divisions: ["VMD"],
      poaUrl: "",
      inspectionReportUrl: ""
    }
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control, name: "productLines"
  });

  const router = useRouter();
  const selectedType = watch("type");
  const selectedDivs = watch("divisions");

  const toggleDivision = (div: string) => {
    const current = [...selectedDivs];
    if (current.includes(div)) {
      if (current.length > 1) setValue("divisions", current.filter(d => d !== div));
    } else {
      setValue("divisions", [...current, div]);
    }
  };

  const onSubmit = async (data: any) => {
    const result = await submitLODApplication(data);
    if (result.success) router.refresh();
    else alert(`Server Error: ${result.error}`);
  };

  const getFileLabel = () => {
    return selectedType === "Facility Verification" ? "Letter of Authorization" : "Inspection Report";
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {isSubmitSuccessful ? (
          <div className="bg-emerald-50 border border-emerald-200 p-12 rounded-[3rem] text-center shadow-xl animate-in zoom-in-95 duration-300">
            <h3 className="text-2xl font-black text-emerald-900 uppercase italic">Dossier Routed</h3>
            <button onClick={() => reset()} className="mt-6 px-10 py-4 bg-emerald-600 text-white rounded-full font-black text-[11px] uppercase tracking-widest">Route New File</button>
          </div>        
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
          
          <input type="hidden" {...register("poaUrl")} />
          <input type="hidden" {...register("inspectionReportUrl")} />

          <header className="border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">LOD Intake</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Registration & Workflow Routing</p>
          </header>
          
          {/* TOP SECTION: IDENTIFIERS */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Application No.</label>
              <input {...register("appNumber")} className="bg-slate-50 border-none p-5 rounded-[1.5rem] text-sm font-bold outline-none ring-offset-2 focus:ring-2 focus:ring-blue-500/20 transition-all" placeholder="e.g. NAF 80" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Review Category</label>
              <select {...register("type")} className="bg-slate-50 border-none p-5 rounded-[1.5rem] text-sm font-bold outline-none cursor-pointer">
                <option value="Facility Verification">Facility Verification</option>
                <option value="Inspection Report Review (Foreign)">Inspection Report Review (Foreign)</option>
                <option value="Inspection Report Review (Local)">Inspection Report Review (Local)</option>
              </select>
            </div>
          </div>

          {/* MIDDLE SECTION: ENTITY DETAILS */}
          <div className="grid grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><Building2 className="w-4 h-4" /> Local Applicant</h3>
              <input {...register("companyName")} placeholder="Company Name" className="w-full bg-white p-4 rounded-xl text-sm shadow-sm outline-none" />
              <input {...register("companyAddress")} placeholder="Address" className="w-full bg-white p-4 rounded-xl text-sm shadow-sm outline-none" />
              <input {...register("notificationEmail")} placeholder="Email" className="w-full bg-white p-4 rounded-xl text-sm shadow-sm outline-none font-bold text-blue-600" />
            </div>

            <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2 mb-2"><Globe className="w-4 h-4" /> Manufacturing Site</h3>
              <input {...register("facilityName")} placeholder="Factory Name" className="w-full bg-white p-4 rounded-xl text-sm shadow-sm outline-none" />
              <input {...register("facilityAddress")} placeholder="Physical Address" className="w-full bg-white p-4 rounded-xl text-sm shadow-sm outline-none" />
              
              <FileUpload 
                label={getFileLabel()}
                onUploadComplete={(url) => {
                  const field = selectedType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl";
                  setValue(field, url, { shouldValidate: true });
                }} 
              />
            </div>
          </div>

          {/* LOWER SECTION: REMARKS & SCOPE */}
          <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2">
                    <MessageSquare className="w-3 h-3" /> LOD Intake Remarks
                </label>
                <textarea 
                    {...register("lodRemarks")}
                    className="w-full p-6 bg-slate-50 border-none rounded-[2rem] text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                    placeholder="Briefly state why this file is being routed..."
                    rows={3}
                />
            </div>

            {/* ROUTING SECTION: MOVED HERE AS REQUESTED */}
            <div className="p-8 bg-slate-900 rounded-[2.5rem] border border-slate-800 shadow-2xl">
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-3">
                        <Share2 className="w-5 h-5 text-blue-400" />
                        <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Workflow Destination</h3>
                    </div>
                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter italic">Select one or more streams</span>
                </div>
                <div className="flex flex-wrap gap-3">
                    {DIVISION_OPTIONS.map(div => (
                        <button 
                            key={div} type="button"
                            onClick={() => toggleDivision(div)}
                            className={`px-8 py-3 rounded-2xl text-[11px] font-black transition-all border-2 ${
                                selectedDivs.includes(div) 
                                ? 'bg-blue-600 border-blue-400 text-white shadow-lg scale-105' 
                                : 'bg-slate-800 border-slate-700 text-slate-500 hover:border-slate-500'
                            }`}
                        >
                            {div}
                        </button>
                    ))}
                </div>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-center px-4 pt-4">
                <h3 className="text-[11px] font-black text-slate-400 uppercase italic">Scope of Authorization</h3>
                <button type="button" onClick={() => appendLine({ lineName: "", products: "" })} className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">
                  <Plus className="w-3 h-3" /> ADD LINE
                </button>
              </div>
              {lineFields.map((line, index) => (
                <div key={line.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm relative group animate-in slide-in-from-right-4 duration-300">
                  <button type="button" onClick={() => removeLine(index)} className="absolute top-6 right-6 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                  <div className="grid grid-cols-3 gap-4">
                    <input {...register(`productLines.${index}.lineName`)} placeholder="e.g. Tablets" className="bg-slate-50 p-4 rounded-xl text-xs font-black uppercase outline-none focus:bg-blue-50/50" />
                    <textarea {...register(`productLines.${index}.products`)} placeholder="List products..." className="col-span-2 bg-slate-50 p-4 rounded-xl text-xs outline-none focus:bg-blue-50/50" rows={1} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* DIAGNOSTICS & SUBMIT */}
          <div className="space-y-4 pt-6">
              <div className="p-4 bg-slate-50 rounded-2xl font-mono text-[10px]">
                {Object.keys(errors).length === 0 ? (
                    <p className="text-emerald-600 font-bold">✅ Ready for routing</p>
                ) : (
                    <div className="space-y-1">
                        {Object.keys(errors).map(key => (
                            <p key={key} className="text-rose-500 flex items-center gap-1">
                                ❌ {key.toUpperCase()}: {(errors as any)[key]?.message}
                            </p>
                        ))}
                    </div>
                )}
              </div>

              <button 
                type="submit" 
                disabled={isSubmitting} 
                className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
              >
                {isSubmitting ? (
                    <Loader2 className="animate-spin w-6 h-6" />
                ) : (
                    <>
                        <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                        Authorize & Route Dossier
                    </>
                )}
              </button>
          </div>
        </form>
      )}
    </div>
  );
}