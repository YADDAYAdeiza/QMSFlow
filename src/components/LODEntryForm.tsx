"use client"

import React from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useRouter } from "next/navigation";
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 
import { Plus, Trash2, Globe, Building2, Save, Loader2, MessageSquare, Share2, X } from 'lucide-react';

const DIVISION_OPTIONS = ["VMD", "AFPD", "PAD", "IRSD"];

function NestedProductArray({ nestIndex, control, register, errors }: any) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `productLines.${nestIndex}.products`
  });

  return (
    <div className="mt-4 space-y-2 border-t border-slate-50 pt-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Products in this line</span>
        <button
          type="button"
          onClick={() => append({ name: "" })}
          className="text-[9px] font-black text-blue-500 hover:text-blue-700 flex items-center gap-1"
        >
          <Plus className="w-3 h-3" /> ADD PRODUCT
        </button>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
        {fields.map((item, k) => (
          <div key={item.id} className="group flex flex-col gap-1">
            <div className="flex items-center gap-2">
              <input
                {...register(`productLines.${nestIndex}.products.${k}.name`)}
                placeholder="Product name"
                className="flex-1 bg-white border border-slate-200 p-3 rounded-xl text-[11px] font-medium outline-none focus:border-blue-400 transition-all"
              />
              <button type="button" onClick={() => remove(k)} className="text-slate-300 hover:text-rose-500 transition-colors">
                <X className="w-3 h-3" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function LODEntryForm() {
  const router = useRouter();
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
      productLines: [{ lineName: "", products: [{ name: "" }] }],
      divisions: ["VMD"],
      poaUrl: "",
      inspectionReportUrl: ""
    }
  });

  const { fields: lineFields, append: appendLine, remove: removeLine } = useFieldArray({
    control, name: "productLines"
  });

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
    else alert(`Error: ${result.error}`);
  };

  return (
    <div className="max-w-4xl mx-auto pb-20">
      {isSubmitSuccessful ? (
        <div className="bg-emerald-50 border border-emerald-200 p-12 rounded-[3rem] text-center shadow-xl">
          <h3 className="text-2xl font-black text-emerald-900 uppercase italic">Application Submitted</h3>
          <button onClick={() => reset()} className="mt-6 px-10 py-4 bg-emerald-600 text-white rounded-full font-black text-[11px] uppercase tracking-widest">Process Another</button>
        </div>
      ) : (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 p-10 bg-white rounded-[3rem] shadow-2xl border border-slate-100">
          <header className="border-b border-slate-100 pb-8">
            <h2 className="text-4xl font-black text-slate-900 tracking-tighter italic uppercase leading-none">LOD Intake</h2>
            <p className="text-slate-400 text-[10px] font-black uppercase tracking-[0.3em] mt-2">Dossier Receipt & Initial Routing</p>
          </header>

          <div className="grid grid-cols-2 gap-8">
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">App Number</label>
              <input {...register("appNumber")} className="bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold outline-none focus:ring-2 focus:ring-blue-500/20 transition-all" />
            </div>
            <div className="flex flex-col gap-2">
              <label className="text-[10px] font-black uppercase text-slate-400 ml-2">Category</label>
              <select {...register("type")} className="bg-slate-50 p-5 rounded-[1.5rem] text-sm font-bold outline-none">
                <option value="Facility Verification">Facility Verification</option>
                <option value="Inspection Report Review (Foreign)">Inspection Report Review (Foreign)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="p-8 bg-slate-50 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-slate-500 uppercase flex items-center gap-2"><Building2 className="w-4 h-4" /> Local Company</h3>
              <input {...register("companyName")} placeholder="Name" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <input {...register("companyAddress")} placeholder="Address" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <input {...register("notificationEmail")} placeholder="Email" className="w-full p-4 rounded-xl text-sm border-none shadow-sm font-bold text-blue-600" />
            </div>
            <div className="p-8 bg-blue-50/50 border border-blue-100 rounded-[2.5rem] space-y-4">
              <h3 className="text-[10px] font-black text-blue-900 uppercase flex items-center gap-2"><Globe className="w-4 h-4" /> Foreign Manufacturer</h3>
              <input {...register("facilityName")} placeholder="Factory Name" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <input {...register("facilityAddress")} placeholder="Physical Address" className="w-full p-4 rounded-xl text-sm border-none shadow-sm" />
              <FileUpload 
                label={selectedType === "Facility Verification" ? "POA / Letter of Authorization" : "Inspection Report"}
                onUploadComplete={(url) => {
                  const field = selectedType === "Facility Verification" ? "poaUrl" : "inspectionReportUrl";
                  setValue(field, url, { shouldValidate: true });
                }} 
              />
            </div>
          </div>

          <div className="p-8 bg-slate-900 rounded-[2.5rem] shadow-xl">
            <div className="flex items-center gap-3 mb-6">
              <Share2 className="text-blue-400 w-5 h-5" />
              <h3 className="text-[11px] font-black text-white uppercase tracking-widest">Assign Divisions</h3>
            </div>
            <div className="flex flex-wrap gap-3">
              {DIVISION_OPTIONS.map(div => (
                <button 
                  key={div} type="button" onClick={() => toggleDivision(div)}
                  className={`px-8 py-3 rounded-2xl text-[11px] font-black border-2 transition-all ${
                    selectedDivs.includes(div) ? 'bg-blue-600 border-blue-400 text-white shadow-lg' : 'bg-slate-800 border-slate-700 text-slate-500'
                  }`}
                >
                  {div}
                </button>
              ))}
            </div>
          </div>

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

            {lineFields.map((line, index) => (
              <div key={line.id} className="p-6 bg-white border border-slate-100 rounded-[2rem] relative shadow-sm animate-in slide-in-from-right-4">
                <button type="button" onClick={() => removeLine(index)} className="absolute top-6 right-6 text-slate-200 hover:text-rose-500"><Trash2 className="w-4 h-4" /></button>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-3">
                    <span className="bg-slate-900 text-white w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold">{index + 1}</span>
                    <input {...register(`productLines.${index}.lineName`)} placeholder="e.g. Tablets (Beta-Lactams)" className="flex-1 bg-slate-50 p-4 rounded-xl text-xs font-black uppercase outline-none" />
                  </div>
                  <NestedProductArray nestIndex={index} control={control} register={register} errors={errors} />
                </div>
              </div>
            ))}
          </div>

          <div className="space-y-2">
            <label className="text-[10px] font-black uppercase text-slate-400 ml-2 flex items-center gap-2"><MessageSquare className="w-3 h-3" /> LOD Intake Remarks</label>
            <textarea {...register("lodRemarks")} className="w-full p-6 bg-slate-50 rounded-[2rem] text-sm font-medium outline-none focus:ring-2 focus:ring-blue-500/20" rows={3} placeholder="Add any specific observations for the Director..." />
          </div>

          {/* Validation Diagnostics */}
          {Object.keys(errors).length > 0 && (
            <div className="p-4 bg-rose-50 rounded-2xl border border-rose-100 font-mono text-[10px] text-rose-600">
              {Object.entries(errors).map(([key, err]: any) => (
                <p key={key}>⚠️ {key.toUpperCase()}: {err.message}</p>
              ))}
            </div>
          )}

          <button 
            type="submit" disabled={isSubmitting} 
            className="w-full py-8 bg-slate-900 text-white rounded-[2.5rem] font-black uppercase text-[12px] tracking-[0.2em] flex items-center justify-center gap-4 hover:bg-blue-600 transition-all shadow-2xl disabled:opacity-50"
          >
            {isSubmitting ? <Loader2 className="animate-spin w-6 h-6" /> : <><Save className="w-5 h-5" /> Authorize & Route Application</>}
          </button>
        </form>
      )}
    </div>
  );
}