"use client";
// @/components/LocalInspectionReports/InspectionChecklistForm.tsx

import { useState, useEffect, useRef } from "react";

interface Observation {
  id: string;
  severity: "critical" | "major" | "other";
  text: string;
}

interface ChecklistData {
  // Step 1: Meta & History
  report_doc_number: string;
  inspection_dates: string;
  type_of_inspection: string;
  inspected_site_name: string;
  site_contact_details: { phone: string; email: string; website: string };
  activities_carried_out: string[];
  vicinity_assessment: string;
  lead_inspector: string;
  co_inspectors: string;
  historical_baseline: {
    prev_date_type: string;
    prev_team: string;
    past_capa_status: string;
    major_changes: string;
  };
  // Step 2: The 6 Quality Systems
  pqs_score: number; pqs_notes: string;
  personnel_score: number; personnel_notes: string;
  premises_equipment_score: number; premises_equipment_notes: string;
  qualification_validation_score: number; qualification_validation_notes: string;
  material_management_score: number; material_management_notes: string;
  laboratory_control_score: number; laboratory_control_notes: string;
  // Step 3: Synthesis
  critical_count: number;
  major_count: number;
  other_count: number;
  observations: Observation[];
  final_recommendation: string;
}

interface ChecklistFormProps {
  initialData?: Partial<ChecklistData> | null;
  onSave: (data: ChecklistData) => void | Promise<void>;
  onSaveDraft?: (data: ChecklistData) => void | Promise<void>; 
  onChange?: (data: ChecklistData) => void;
  isReadOnly?: boolean;
}

export default function InspectionChecklistForm({ 
  initialData, 
  onSave, 
  onSaveDraft, 
  onChange,
  isReadOnly = false 
}: ChecklistFormProps) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  
  // --- ASYNC BUTTON VISUAL FEEDBACK STATES ---
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);

  // --- STABLE CONTROLLED STATE HYDRATION ---
  const [formData, setFormData] = useState<ChecklistData>(() => ({
    report_doc_number: initialData?.report_doc_number || "OKL-LA-PRI-01-2026",
    inspection_dates: initialData?.inspection_dates || "",
    type_of_inspection: initialData?.type_of_inspection || "PRI",
    inspected_site_name: initialData?.inspected_site_name || "Orange Kalbe Limited",
    site_contact_details: initialData?.site_contact_details || { phone: "", email: "", website: "" },
    activities_carried_out: Array.isArray(initialData?.activities_carried_out) ? initialData.activities_carried_out : [],
    vicinity_assessment: initialData?.vicinity_assessment || "",
    lead_inspector: initialData?.lead_inspector || "",
    co_inspectors: initialData?.co_inspectors || "",
    historical_baseline: initialData?.historical_baseline || { prev_date_type: "", prev_team: "", past_capa_status: "", major_changes: "" },
    
    pqs_score: initialData?.pqs_score ?? 100, pqs_notes: initialData?.pqs_notes || "",
    personnel_score: initialData?.personnel_score ?? 100, personnel_notes: initialData?.personnel_notes || "",
    premises_equipment_score: initialData?.premises_equipment_score ?? 100, premises_equipment_notes: initialData?.premises_equipment_notes || "",
    qualification_validation_score: initialData?.qualification_validation_score ?? 100, qualification_validation_notes: initialData?.qualification_validation_notes || "",
    material_management_score: initialData?.material_management_score ?? 100, material_management_notes: initialData?.material_management_notes || "",
    laboratory_control_score: initialData?.laboratory_control_score ?? 100, laboratory_control_notes: initialData?.laboratory_control_notes || "",

    critical_count: initialData?.critical_count ?? 0,
    major_count: initialData?.major_count ?? 0,
    other_count: initialData?.other_count ?? 0,
    observations: Array.isArray(initialData?.observations) ? initialData.observations : [],
    final_recommendation: initialData?.final_recommendation || "PENDING"
  }));

  const lastEmittedDataRef = useRef<ChecklistData | null>(null);

  useEffect(() => {
    if (initialData) {
      const isEcho = lastEmittedDataRef.current && 
        JSON.stringify(initialData) === JSON.stringify(lastEmittedDataRef.current);

      if (!isEcho) {
        setFormData(prev => ({
          ...prev,
          ...initialData,
          site_contact_details: {
            ...prev.site_contact_details,
            ...(initialData.site_contact_details || {})
          },
          historical_baseline: {
            ...prev.historical_baseline,
            ...(initialData.historical_baseline || {})
          },
          activities_carried_out: Array.isArray(initialData.activities_carried_out) ? initialData.activities_carried_out : prev.activities_carried_out,
          observations: Array.isArray(initialData.observations) ? initialData.observations : prev.observations
        }));
      }
    }
  }, [initialData]);

  useEffect(() => {
    if (onChange) {
      lastEmittedDataRef.current = formData;
      onChange(formData);
    }
  }, [formData, onChange]);

  const [newObsText, setNewObsText] = useState("");
  const [newObsSeverity, setNewObsSeverity] = useState<"critical" | "major" | "other">("major");

  const toggleActivity = (activity: string) => {
    if (isReadOnly) return;
    const current = formData.activities_carried_out;
    setFormData(prev => ({
      ...prev,
      activities_carried_out: current.includes(activity) 
        ? current.filter(a => a !== activity) 
        : [...current, activity]
    }));
  };

  const addObservation = () => {
    if (!newObsText.trim()) return;

    const uniqueId = crypto.randomUUID();
    const newObs: Observation = { id: uniqueId, severity: newObsSeverity, text: newObsText.trim() };
    const updatedObs = [...formData.observations, newObs];
    
    setFormData(prev => ({
      ...prev,
      observations: updatedObs,
      critical_count: newObsSeverity === "critical" ? prev.critical_count + 1 : prev.critical_count,
      major_count: newObsSeverity === "major" ? prev.major_count + 1 : prev.major_count,
      other_count: newObsSeverity === "other" ? prev.other_count + 1 : prev.other_count,
    }));
    setNewObsText("");
  };

  const removeObservation = (id: string, severity: "critical" | "major" | "other") => {
    if (isReadOnly) return;
    setFormData(prev => ({
      ...prev,
      observations: prev.observations.filter(o => o.id !== id),
      critical_count: severity === "critical" ? Math.max(0, prev.critical_count - 1) : prev.critical_count,
      major_count: severity === "major" ? Math.max(0, prev.major_count - 1) : prev.major_count,
      other_count: severity === "other" ? Math.max(0, prev.other_count - 1) : prev.other_count,
    }));
  };

  // --- INTERCEPT WRAPPER HANDLERS ---
  const handleDraftSubmit = async () => {
    if (!onSaveDraft || isSavingDraft || isCompiling) return;
    try {
      setIsSavingDraft(true);
      await onSaveDraft(formData);
    } finally {
      setIsSavingDraft(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (isCompiling || isSavingDraft) return;
    try {
      setIsCompiling(true);
      await onSave(formData);
    } finally {
      setIsCompiling(false);
    }
  };

  // Helper reusable spinner element
  const Spinner = () => (
    <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
    </svg>
  );

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
      {/* WIZARD TABS HEADER */}
      <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold uppercase tracking-wider text-slate-500">
        <button type="button" onClick={() => setActiveTab(1)} className={`flex-1 py-3 text-center border-r border-slate-200 transition-all ${activeTab === 1 ? "bg-white text-emerald-700 border-b-2 border-b-emerald-600" : "hover:bg-slate-100"}`}>
          Step 1: Admin & Baseline
        </button>
        <button type="button" onClick={() => setActiveTab(2)} className={`flex-1 py-3 text-center border-r border-slate-200 transition-all ${activeTab === 2 ? "bg-white text-emerald-700 border-b-2 border-b-emerald-600" : "hover:bg-slate-100"}`}>
          Step 2: The 6 Quality Systems
        </button>
        <button type="button" onClick={() => setActiveTab(3)} className={`flex-1 py-3 text-center transition-all ${activeTab === 3 ? "bg-white text-emerald-700 border-b-2 border-b-emerald-600" : "hover:bg-slate-100"}`}>
          Step 3: Synthesis & Adjudication
        </button>
      </div>

      <div className="p-6">
        {/* --- STEP 1: ADMINISTRATIVE METADATA & HISTORICAL BASELINE --- */}
        {activeTab === 1 && (
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b pb-1 mb-3">Inspection Core Details & Facility Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Doc Number</label>
                  <input type="text" disabled className="w-full border p-2 bg-slate-100 rounded text-slate-600 font-mono text-xs font-medium" value={formData.report_doc_number} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Inspection Date(s)</label>
                  <input type="date" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.inspection_dates} onChange={e => setFormData({...formData, inspection_dates: e.target.value})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Inspection Type</label>
                  <select disabled={isReadOnly} className="w-full border p-2 rounded bg-white text-xs font-medium text-slate-800" value={formData.type_of_inspection} onChange={e => setFormData({...formData, type_of_inspection: e.target.value})}>
                    <option value="PPI">Pre-Production Inspection (PPI)</option>
                    <option value="PRI">Pre-Registration Inspection (PRI)</option>
                    <option value="RI">Routine Inspection (RI)</option>
                    <option value="FUI">Follow-Up / CAPA Verification (FUI)</option>
                  </select>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Inspected Site Name</label>
                <input type="text" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.inspected_site_name} onChange={e => setFormData({...formData, inspected_site_name: e.target.value})} />
              </div>
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Site Phone</label>
                  <input type="text" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.site_contact_details.phone} onChange={e => setFormData({...formData, site_contact_details: {...formData.site_contact_details, phone: e.target.value}})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Site Email</label>
                  <input type="email" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.site_contact_details.email} onChange={e => setFormData({...formData, site_contact_details: {...formData.site_contact_details, email: e.target.value}})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Site Website</label>
                  <input type="text" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.site_contact_details.website} onChange={e => setFormData({...formData, site_contact_details: {...formData.site_contact_details, website: e.target.value}})} />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Scope of Operations / Activities Carried Out</label>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-xs">
                {["Active Ingredient", "Finished Product", "Packaging", "Importing", "Lab Testing", "Batch Release"].map((act) => (
                  <label key={act} className="flex items-center gap-2 p-2 border rounded bg-slate-50 cursor-pointer select-none font-medium text-slate-700">
                    <input type="checkbox" disabled={isReadOnly} checked={formData.activities_carried_out.includes(act)} onChange={() => toggleActivity(act)} className="rounded text-emerald-600 focus:ring-0" />
                    <span>{act}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Lead Inspector</label>
                <input type="text" placeholder="e.g. Senior Regulatory Officer" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.lead_inspector} onChange={e => setFormData({...formData, lead_inspector: e.target.value})} />
              </div>
              <div>
                <label className="block font-bold text-slate-700 mb-1">Co-Inspectors / Trainees</label>
                <input type="text" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.co_inspectors} onChange={e => setFormData({...formData, co_inspectors: e.target.value})} />
              </div>
            </div>

            <div className="text-xs">
              <label className="block font-bold text-slate-700 mb-1">Vicinity Assessment</label>
              <textarea rows={2} disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" placeholder="Observe external physical features, surroundings, sanitation..." value={formData.vicinity_assessment} onChange={e => setFormData({...formData, vicinity_assessment: e.target.value})} />
            </div>

            <div>
              <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b pb-1 mb-3">Historical Baseline & Previous Performance</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previous Inspection Date & Type</label>
                  <input type="text" placeholder="e.g. 14th March 2024 (Routine)" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.historical_baseline.prev_date_type} onChange={e => setFormData({...formData, historical_baseline: {...formData.historical_baseline, prev_date_type: e.target.value}})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Previous Inspection Team</label>
                  <input type="text" disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.historical_baseline.prev_team} onChange={e => setFormData({...formData, historical_baseline: {...formData.historical_baseline, prev_team: e.target.value}})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Past CAPA Status / Outstanding Items</label>
                  <input type="text" placeholder="Fully implemented..." disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.historical_baseline.past_capa_status} onChange={e => setFormData({...formData, historical_baseline: {...formData.historical_baseline, past_capa_status: e.target.value}})} />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Major Changes Since Last Intervention</label>
                  <input type="text" placeholder="Facility upgrades, new lines..." disabled={isReadOnly} className="w-full border p-2 rounded text-xs font-medium text-slate-800" value={formData.historical_baseline.major_changes} onChange={e => setFormData({...formData, historical_baseline: {...formData.historical_baseline, major_changes: e.target.value}})} />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- STEP 2: THE 6 QUALITY SYSTEMS --- */}
        {activeTab === 2 && (
          <div className="space-y-6">
            <p className="text-xs text-slate-500 italic">Enter bullet points of raw observations. The system compilation framework will parse these metrics directly into the regulatory output draft.</p>
            
            {[
              { key: "pqs", label: "System 1: Pharmaceutical Quality System (PQS)", scoreKey: "pqs_score", notesKey: "pqs_notes", placeholder: "Sighted Site Master File Ref..." },
              { key: "personnel", label: "System 2: Personnel & Training Protocols", scoreKey: "personnel_score", notesKey: "personnel_notes", placeholder: "Key staff qualifications..." },
              { key: "premises", label: "System 3: Premises and Process Equipment", scoreKey: "premises_equipment_score", notesKey: "premises_equipment_notes", placeholder: "Zoning & layout check..." },
              { key: "validation", label: "System 4: Qualification and Validation", scoreKey: "qualification_validation_score", notesKey: "qualification_validation_notes", placeholder: "Validation Master Plan status..." },
              { key: "material", label: "System 5: Material Management & Storage", scoreKey: "material_management_score", notesKey: "material_management_notes", placeholder: "Vendor audits checklist..." },
              { key: "lab", label: "System 6: Laboratory Control (QC Operations)", scoreKey: "laboratory_control_score", notesKey: "laboratory_control_notes", placeholder: "Operations independence..." },
            ].map((sys) => (
              <div key={sys.key} className="border border-slate-100 rounded-lg p-4 bg-slate-50/50 space-y-2 text-xs">
                <div className="flex justify-between items-center">
                  <h4 className="font-bold text-slate-800 uppercase tracking-wide">{sys.label}</h4>
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-slate-500 text-[11px]">Grade:</span>
                    <input type="number" min="0" max="100" disabled={isReadOnly} className="w-16 p-1 border rounded text-center font-bold bg-white text-slate-800" value={(formData as any)[sys.scoreKey]} onChange={e => setFormData({...formData, [sys.scoreKey]: Math.min(100, Math.max(0, Number(e.target.value)))})} />
                    <span className="font-bold text-slate-600">%</span>
                  </div>
                </div>
                <textarea rows={3} disabled={isReadOnly} placeholder={sys.placeholder} className="w-full border p-2 rounded bg-white text-slate-800 text-xs font-medium" value={(formData as any)[sys.notesKey]} onChange={e => setFormData({...formData, [sys.notesKey]: e.target.value})} />
              </div>
            ))}
          </div>
        )}

        {/* --- STEP 3: SYNTHESIS & FINAL CONCLUSION --- */}
        {activeTab === 3 && (
          <div className="space-y-4 text-xs">
            <h3 className="text-xs font-bold uppercase tracking-wide text-slate-900 border-b pb-1">Deficiency Aggregates & Sign-off Adjudication</h3>
            
            <div className="grid grid-cols-3 gap-4 text-center">
              <div className="bg-rose-50 p-2 rounded border border-rose-200">
                <p className="text-[10px] uppercase font-bold text-rose-700">Critical</p>
                <p className="text-lg font-black text-rose-900">{formData.critical_count}</p>
              </div>
              <div className="bg-amber-50 p-2 rounded border border-amber-200">
                <p className="text-[10px] uppercase font-bold text-amber-700">Major</p>
                <p className="text-lg font-black text-amber-900">{formData.major_count}</p>
              </div>
              <div className="bg-blue-50 p-2 rounded border border-blue-200">
                <p className="text-[10px] uppercase font-bold text-blue-700">Other / Minor</p>
                <p className="text-lg font-black text-blue-900">{formData.other_count}</p>
              </div>
            </div>

            {/* DEFICIENCY INPUT REGISTER */}
            {!isReadOnly && (
              <div className="bg-slate-50 p-3 rounded border border-slate-200 space-y-2">
                <div className="flex gap-2">
                  <select value={newObsSeverity} onChange={e => setNewObsSeverity(e.target.value as any)} className="w-1/3 bg-white border p-2 rounded font-bold text-slate-800">
                    <option value="other">Other/Minor</option>
                    <option value="major">Major Deficiency</option>
                    <option value="critical">Critical Deficiency</option>
                  </select>
                  <input 
                    type="text" 
                    placeholder="Describe the non-conformance observation precisely..." 
                    value={newObsText} 
                    onChange={e => setNewObsText(e.target.value)} 
                    className="w-2/3 bg-white border p-2 rounded text-slate-800 text-xs font-medium" 
                  />
                </div>
                <button type="button" onClick={addObservation} className="w-full bg-slate-900 hover:bg-black text-white font-bold p-2 rounded transition-all text-xs">
                  ＋ Add to Deficiency Log
                </button>
              </div>
            )}

            {/* CURRENT LOG DISPLAY */}
            <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
              {formData.observations.length === 0 ? (
                <p className="text-slate-400 italic p-4 text-center border border-dashed rounded">No non-conformances registered yet for this cycle.</p>
              ) : (
                formData.observations.map((obs) => (
                  <div key={obs.id} className="p-2 border rounded bg-slate-50/50 flex justify-between items-center text-xs group">
                    <div className="flex gap-2 items-center overflow-hidden mr-2">
                      <span className={`flex-shrink-0 px-1.5 py-0.5 rounded text-[9px] text-white font-bold uppercase tracking-wide ${obs.severity === "critical" ? "bg-rose-600" : obs.severity === "major" ? "bg-amber-500" : "bg-blue-500"}`}>{obs.severity}</span>
                      <span className="text-slate-700 font-medium truncate">{obs.text}</span>
                    </div>
                    {!isReadOnly && (
                      <button type="button" onClick={() => removeObservation(obs.id, obs.severity)} className="text-rose-500 hover:text-rose-700 font-bold px-1.5 py-0.5 rounded hover:bg-rose-50 opacity-0 group-hover:opacity-100 transition-opacity">
                        ✕
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* FINAL ADJUDICATION DROPDOWN */}
            <div className="pt-2 border-t">
              <label className="block font-bold text-slate-800 mb-1 uppercase tracking-wide">Final Recommendation / Adjudication</label>
              <select disabled={isReadOnly} className="w-full border p-2.5 rounded bg-white font-semibold text-slate-800 text-xs" value={formData.final_recommendation} onChange={e => setFormData({...formData, final_recommendation: e.target.value})}>
                <option value="PENDING">Select / Awaiting Divisional Deputy Director Evaluation</option>
                <option value="APPROVED">Recommended for Approval / Issuance of Marketing Authorization</option>
                <option value="CAPA_PENDING">Compliance pending CAPA verification (Follow-up required)</option>
                <option value="REJECTED">Recommended for Rejection / Hold</option>
              </select>
            </div>
          </div>
        )}
      </div>

      {/* FOOTER ACTIONS PANEL */}
      <div className="bg-slate-50 px-6 py-4 border-t flex justify-between items-center">
        <button type="button" disabled={activeTab === 1 || isSavingDraft || isCompiling} onClick={() => setActiveTab((activeTab - 1) as any)} className="px-3 py-1.5 border font-semibold text-xs rounded bg-white hover:bg-slate-50 disabled:opacity-50 text-slate-700">
          ← Back
        </button>
        
        <div className="flex items-center gap-2">
          {/* INTERMEDIARY DRAFT ACTION BUTTON */}
          {!isReadOnly && onSaveDraft && (
            <button 
              type="button" 
              disabled={isSavingDraft || isCompiling}
              onClick={handleDraftSubmit} 
              className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-200/60 hover:bg-slate-200 disabled:opacity-50 rounded transition-all flex items-center gap-2 min-w-[130px] justify-center"
            >
              {isSavingDraft ? (
                <>
                  <Spinner />
                  <span>Saving Draft...</span>
                </>
              ) : (
                <span>Save Draft Progress</span>
              )}
            </button>
          )}

          {activeTab < 3 ? (
            <button 
              type="button" 
              disabled={isSavingDraft || isCompiling}
              onClick={() => setActiveTab((activeTab + 1) as any)} 
              className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-bold text-xs rounded"
            >
              Next Section →
            </button>
          ) : (
            !isReadOnly && (
              <button 
                type="button" 
                disabled={isCompiling || isSavingDraft}
                onClick={handleFinalSubmit} 
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold text-xs rounded-lg shadow transition-all flex items-center gap-2 min-w-[210px] justify-center"
              >
                {isCompiling ? (
                  <>
                    <Spinner />
                    <span>Running Engine...</span>
                  </>
                ) : (
                  <>
                    <span>✨ Compile Draft via NAFDAC AI Engine</span>
                  </>
                )}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}