"use client";

import { useState, useTransition, ChangeEvent } from "react";
import Image from "next/image";
import { uploadUserSignature } from "@/lib/LocalInspectionReports/actions";

interface ProfileTabProps {
  userRecord: {
    id: string;
    name: string;
    email: string;
    role: string | null;
    division: string | null;
    directorate: string | null;
    signature_url?: string | null;
  } | null;
}

export default function ProfileTab({ userRecord }: ProfileTabProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [status, setStatus] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      setPreviewUrl(URL.createObjectURL(file));
      setStatus(null);
    }
  };

  const handleUpload = () => {
    if (!selectedFile) return;

    const formData = new FormData();
    formData.append("signature", selectedFile);

    startTransition(async () => {
      const res = await uploadUserSignature(formData);
      if (res.success) {
        setStatus({ type: "success", msg: "Digital signature updated successfully!" });
        setSelectedFile(null);
      } else {
        setStatus({ type: "error", msg: res.error || "Failed to upload signature." });
      }
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      {/* User Information Summary Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm">
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-800 mb-4">
          Officer Authentication Record
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Officer Name</span>
            <span className="font-bold text-slate-800 text-sm">{userRecord?.name || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Designated Role</span>
            <span className="font-bold text-slate-800 text-sm">{userRecord?.role || "Staff"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Division</span>
            <span className="font-bold text-slate-800 text-sm">{userRecord?.division || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Official Email</span>
            <span className="font-medium text-slate-700">{userRecord?.email || "N/A"}</span>
          </div>
          <div>
            <span className="text-slate-400 font-semibold block uppercase">Directorate</span>
            <span className="font-medium text-slate-700">{userRecord?.directorate || "Veterinary Medicine"}</span>
          </div>
        </div>
      </div>

      {/* Signature Management Section */}
      <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-sm space-y-6">
        <div>
          <h2 className="text-base font-bold text-slate-900">Official Sign-off Signature</h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Upload your official signature image to authorize inspection reports, CAPA endorsements, and GMP clearances.
          </p>
        </div>

        {status && (
          <div
            className={`p-3 rounded-lg text-xs font-semibold ${
              status.type === "success"
                ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}
          >
            {status.msg}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Active Signature Display */}
          <div className="border border-slate-200 rounded-lg p-4 bg-slate-50/50 flex flex-col justify-between space-y-3">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Current Active Signature
              </span>
              <div className="mt-2 h-36 w-full border border-dashed border-slate-300 rounded-lg bg-white flex items-center justify-center p-2 relative overflow-hidden">
                {userRecord?.signature_url ? (
                  <img
                    src={userRecord.signature_url}
                    alt="Current Signature"
                    className="max-h-full max-w-full object-contain"
                  />
                ) : (
                  <div className="text-center text-xs text-slate-400">
                    <span>No active signature configured</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-[11px] text-slate-500 font-medium">
              Status:{" "}
              {userRecord?.signature_url ? (
                <span className="text-emerald-600 font-bold">● Active & Verified</span>
              ) : (
                <span className="text-amber-600 font-bold">● Action Required</span>
              )}
            </div>
          </div>

          {/* Upload Box */}
          <div className="border border-slate-200 rounded-lg p-4 bg-white flex flex-col justify-between space-y-4">
            <div>
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">
                Upload New Signature Image
              </span>

              <div className="mt-2 space-y-3">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/webp"
                  onChange={handleFileChange}
                  className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 cursor-pointer"
                />

                {previewUrl && (
                  <div className="p-2 border border-blue-200 bg-blue-50/30 rounded-lg">
                    <span className="text-[10px] font-bold text-blue-700 block mb-1">
                      New Selection Preview:
                    </span>
                    <div className="h-20 w-full flex items-center justify-center bg-white rounded border border-slate-200">
                      <img
                        src={previewUrl}
                        alt="Preview"
                        className="max-h-full max-w-full object-contain"
                      />
                    </div>
                  </div>
                )}

                <p className="text-[11px] text-slate-400 leading-tight">
                  Transparent <strong>.PNG</strong> files with dark ink on transparent/white background recommended. Max file size: 2MB.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUpload}
              disabled={!selectedFile || isPending}
              className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
            >
              {isPending ? "Uploading Signature..." : "Upload & Save Signature"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}