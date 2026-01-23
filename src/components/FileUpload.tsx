"use client"

import React, { useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Upload, CheckCircle2, Loader2, FileText } from 'lucide-react'

interface FileUploadProps {
  label: string
  onUploadComplete: (url: string) => void
}

export default function FileUpload({ label, onUploadComplete }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [fileName, setFileName] = useState<string | null>(null)

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    try {
      setIsUploading(true)
      setFileName(file.name)

      // 1. Create a unique path (ApplicationNumber/Filename)
      // We use a timestamp to prevent overwriting files with the same name
      const fileExt = file.name.split('.').pop()
      const filePath = `intake_${Date.now()}.${fileExt}`

      // 2. UPLOAD TO SUPABASE
      // Bucket name: 'documents' (Lowercase as requested)
      const { data, error: uploadError } = await supabase.storage
        .from('documents')
        .upload(filePath, file)

      if (uploadError) throw uploadError

      // 3. GET THE PUBLIC URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(filePath)

      // 4. TRIGGER CALLBACK
      // This sends the URL back to LODEntryForm.tsx to fill poaUrl or inspectionReportUrl
      onUploadComplete(publicUrl)

    } catch (error: any) {
      console.error('Upload Error:', error.message)
      alert('Upload failed: ' + error.message)
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