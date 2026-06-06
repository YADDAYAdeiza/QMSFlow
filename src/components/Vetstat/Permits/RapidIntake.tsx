'use client';

import { useState, useTransition } from 'react';
import { createClient } from '@supabase/supabase-js'; // Used purely for client-side storage pass-through
import { Camera, Loader2, AlertCircle, RefreshCcw, CheckCircle, XCircle } from 'lucide-react';
import ManualMappingModal from './ManualMappingModal';
import { replacePermitSubstancesAction, deductPermitBalancesAction } from '@/lib/actions/Vetstat/Permits/permitActions';

// Minimized client initialization for local browser storage uploads only
const supabaseClient = createClient(
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
  const [isCommitting, startCommitTransition] = useTransition();
  const [extractedData, setExtractedData] = useState<any[] | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [mappingIndex, setMappingIndex] = useState<number | null>(null);
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

      setCurrentFilePath(filePath);

      // Safe isolated upload targeted to the authorized 'Documents' storage bucket
      const { error: uploadError } = await supabaseClient.storage
        .from('Documents') 
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      const response = await fetch('/api/process-packing-list', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ companyName, filePath, mode, permitId }), 
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Processing failed');
      setExtractedData(data.validation);
    } catch (error: any) {
      setErrorMessage(error.message || "An error occurred while routing the file source.");
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

  const handleFinalCommit = () => {
    setErrorMessage(null);
    const readyItems = extractedData?.filter(item => item.status === "READY") || [];

    if (readyItems.length === 0) {
      setErrorMessage("No substances matched the Master list. Please map them manually.");
      return;
    }

    if (!currentFilePath) {
      setErrorMessage("Document reference token missing. Please re-upload the verification sheet.");
      return;
    }

    startCommitTransition(async () => {
      try {
        if (mode === 'INTAKE') {
          await replacePermitSubstancesAction({
            permitId,
            filePath: currentFilePath,
            items: readyItems.map(item => ({
              substance_id: item.substanceId,
              qty: Number(item.qty)
            }))
          });
        } else {
          await deductPermitBalancesAction({
            permitId,
            filePath: currentFilePath,
            items: readyItems.map(item => ({
              substanceId: item.substanceId,
              confirmed: item.confirmed,
              qty: parseFloat(item.qty)
            }))
          });
        }
        
        onComplete();
      } catch (error: any) {
        setErrorMessage(error.message || "Failed to commit ledger changes securely.");
      }
    });
  };

  return (
    <div className="p-2 bg-white rounded-xl">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs font-black uppercase text-slate-400 tracking-wider">
          {mode === 'INTAKE' ? 'Authorized List Population' : 'Usage Deduction Process'}
        </h3>
        {extractedData && (
          <button 
            type="button"
            onClick={() => setExtractedData(null)} 
            className="text-xs font-bold flex items-center gap-1 text-slate-400 hover:text-rose-600 transition"
          >
            <RefreshCcw size={12} /> Restart Scan
          </button>
        )}
      </div>

      {errorMessage && (
        <div className="mb-4 p-3.5 bg-rose-50 border border-rose-100 text-rose-700 rounded-xl flex items-start gap-2.5 text-xs font-bold">
          <AlertCircle size={16} className="shrink-0 mt-0.5 text-rose-600" /> 
          <div>{errorMessage}</div>
        </div>
      )}

      {!extractedData ? (
        <div className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center bg-slate-50/40">
          {isProcessing ? (
            <div className="flex flex-col items-center gap-3 py-4">
              <Loader2 className="h-8 w-8 text-emerald-600 animate-spin" />
              <p className="text-xs font-black uppercase text-slate-400 tracking-wider animate-pulse">Vision AI Reading Document...</p>
            </div>
          ) : (
            <label className="cursor-pointer group block">
              <div className="bg-white p-3.5 rounded-xl border border-slate-100 shadow-sm inline-block mb-3 group-hover:scale-105 transition text-emerald-600">
                <Camera size={24} />
              </div>
              <p className="text-slate-700 font-black text-xs uppercase tracking-wide block mb-1">Upload Allocation Document</p>
              <p className="text-slate-400 text-[11px] mb-5">Scan verification sheets to {mode === 'INTAKE' ? 'replace' : 'deduct'} balances</p>
              <div className="bg-slate-900 text-white text-xs font-black uppercase tracking-wider px-6 py-2.5 rounded-xl hover:bg-slate-800 transition inline-block shadow-sm">
                Select File
              </div>
              <input type="file" onChange={handleFileUpload} className="hidden" accept="image/*,application/pdf" />
            </label>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="overflow-hidden rounded-xl border border-slate-100 shadow-sm">
            <table className="w-full text-xs text-left border-collapse">
              <thead className="bg-slate-50/80 border-b border-slate-100 text-[10px] font-black uppercase text-slate-400 tracking-wider">
                <tr>
                  <th className="p-3 w-[55%]">Substance Data Profile</th>
                  <th className="p-3 text-right w-[25%]">Detected Qty</th>
                  <th className="p-3 text-center w-[20%]">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {extractedData.map((item, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/40 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-700">{item.confirmed}</div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5 max-w-[180px] truncate">{item.rawName}</div>
                    </td>
                    <td className="p-3 text-right font-mono">
                      <span className="font-black text-slate-800">{item.qty}</span>
                      <span className="text-slate-400 ml-1 font-bold text-[10px]">KG</span>
                    </td>
                    <td className="p-3">
                      <div className="flex justify-center">
                        <button 
                          type="button"
                          onClick={() => setMappingIndex(idx)}
                          className={`p-1 rounded-lg border transition ${
                            item.status === 'READY' 
                              ? 'text-emerald-600 bg-emerald-50 border-emerald-100' 
                              : 'text-rose-500 bg-rose-50 border-rose-100 animate-pulse'
                          }`}
                          title={item.status === 'READY' ? "Match Verified Successfully" : "Mapping Conflict Detected"}
                        >
                          {item.status === "READY" ? <CheckCircle size={16} /> : <XCircle size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-col sm:flex-row justify-between sm:items-center bg-slate-50 border border-slate-100 p-4 rounded-xl gap-4">
            <div className="text-[11px] text-slate-400 font-medium leading-relaxed max-w-xs">
              {mode === 'INTAKE' 
                ? <span className="text-amber-600 font-bold">CRITICAL: Executing this intake protocol will completely overwrite all historical substance profiles bound under this file context node.</span>
                : <span>Deduction vectors will accurately offset remaining volume balances downstream.</span>
              }
            </div>
            <button 
              type="button"
              onClick={handleFinalCommit}
              disabled={isCommitting || !extractedData?.some(i => i.status === "READY")}
              className={`flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-black uppercase tracking-wider transition shrink-0 ${
                mode === 'INTAKE' ? 'bg-emerald-700 hover:bg-emerald-800' : 'bg-rose-600 hover:bg-rose-700'
              } disabled:opacity-30`}
            >
              {isCommitting ? <Loader2 className="animate-spin" size={14}/> : <CheckCircle size={14}/>}
              Confirm execution
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