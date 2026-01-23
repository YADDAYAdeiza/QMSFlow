"use client"

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { Plus, Trash2, Globe, Building2, Save, Loader2, AlertCircle, FileCheck } from 'lucide-react';

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
      productLines: [{ lineName: "", products: "" }],
      hasOAI: "No",
      lastInspected: "Recent",
      failedSystems: [],
      divisions: ["VMD"],
      poaUrl: "",
      inspectionReportUrl: ""
    },
    mode: "onChange"
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control, name: "productLines"
  });

  const router = useRouter();
  const selectedType = watch("type");
  const currentPoa = watch("poaUrl");
  const currentReport = watch("inspectionReportUrl");

  const onSubmit = async (data: any) => {
    try {
      const result = await submitLODApplication(data);
      if (result.success) {
        router.refresh();
      } else {
        alert(`Server Error: ${result.error}`);
      }
    } catch (error) {
      console.error("Submission failed", error);
    }
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {isSubmitSuccessful ? (
          <div className="bg-emerald-50 border border-emerald-200 p-12 rounded-[3rem] text-center shadow-xl animate-in zoom-in-95 duration-500">
            <div className="w-20 h-20 bg-emerald-500 rounded-full flex items-center justify-center mx-auto mb-6 shadow-lg shadow-emerald-200">
                <FileCheck className="text-white w-10 h-10" />
            </div>
            <h3 className="text-2xl font-black text-emerald-900 uppercase italic tracking-tighter">Application Logged</h3>
            <p className="text-emerald-700/70 text-sm mb-8 font-medium">The dossier has been successfully routed to the Director.</p>
            <button onClick={() => reset()} className="px-10 py-4 bg-emerald-600 text-white rounded-full font-black text-[11px] uppercase tracking-[0.2em] hover:bg-emerald-700 transition-colors">Route New File</button>
          </div>        
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
          
          {/* HIDDEN URL REGISTRATION FOR ZOD */}
          <input type="hidden" {...register("poaUrl")} />
          <input type="hidden" {...register("inspectionReportUrl")} />

          <header className="border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">LOD Intake</h2>
            <div className="flex items-center gap-2 mt-2">
                <span className="h-1 w-8 bg-blue-600 rounded-full"></span>
                <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em]">Dossier Registration & Routing</p>
            </div>
          </header>
          
          {/* TOP SECTION: APP INFO */}
          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Application No.</label>
              <input {...register("appNumber")} placeholder="e.g. NAF 80" className={`bg-slate-50 border-none p-5 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-2 transition-all ${errors.appNumber ? 'ring-rose-500/20 bg-rose-50' : 'ring-blue-500/20'}`} />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Review Category</label>
              <select {...register("type")} className="bg-slate-50 border-none p-5 rounded-[1.5rem] text-sm font-bold outline-none cursor-pointer hover:bg-slate-100 transition-colors">
                <option value="Facility Verification">Facility Verification</option>
                <option value="Inspection Report Review (Foreign)">Inspection Report Review (Foreign)</option>
                <option value="Inspection Report Review (Local)">Inspection Report Review (Local)</option>
              </select>
            </div>
          </div>

          {/* SITES SECTION */}
          <div className="grid grid-cols-2 gap-8">
            {/* LOCAL APPLICANT */}
            <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4 border border-slate-100">
              <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2 mb-2"><Building2 className="w-4 h-4" /> Local Applicant</h3>
              <input {...register("companyName")} placeholder="Company Name" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm outline-none font-medium" />
              <input {...register("companyAddress")} placeholder="Address" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm outline-none font-medium" />
              <input {...register("notificationEmail")} placeholder="Notification Email" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm outline-none text-blue-600 font-bold" />
            </div>

            {/* MANUFACTURING SITE (Fixed with Address) */}
            <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2 mb-2"><Globe className="w-4 h-4" /> Manufacturing Site</h3>
              <input {...register("facilityName")} placeholder="Factory Name" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm outline-none font-medium" />
              
              {/* THE MISSING FIELD THAT WAS BLOCKING SUBMISSION */}
              <input {...register("facilityAddress")} placeholder="Factory Physical Address" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm outline-none font-medium" />
              
              <FileUpload 
                label={selectedType === "Facility Verification" ? "Letter of Authorization (PDF)" : "Inspection Report (PDF)"}
                onUploadComplete={(url) => {
                  const field: any = selectedType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl";
                  const other: any = field === "poaUrl" ? "inspectionReportUrl" : "poaUrl";
                  setValue(field, url, { shouldValidate: true });
                  setValue(other, "", { shouldValidate: true });
                }} 
              />
              
              {(currentPoa || currentReport) && (
                <div className="flex items-center gap-2 px-4 py-2 bg-emerald-500 rounded-xl text-[9px] font-black text-white uppercase tracking-widest animate-in fade-in">
                    <FileCheck className="w-3 h-3" /> Dossier Attached
                </div>
              )}
            </div>
          </div>

          {/* DYNAMIC PRODUCT LINES */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-4">
              <h3 className="text-[11px] font-black text-slate-400 uppercase italic">Scope of Authorization</h3>
              <button type="button" onClick={() => appendLine({ lineName: "", products: "" })} className="text-[10px] font-black text-blue-600 bg-blue-50 px-4 py-2 rounded-full hover:bg-blue-100 transition-colors">
                <Plus className="w-3 h-3" /> ADD LINE
              </button>
            </div>
            {lineFields.map((line, index) => (
              <div key={line.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] shadow-sm relative group animate-in slide-in-from-right-4">
                <button type="button" onClick={() => removeLine(index)} className="absolute top-6 right-6 text-slate-200 hover:text-rose-500 transition-colors"><Trash2 className="w-4 h-4" /></button>
                <div className="grid grid-cols-3 gap-4">
                  <input {...register(`productLines.${index}.lineName`)} placeholder="e.g. Tablets" className="bg-slate-50 border-none p-4 rounded-xl text-xs font-black uppercase outline-none focus:bg-slate-100" />
                  <textarea {...register(`productLines.${index}.products`)} placeholder="Products..." className="col-span-2 bg-slate-50 border-none p-4 rounded-xl text-xs outline-none focus:bg-slate-100" rows={1} />
                </div>
              </div>
            ))}
          </div>

          {/* SCHEMA DIAGNOSTIC (Debug Box) */}
          <div className="p-4 bg-slate-900 rounded-2xl mb-4 font-mono">
            <p className="text-[10px] text-blue-400 uppercase font-black mb-2">Schema Diagnostic:</p>
            {Object.keys(errors).length === 0 ? (
                <p className="text-emerald-400 text-[10px]">✅ All fields valid</p>
            ) : (
                Object.keys(errors).map((key) => (
                    <div key={key} className="text-rose-400 text-[10px]">
                      ❌ <span className="uppercase">{key}</span>: {(errors as any)[key]?.message || "Invalid Field"}
                    </div>
                ))
            )}
            {errors.root && <div className="text-rose-400 text-[10px]">❌ DOSSIER: {errors.root.message}</div>}
          </div>

          {/* SUBMIT BUTTON */}
          <button 
            type="submit" 
            disabled={isSubmitting} 
            className="w-full py-7 bg-slate-900 text-white rounded-[2.2rem] font-black uppercase text-[11px] tracking-[0.25em] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isSubmitting ? (
                <Loader2 className="animate-spin w-5 h-5" />
            ) : (
                <>
                    <Save className="w-5 h-5 group-hover:scale-110 transition-transform" /> 
                    Authorize & Route File
                </>
            )}
          </button>
        </form>
      )}
    </div>
  );
}