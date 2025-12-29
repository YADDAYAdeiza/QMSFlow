"use client"

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { lodFormSchema } from '@/lib/validations'; // We'll create this next
import { submitLODApplication } from '@/lib/actions';


export default function LODEntryForm() {
  const { register, handleSubmit, watch, formState: { errors, isValid } } = useForm({
    resolver: zodResolver(lodFormSchema),
    mode: "onChange" // This checks "Satisfied" logic in real-time
  });

  const selectedType = watch("type");

  const onSubmit = async (data: any) => {
    await submitLODApplication(data);
    alert("Application Pushed to Director!");
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 p-6 bg-white rounded-lg shadow">
      <h2 className="text-2xl font-bold border-b pb-2">LOD: New Application</h2>
      
      {/* Basic Info */}
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

      {/* Conditional Fields based on Type */}
      {selectedType === "Facility Verification" && (
        <div className="bg-blue-50 p-4 rounded space-y-2">
          <input {...register("facilityName")} placeholder="Facility Name (Foreign Owner)" className="w-full border p-2 rounded" />
          <label className="block text-sm font-medium">Upload Power of Attorney (URL for now)</label>
          <input {...register("poaUrl")} className="w-full border p-2" placeholder="https://..." />
        </div>
      )}

      {(selectedType === "Inspection Report Review (local)" || selectedType === "Inspection Report Review (foreign)") && (
        <div className="bg-green-50 p-4 rounded space-y-2">
          <input {...register("companyAddress")} placeholder="Address of Company" className="w-full border p-2 rounded" />
          <input {...register("productCategory")} placeholder="Product Category" className="w-full border p-2 rounded" />
          <label className="block text-sm font-medium">Upload Inspection Report (URL for now)</label>
          <input {...register("inspectionReportUrl")} className="w-full border p-2" placeholder="https://..." />
        </div>
      )}

      {/* Multi-Division Select */}
      <div>
        <label className="block font-bold">Assign to Divisions:</label>
        <div className="flex gap-4 mt-2">
          {["VMD", "PAD", "AFPD", "IRSD"].map(div => (
            <label key={div} className="flex items-center gap-2">
              <input type="checkbox" value={div} {...register("divisions")} /> {div}
            </label>
          ))}
        </div>
      </div>

      <textarea {...register("initialComment")} placeholder="LOD Comments/Remarks" className="w-full border p-2 h-24" />

      {/* THE SATISFIED LOGIC BUTTON */}
      <button 
        type="submit" 
        disabled={!isValid}
        className={`w-full py-3 rounded font-bold text-white ${isValid ? 'bg-blue-600' : 'bg-gray-400 cursor-not-allowed'}`}
      >
        {isValid ? "Move to Director" : "Complete All Fields to Move"}
      </button>
    </form>
  );
}