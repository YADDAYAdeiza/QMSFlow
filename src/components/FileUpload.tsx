"use client"

import React, { useState } from 'react'
import { Upload, CheckCircle2, Loader2, FileText } from 'lucide-react'
import { buildCompanyFilePath, uploadDossierFile, CompanySubFolder } from '@/lib/utils/supabaseUpload'

interface FileUploadProps {
  label: string
  onUploadComplete: (url: string) => void
  companyId?: string | number | null
  companyName?: string // <--- 1. Added companyName prop
  applicationId?: string
  folder?: CompanySubFolder
}

export default function FileUpload({ 
  label, 
  onUploadComplete, 
  companyId, 
  companyName, // <--- Destructure companyName
  applicationId, 
  folder = '06_Facility_Verification' 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setFileName(file.name)

      // 1. Build the standardized, safe path passing both companyId and companyName fallback
      const filePath = buildCompanyFilePath(
        companyId ? String(companyId) : undefined,
        folder,
        file.name,
        applicationId,
        companyName // <--- 2. Forward companyName so pre-submission folders use what you typed!
      )

      // 2. Upload file via the standardized utility into the 'documents' bucket
      const publicUrl = await uploadDossierFile(file, filePath)

      // 3. Trigger callback with the public URL
      onUploadComplete(publicUrl)

    } catch (error: any) {
      console.error('Upload Error:', error.message)
      alert('Upload failed: ' + (error.message || 'Unknown error'))
      setFileName(null)
    } finally {
      setIsUploading(false)
    }
  }

  return (
    <div className="space-y-2">
      <label className="text-[10px] font-black uppercase text-blue-900/50 ml-1">
        {label}
      </label>
      
      <div className="relative group">
        <input 
          type="file" 
          onChange={handleFileChange}
          accept=".pdf"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
          disabled={isUploading}
        />
        
        <div className={`
          flex items-center justify-between p-4 rounded-xl border-2 border-dashed transition-all
          ${fileName 
            ? 'bg-emerald-50 border-emerald-200' 
            : 'bg-white border-blue-100 group-hover:border-blue-300'}
        `}>
          <div className="flex items-center gap-3">
            {isUploading ? (
              <Loader2 className="w-5 h-5 text-blue-600 animate-spin" />
            ) : fileName ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-500" />
            ) : (
              <Upload className="w-5 h-5 text-blue-400" />
            )}
            
            <span className={`text-xs font-bold truncate max-w-[150px] ${fileName ? 'text-emerald-700' : 'text-slate-400'}`}>
              {isUploading ? 'Uploading to Documents...' : fileName || 'Click to upload PDF'}
            </span>

          </div>

          {!isUploading && !fileName && (
            <FileText className="w-4 h-4 text-slate-200" />
          )}
        </div>
      </div>
    </div>
  )
}