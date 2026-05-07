'use client';

import { useState } from 'react';
import { createClient } from '@supabase/supabase-js';
import { Camera, Loader2, AlertCircle, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import ManualMappingModal from './ManualMappingModal';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

interface RapidIntakeProps {
  companyName: string;
  mode: 'INTAKE' | 'OUTAKE';
  permitId: string;
  onComplete: () => void;
}

export default function RapidIntake({ companyName, mode, permitId, onComplete }: RapidIntakeProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isCommitting, setIsCommitting] = useState(false);
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mappingIndex, setMappingIndex] = useState<number | null>(null);
  
  // NEW: State to track the file path for the audit log
  const [currentFilePath, setCurrentFilePath] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessing(true);
    setErrorMessage(null);

    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
      const dateFolder = new Date().toISOString().split('T')[0]; 
      const filePath = `${companyName}/${mode}/${dateFolder}/${fileName}`;

      // Save to state for later use in handleFinalCommit
      setCurrentFilePath(filePath);

      const { error: uploadError } = await supabase.storage
        .from('Permit') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const response = await fetch('/api/process-packing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, filePath, mode }), 
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Processing failed');
      setExtractedData(data.validation);
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleManualUpdate = (updatedItem: any) => {
    if (mappingIndex !== null && extractedData) {
      const newData = [...extractedData];
      newData[mappingIndex] = {
        ...newData[mappingIndex],
        confirmed: updatedItem.substance || updatedItem.substance_name, 
        substanceId: updatedItem.id || updatedItem.substance_id, 
        permit: updatedItem.permit_number || "MANUAL MAPPING",
        status: "READY"
      };
      setExtractedData(newData);
      setMappingIndex(null);
    }
  };

  const handleFinalCommit = async () => {
    setIsCommitting(true);
    setErrorMessage(null);
    try {
      const readyItems = extractedData?.filter(item => item.status === "READY") || [];

      if (readyItems.length === 0) {
        throw new Error("No substances matched the Master list. Please map them manually.");
      }

      // --- INTAKE LOGIC ---
      if (mode === 'INTAKE') {
        const { error } = await supabase.rpc('replace_permit_substances', {
          p_permit_id: permitId,
          p_file_path: currentFilePath, // NEW: Added for audit trail
          p_items: readyItems.map(item => ({
            substance_id: item.substanceId,
            qty: item.qty
          }))
        });
        if (error) throw error;
      } 
      // --- OUTAKE LOGIC ---
      else {
        // Yes, OUTAKE also needs the file path for each deduction log
        for (const item of readyItems) {
          const { error } = await supabase.rpc('deduct_permit_balance', {
            p_permit_id: permitId,
            p_substance_id: item.substanceId,
            p_amount: parseFloat(item.qty),
            p_file_path: currentFilePath // NEW: Added for audit trail
          });

          if (error) {
            throw new Error(`Failed to deduct ${item.confirmed}: ${error.message}`);
          }
        }
      }
      
      onComplete(); 
    } catch (error: any) {
      setErrorMessage(error.message);
    } finally {
      setIsCommitting(false);
    }
  };

  return (
    <div className="p-6 bg-white rounded-xl">
      {/* ... (Keep your existing UI code below) ... */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-slate-800 tracking-tight">
          {mode === 'INTAKE' ? 'Authorized List Population' : 'Usage Deduction'}
        </h3>
        {extractedData && (
          <button onClick={() => setExtractedData(null)} className="text-sm flex items-center gap-1 text-slate-400 hover:text-rose-600 transition">
            <RefreshCcw size={14} /> Restart Scan
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3 bg-rose-50 border border-rose-100 text-rose-600 rounded-lg flex items-center gap-2 text-xs font-medium">
          <AlertCircle size={16} /> {errorMessage}
        </div>
      )}

      {!extractedData ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-12 text-center bg-slate-50/50">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3">
              <Loader2 className="h-10 w-10 text-emerald-600 animate-spin" />
              <p className="text-slate-500 font-medium animate-pulse">Vision AI Reading Document...</p>
            </div>
          ) : (
            <label className="cursor-pointer group">
              <div className="bg-white p-4 rounded-full shadow-sm border border-slate-200 inline-block mb-4 group-hover:scale-110 transition">
                <Camera size={32} className="text-emerald-600" />
              </div>
              <p className="text-slate-600 font-bold block mb-2">Upload Packing List / Permit</p>
              <p className="text-slate-400 text-xs mb-6">Scan to {mode === 'INTAKE' ? 'replace' : 'deduct'} substances</p>
              <div className="bg-emerald-600 text-white px-8 py-3 rounded-full font-bold hover:bg-emerald-700 transition inline-block">
                Select File
              </div>
              <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider">
                <tr>
                  <th className="p-4">Substance</th>
                  <th className="p-4 text-right">Quantity</th>
                  <th className="p-4 text-center">Verification</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {extractedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50 transition">
                    <td className="p-4">
                      <div className="font-bold text-slate-900 text-sm">{item.confirmed}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-1">{item.rawName}</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="font-black text-slate-700 text-sm">{item.qty}</span>
                      <span className="text-slate-400 ml-1 font-bold">KG</span>
                    </td>
                    <td className="p-4">
                      <div className="flex justify-center">
                        <button 
                          onClick={() => setMappingIndex(idx)}
                          className={`p-2 rounded-full transition ${item.status === 'READY' ? 'text-emerald-500 bg-emerald-50' : 'text-rose-500 bg-rose-50 animate-pulse'}`}
                        >
                          {item.status === "READY" ? <CheckCircle size={20} /> : <XCircle size={20} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100">
            <div className="text-xs text-slate-500 max-w-[200px]">
              {mode === 'INTAKE' 
                ? <span className="text-amber-600 font-bold">WARNING: This will replace all authorized substances currently listed for this permit.</span>
                : <span>Deduction will be applied to the remaining balances.</span>
              }
            </div>
            <button 
              onClick={handleFinalCommit}
              disabled={isCommitting || !extractedData?.some(i => i.status === "READY")}
              className={`flex items-center gap-2 px-6 py-2 rounded-lg text-white font-bold transition ${
                mode === 'INTAKE' ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-30`}
            >
              {isCommitting ? <Loader2 className="animate-spin" size={18}/> : <CheckCircle size={18}/>}
              CONFIRM {mode}
            </button>
          </div>
        </div>
      )}

      {mappingIndex !== null && (
        <ManualMappingModal 
          companyName={companyName}
          rawName={extractedData![mappingIndex].rawName}
          onClose={() => setMappingIndex(null)}
          onConfirm={handleManualUpdate}
        />
      )}
    </div>
  );
}