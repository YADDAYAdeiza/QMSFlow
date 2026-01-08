"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations';
import { submitLODApplication } from '@/lib/actions/index';
import FileUpload from './FileUpload'; 

export default function LODEntryForm() {
  const { 
    register, 
    handleSubmit, 
    watch, 
    setValue, 
    reset, 
    formState: { isValid, isSubmitting, isSubmitSuccessful } 
  } = useForm({
    resolver: zodResolver(lodFormSchema),
    mode: "onChange"
  });

  const selectedType = watch("type");

  const onSubmit = async (data: any) => {
    try {
      await submitLODApplication(data);
      // reset() is handled by the isSubmitSuccessful view or manually
    } catch (error) {
      console.error("Submission failed", error);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      {isSubmitSuccessful ? (
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-8 rounded-xl text-center shadow-lg">
            <h3 className="text-xl font-bold mb-2">Successfully Pushed!</h3>
            <p>Application has been moved to the Director's inbox.</p>
            <button 
              onClick={() => reset()} 
              className="mt-4 text-sm underline font-bold"
            >
              Enter another application
            </button>
          </div>        
      ) : ( // <--- FIXED: Ensure this bracket and the following form code are balanced
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white rounded-lg shadow">
          <h2 className="text-2xl font-bold border-b pb-2">LOD: New Application</h2>
          
          <div className="grid grid-cols-2 gap-4">
            <input {...register("appNumber")} placeholder="Application Number" className="border p-2 rounded" />
            <input {...register("companyName")} placeholder="Company Name (Local)" className="border p-2 rounded" />
          </div>

          <select {...register("type")} className="w-full border p-2 rounded">
            <option value="">Select Application Type</option>
            <option value="Facility Verification">Facility Verification</option>
            <option value="Inspection Report Review (local)">Inspection Report Review (local)</option>
            <option value="Inspection Report Review (foreign)">Inspection Report Review (foreign)</option>
          </select>

          {selectedType === "Facility Verification" && (
            <div className="bg-blue-50 p-4 rounded space-y-4">
              <input {...register("facilityName")} placeholder="Facility Name (Foreign Owner)" className="w-full border p-2 rounded" />
              <FileUpload 
                label="Upload Power of Attorney (PDF)" 
                onUploadComplete={(url) => setValue("poaUrl", url, { shouldValidate: true })} 
              />
              <input type="hidden" {...register("poaUrl")} />
            </div>
          )}

          {(selectedType?.includes("Inspection")) && (
            <div className="bg-green-50 p-4 rounded space-y-4">
              <input {...register("companyAddress")} placeholder="Address of Company" className="w-full border p-2 rounded" />
              <input {...register("productCategory")} placeholder="Product Category" className="border p-2 rounded w-full" />
              <FileUpload 
                label="Upload Inspection Report (PDF)" 
                onUploadComplete={(url) => setValue("inspectionReportUrl", url, { shouldValidate: true })} 
              />
              <input type="hidden" {...register("inspectionReportUrl")} />
            </div>
          )}

          <div>
            <label className="block font-bold">Assign to Divisions:</label>
            <div className="flex gap-4 mt-2">
              {["VMD", "AFPD", "PAD", "IRSD"].map(div => (
                <label key={div} className="flex items-center gap-2">
                  <input type="checkbox" value={div} {...register("divisions")} /> {div}
                </label>
              ))}
            </div>
          </div>

          <textarea {...register("initialComment")} placeholder="LOD Comments/Remarks" className="w-full border p-2 h-24" />

          <button 
            type="submit" 
            disabled={!isValid || isSubmitting} 
            className={`w-full px-4 py-3 rounded font-bold text-white transition-all ${
              isSubmitting || !isValid 
                ? 'bg-gray-400 cursor-not-allowed' 
                : 'bg-blue-600 hover:bg-blue-700'
            } ${isSubmitting ? 'animate-pulse' : ''}`} // <--- HIGHLIGHT: Cleaned up logic here
          >
            {isSubmitting ? (
              <span className="flex items-center justify-center gap-2">
                Processing...
              </span>
            ) : (
              "Move to Director"
            )}
          </button>
        </form>
      )}
    </div>
  );
}