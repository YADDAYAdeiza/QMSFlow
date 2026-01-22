"use client"

import React, { useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { Plus, Trash2, Globe, Building2, Mail, ShieldAlert, Bug } from 'lucide-react';

export default function LODEntryForm() {
  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue, 
    control,
    reset, 
    formState: { isValid, isSubmitting, isSubmitSuccessful, errors } 
  } = useForm({
    resolver: zodResolver(lodFormSchema),
    defaultValues: {
      appNumber: "",
      type: "",
      companyName: "",
      companyAddress: "",
      notificationEmail: "",
      facilityName: "",
      facilityAddress: "",
      productLines: [{ lineName: "", products: "" }],
      hasOAI: "No",
      lastInspected: "Recent",
      failedSystems: [],
      divisions: []
    },
    mode: "onChange"
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control,
    name: "productLines"
  });

  const router = useRouter();
  const selectedType = watch("type");

  const onSubmit = async (data: any) => {
    try {
      await submitLODApplication(data);
      router.refresh();
    } catch (error) {
      console.error("Submission failed", error);
    }
  };

  return (
    <div className="max-w-3xl mx-auto pb-20">
      
      {/* --- DEBUG TOOL: ERROR OVERLAY --- */}
      {Object.keys(errors).length > 0 && (
        <div className="mb-6 p-4 bg-rose-50 border-2 border-rose-200 rounded-3xl animate-in fade-in slide-in-from-top-4">
          <div className="flex items-center gap-2 mb-2 text-rose-600">
            <Bug className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">Validation Blockers</span>
          </div>
          <ul className="grid grid-cols-2 gap-x-4 gap-y-1">
            {Object.entries(errors).map(([key, value]: [string, any]) => (
              <li key={key} className="text-[10px] text-rose-500 font-bold flex items-center gap-1">
                • <span className="uppercase">{key}:</span> {value.message || "Invalid Input"}
              </li>
            ))}
          </ul>
        </div>
      )}

      {isSubmitSuccessful ? (
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-12 rounded-3xl text-center shadow-xl">
            <h3 className="text-2xl font-black mb-2 uppercase tracking-tighter">Application Logged</h3>
            <p className="opacity-70 text-sm mb-6">File has been routed to the technical divisions.</p>
            <button onClick={() => reset()} className="px-6 py-2 bg-emerald-600 text-white rounded-full font-bold text-xs uppercase tracking-widest">
              Add Another File
            </button>
          </div>        
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-8 bg-white rounded-[2.5rem] shadow-2xl border border-slate-100">
          <header className="border-b border-slate-100 pb-6">
            <h2 className="text-3xl font-black text-slate-900 uppercase italic tracking-tighter leading-none">LOD Intake</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-widest mt-2">Dossier Registration & Risk Profiling</p>
          </header>
          
          {/* SECTION: IDENTIFICATION */}
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Application No.</label>
              <input {...register("appNumber")} placeholder="e.g. NAF/FAC/2026/001" className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm" />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-1">Review Category</label>
              <select {...register("type")} className="w-full bg-slate-50 border-none p-4 rounded-2xl text-sm">
                <option value="">Select Category...</option>
                <option value="Facility Verification">Facility Verification (LOD)</option>
                <option value="Inspection Report Review (local)">Inspection Review (Local)</option>
                <option value="Inspection Report Review (foreign)">Inspection Review (Foreign)</option>
              </select>
            </div>
          </div>

          {/* SECTION: ENTITY DETAILS */}
          <div className="p-6 bg-slate-50 rounded-3xl space-y-4">
            <div className="flex items-center gap-2 mb-2">
              <Building2 className="w-4 h-4 text-blue-600" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600">Local Applicant / Rep</h3>
            </div>
            <input {...register("companyName")} placeholder="Registered Company Name" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm" />
            <div className="grid grid-cols-2 gap-4">
               <input {...register("companyAddress")} placeholder="Local Office Address" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm" />
               <div className="relative">
                 <Mail className="absolute left-4 top-4 w-4 h-4 text-slate-300" />
                 <input {...register("notificationEmail")} type="email" placeholder="Regulatory Contact Email" className="w-full bg-white border-none p-4 pl-12 rounded-xl text-sm shadow-sm font-medium text-blue-600" />
               </div>
            </div>
          </div>

          {/* SECTION: FOREIGN FACTORY */}
          <div className="p-6 bg-blue-50/50 rounded-3xl space-y-4 border border-blue-100">
            <div className="flex items-center gap-2 mb-2">
              <Globe className="w-4 h-4 text-blue-600" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-blue-900">Manufacturing Site</h3>
            </div>
            <input {...register("facilityName")} placeholder="Factory Name (As per GMP)" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm" />
            <input {...register("facilityAddress")} placeholder="Physical Site Address (Foreign/Local)" className="w-full bg-white border-none p-4 rounded-xl text-sm shadow-sm" />
            
            <FileUpload 
              label="Primary Dossier/Report (PDF)" 
              onUploadComplete={(url) => {
                const field = selectedType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl";
                setValue(field, url, { shouldValidate: true });
              }} 
            />
          </div>

          {/* SECTION: RISK PROFILING */}
          <div className="p-6 bg-red-50 rounded-3xl border border-red-100 space-y-4">
            <h3 className="text-[11px] font-black uppercase text-red-900 flex items-center gap-2">
              <ShieldAlert className="w-4 h-4" /> Risk Assessment Matrix
            </h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[9px] font-black text-red-400 uppercase ml-1">Compliance History (OAI)</label>
                <select {...register("hasOAI")} className="w-full p-3 rounded-xl border-none text-xs shadow-sm bg-white">
                  <option value="No">No Recent OAI/Warning Letters</option>
                  <option value="Yes">Official Action Indicated (OAI)</option>
                </select>
              </div>
              <div className="space-y-1">
                <label className="text-[9px] font-black text-red-400 uppercase ml-1">Site Maturity</label>
                <select {...register("lastInspected")} className="w-full p-3 rounded-xl border-none text-xs shadow-sm bg-white">
                  <option value="Recent">Inspected within 24 months</option>
                  <option value="Lapsed">Last inspection &gt; 3 years</option>
                  <option value="Never">De-novo / Never Inspected</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-[9px] font-black text-red-400 uppercase tracking-widest ml-1">Legacy System Failures:</label>
              <div className="flex flex-wrap gap-2 mt-2">
                {["Quality", "Facilities", "Materials", "Production", "Packaging", "Laboratory"].map(sys => (
                  <label key={sys} className="flex items-center gap-2 px-3 py-1 bg-white rounded-full text-[10px] border border-red-100 cursor-pointer has-[:checked]:bg-red-600 has-[:checked]:text-white transition-all font-bold">
                    <input type="checkbox" value={sys} {...register("failedSystems")} className="hidden" /> {sys}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* SECTION: PRODUCT SCOPE */}
          <div className="space-y-4">
            <div className="flex justify-between items-center px-1">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-slate-600 italic">Scope of Authorization</h3>
              <button type="button" onClick={() => appendLine({ lineName: "", products: "" })} className="text-[10px] font-black text-blue-600 flex items-center gap-1 hover:underline">
                <Plus className="w-3 h-3" /> New Line
              </button>
            </div>

            {lineFields.map((line, lineIndex) => (
              <div key={line.id} className="p-6 border border-slate-100 rounded-3xl space-y-4 relative bg-white shadow-sm">
                <button type="button" onClick={() => removeLine(lineIndex)} className="absolute top-4 right-4 text-slate-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
                <input {...register(`productLines.${lineIndex}.lineName`)} placeholder="Product Line" className="w-full bg-slate-50 border-none p-3 rounded-xl text-sm font-black uppercase tracking-tight" />
                <textarea {...register(`productLines.${lineIndex}.products`)} placeholder="Products..." className="w-full bg-slate-50 border-none p-3 rounded-xl text-xs" rows={2} />
              </div>
            ))}
          </div>

          {/* WORKFLOW ASSIGNMENT */}
          <div className="space-y-4 border-t border-slate-100 pt-6">
            <label className="block text-[11px] font-black uppercase text-slate-500 tracking-widest">Routing Divisions</label>
            <div className="flex gap-2">
              {["VMD", "AFPD", "PAD", "IRSD"].map(div => (
                <label key={div} className="flex-1 flex items-center justify-center p-3 rounded-xl border border-slate-100 text-[10px] font-black cursor-pointer has-[:checked]:bg-slate-900 has-[:checked]:text-white transition-all">
                  <input type="checkbox" value={div} {...register("divisions")} className="hidden" /> {div}
                </label>
              ))}
            </div>
          </div>

          <button 
            type="submit" 
            disabled={!isValid || isSubmitting} 
            className="w-full py-5 rounded-3xl font-black uppercase text-xs tracking-[0.2em] bg-blue-600 text-white shadow-2xl shadow-blue-200 disabled:bg-slate-200 disabled:shadow-none transition-all active:scale-[0.98]"
          >
            {isSubmitting ? "Generating Application Bundle..." : "Authorize and Route File"}
          </button>
        </form>
      )}
    </div>
  );
}