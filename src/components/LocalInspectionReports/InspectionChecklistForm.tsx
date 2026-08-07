"use client";
// @/components/LocalInspectionReports/InspectionChecklistForm.tsx

import { useState, useEffect, useRef } from "react";

export type QualitySystemKey = 
  | 'pqs' 
  | 'personnel' 
  | 'premises_equipment' 
  | 'qualification_validation' 
  | 'material_management' 
  | 'laboratory_control';

export type RootCauseCategory = 
  | 'SOP_Deficit' 
  | 'Training_Failure' 
  | 'Equipment_Breakdown' 
  | 'Design_Flaw' 
  | 'Human_Error' 
  | 'Vendor_Issue' 
  | 'Other';

export interface Observation {
  id: string;
  severity: "critical" | "major" | "other";
  system_category: QualitySystemKey; // Operational Sub-domain
  text: string;
  root_cause_category?: RootCauseCategory | ""; // Root Cause Taxonomy
}

export interface ChecklistData {
  // Step 1: Meta & History
  report_doc_number: string;
  inspection_dates: string;
  type_of_inspection: string;
  inspected_site_name: string;
  notificationEmail?: string;
  site_contact_details: { phone: string; email: string; website: string };
  
  // Geolocation Fields
  latitude?: number | string | null;
  longitude?: number | string | null;

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
  // Step 3: Synthesis & Cycle Resolution Metrics
  critical_count: number;
  major_count: number;
  other_count: number;
  observations: Observation[];
  final_recommendation: string;
  
  // Analytics Tracking Stamps
  capa_first_submitted_at?: string;
  capa_approved_at?: string;
  rework_cycle_count?: number;
}

interface ChecklistFormProps {
  initialData?: Partial<ChecklistData> & Record<string, any> | null;  
  scheduledDate?: string; 
  leadInspectorName?: string;
  currentInspector?: string;
  onSave: (data: ChecklistData) => void | Promise<void>;
  onSaveDraft?: (data: ChecklistData) => void | Promise<void>; 
  onChange?: (data: ChecklistData) => void;
  isReadOnly?: boolean;
}

interface QualitySystemConfig {
  key: QualitySystemKey;
  label: string;
  scoreKey: keyof ChecklistData & string;
  notesKey: keyof ChecklistData & string;
  placeholder: string;
}

const Spinner = () => (
  <svg className="animate-spin h-3.5 w-3.5 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
  </svg>
);

const resolveInitialEmail = (data?: Record<string, any> | null) => {
  return data?.notificationEmail || data?.site_contact_details?.email || data?.applicant_email || "";
};

const resolveInitialInspector = (data?: Record<string, any> | null, fallbackInspector?: string) => {
  return data?.lead_inspector || data?.leadInspector || data?.inspector_name || fallbackInspector || "";
};

export default function InspectionChecklistForm({ 
  initialData, 
  scheduledDate,
  leadInspectorName,
  onSave, 
  onSaveDraft, 
  onChange,
  isReadOnly = false 
}: ChecklistFormProps) {
  const [activeTab, setActiveTab] = useState<1 | 2 | 3>(1);
  const [isSavingDraft, setIsSavingDraft] = useState(false);
  const [isCompiling, setIsCompiling] = useState(false);
  const [isGeolocating, setIsGeolocating] = useState(false);
  const [geoError, setGeoError] = useState<string | null>(null);

  // Helper to normalize observations with new schema guarantees
  const normalizeObservations = (obsArray: any[]): Observation[] => {
    if (!Array.isArray(obsArray)) return [];
    return obsArray.map(item => ({
      id: item.id || crypto.randomUUID(),
      severity: item.severity || "major",
      system_category: item.system_category || "pqs",
      text: item.text || "",
      root_cause_category: item.root_cause_category || ""
    }));
  };

  const [formData, setFormData] = useState<ChecklistData>(() => {
    const resolvedEmail = resolveInitialEmail(initialData);

    return {
      report_doc_number: initialData?.report_doc_number || "OKL-LA-PRI-01-2026",
      inspection_dates: initialData?.inspection_dates || "",
      type_of_inspection: initialData?.inspectionTypeMeta || "PRI",
      inspected_site_name: initialData?.inspected_site_name || initialData?.company_name || "Orange Kalbe Limited",
      notificationEmail: resolvedEmail,
      site_contact_details: {
        phone: initialData?.site_contact_details?.phone || initialData?.phone || "",
        email: resolvedEmail,
        website: initialData?.site_contact_details?.website || initialData?.website || ""
      },
      
      // Initialize Coordinates
      latitude: initialData?.latitude ?? initialData?.facility?.latitude ?? "",
      longitude: initialData?.longitude ?? initialData?.facility?.longitude ?? "",

      activities_carried_out: Array.isArray(initialData?.activities_carried_out) ? initialData.activities_carried_out : [],
      vicinity_assessment: initialData?.vicinity_assessment || "",
      lead_inspector: resolveInitialInspector(initialData, leadInspectorName),
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
      observations: normalizeObservations(initialData?.observations),
      final_recommendation: initialData?.final_recommendation || "PENDING",

      capa_first_submitted_at: initialData?.capa_first_submitted_at || "",
      capa_approved_at: initialData?.capa_approved_at || "",
      rework_cycle_count: initialData?.rework_cycle_count ?? 0,
    };
  });

  const lastEmittedDataRef = useRef<ChecklistData | null>(null);

  useEffect(() => {
    if (leadInspectorName && !formData.lead_inspector) {
      setFormData(prev => ({ ...prev, lead_inspector: leadInspectorName }));
    }
  }, [leadInspectorName, formData.lead_inspector]);

  useEffect(() => {
    if (!initialData) return;
    const isEcho = lastEmittedDataRef.current && initialData === lastEmittedDataRef.current;

    if (!isEcho) {
      const resolvedEmail = resolveInitialEmail(initialData);

      setFormData(prev => ({
        ...prev,
        ...initialData,
        inspected_site_name: initialData.inspected_site_name || initialData.company_name || prev.inspected_site_name,
        lead_inspector: resolveInitialInspector(initialData, leadInspectorName) || prev.lead_inspector,
        notificationEmail: resolvedEmail || prev.notificationEmail,
        site_contact_details: {
          phone: initialData.site_contact_details?.phone ?? initialData.phone ?? prev.site_contact_details.phone,
          email: resolvedEmail || prev.site_contact_details.email,
          website: initialData.site_contact_details?.website ?? initialData.website ?? prev.site_contact_details.website,
        },
        latitude: initialData.latitude ?? initialData.facility?.latitude ?? prev.latitude,
        longitude: initialData.longitude ?? initialData.facility?.longitude ?? prev.longitude,
        historical_baseline: {
          prev_date_type: initialData.historical_baseline?.prev_date_type ?? prev.historical_baseline.prev_date_type,
          prev_team: initialData.historical_baseline?.prev_team ?? prev.historical_baseline.prev_team,
          past_capa_status: initialData.historical_baseline?.past_capa_status ?? prev.historical_baseline.past_capa_status,
          major_changes: initialData.historical_baseline?.major_changes ?? prev.historical_baseline.major_changes,
        },
        activities_carried_out: Array.isArray(initialData.activities_carried_out) ? initialData.activities_carried_out : prev.activities_carried_out,
        observations: normalizeObservations(initialData.observations ?? prev.observations),
        capa_first_submitted_at: initialData.capa_first_submitted_at ?? prev.capa_first_submitted_at,
        capa_approved_at: initialData.capa_approved_at ?? prev.capa_approved_at,
        rework_cycle_count: initialData.rework_cycle_count ?? prev.rework_cycle_count,
      }));
    }
  }, [initialData?.report_doc_number, initialData?.inspected_site_name, leadInspectorName]);

  useEffect(() => {
    if (onChange) {
      lastEmittedDataRef.current = formData;
      onChange(formData);
    }
  }, [formData, onChange]);

  // Geolocation Handler
  const handleGeolocate = () => {
    if (isReadOnly) return;
    setGeoError(null);

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
      return;
    }

    setIsGeolocating(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setFormData(prev => ({
          ...prev,
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        }));
        setIsGeolocating(false);
      },
      (error) => {
        setIsGeolocating(false);
        switch (error.code) {
          case error.PERMISSION_DENIED:
            setGeoError("Location permission denied by user.");
            break;
          case error.POSITION_UNAVAILABLE:
            setGeoError("Location information is unavailable.");
            break;
          case error.TIMEOUT:
            setGeoError("Location request timed out.");
            break;
          default:
            setGeoError("An unknown error occurred while fetching location.");
            break;
        }
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
    );
  };

  // Form input states for adding a new observation
  const [newObsText, setNewObsText] = useState("");
  const [newObsSeverity, setNewObsSeverity] = useState<"critical" | "major" | "other">("major");
  const [newObsSystem, setNewObsSystem] = useState<QualitySystemKey>("pqs");
  const [newObsRootCause, setNewObsRootCause] = useState<RootCauseCategory | "">("");

  const toggleActivity = (activity: string) => {
    if (isReadOnly) return;
    setFormData(prev => {
      const current = prev.activities_carried_out;
      return {
        ...prev,
        activities_carried_out: current.includes(activity) 
          ? current.filter(a => a !== activity) 
          : [...current, activity]
      };
    });
  };

  const addObservation = () => {
    if (!newObsText.trim()) return;

    const uniqueId = crypto.randomUUID();
    const newObs: Observation = { 
      id: uniqueId, 
      severity: newObsSeverity, 
      system_category: newObsSystem,
      text: newObsText.trim(),
      root_cause_category: newObsRootCause
    };
    
    setFormData(prev => ({
      ...prev,
      observations: [...prev.observations, newObs],
      critical_count: newObsSeverity === "critical" ? prev.critical_count + 1 : prev.critical_count,
      major_count: newObsSeverity === "major" ? prev.major_count + 1 : prev.major_count,
      other_count: newObsSeverity === "other" ? prev.other_count + 1 : prev.other_count,
    }));

    setNewObsText("");
    setNewObsRootCause("");
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

  const qualitySystemsConfigs: QualitySystemConfig[] = [
    { key: "pqs", label: "System 1: Pharmaceutical Quality System (PQS)", scoreKey: "pqs_score", notesKey: "pqs_notes", placeholder: "Sighted Site Master File Ref..." },
    { key: "personnel", label: "System 2: Personnel & Training Protocols", scoreKey: "personnel_score", notesKey: "personnel_notes", placeholder: "Key staff qualifications..." },
    { key: "premises_equipment", label: "System 3: Premises and Process Equipment", scoreKey: "premises_equipment_score", notesKey: "premises_equipment_notes", placeholder: "Zoning & layout check..." },
    { key: "qualification_validation", label: "System 4: Qualification and Validation", scoreKey: "qualification_validation_score", notesKey: "qualification_validation_notes", placeholder: "Validation Master Plan status..." },
    { key: "material_management", label: "System 5: Material Management & Storage", scoreKey: "material_management_score", notesKey: "material_management_notes", placeholder: "Vendor audits checklist..." },
    { key: "laboratory_control", label: "System 6: Laboratory Control (QC Operations)", scoreKey: "laboratory_control_score", notesKey: "laboratory_control_notes", placeholder: "Operations independence..." },
  ];

return (
  <div className="bg-slate-900 border border-slate-700/60 rounded-xl p-6 shadow-2xl space-y-6">
    {/* Header Tabs Navigation */}
    <div className="flex border-b border-slate-700">
      <button
        type="button"
        onClick={() => setActiveTab(1)}
        className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
          activeTab === 1
            ? "border-blue-500 text-blue-400 bg-blue-950/20"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        1. Site Identification & Baseline
      </button>
      <button
        type="button"
        onClick={() => setActiveTab(2)}
        className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
          activeTab === 2
            ? "border-blue-500 text-blue-400 bg-blue-950/20"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        2. The 6 Quality Systems
      </button>
      <button
        type="button"
        onClick={() => setActiveTab(3)}
        className={`py-2 px-4 text-xs font-semibold uppercase tracking-wider transition border-b-2 ${
          activeTab === 3
            ? "border-blue-500 text-blue-400 bg-blue-950/20"
            : "border-transparent text-slate-400 hover:text-slate-200"
        }`}
      >
        3. Synthesis & Recommendations
      </button>
    </div>

    {/* Tab 1: Site Meta, Geolocation & History Baseline */}
    {activeTab === 1 && (
      <div className="space-y-6 animate-fadeIn">
        <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            1.1 Primary Audit Metadata
          </h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Report Doc Number</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={formData.report_doc_number}
                onChange={e => setFormData(prev => ({ ...prev, report_doc_number: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium font-bold text-slate-300">
                Inspected Site Name
              </label>
              <input
                type="text"
                disabled={isReadOnly}
                value={formData.inspected_site_name}
                onChange={e => setFormData(prev => ({ ...prev, inspected_site_name: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Inspection Dates</label>
              <input
                type="text"
                disabled={isReadOnly}
                placeholder="e.g. Oct 12 - Oct 14, 2026"
                value={formData.inspection_dates}
                onChange={e => setFormData(prev => ({ ...prev, inspection_dates: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>

          {/* Geolocation Section */}
          <div className="pt-2 border-t border-slate-700/50">
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-300">
                Site GPS Coordinates (Latitude & Longitude)
              </label>
              {!isReadOnly && (
                <button
                  type="button"
                  onClick={handleGeolocate}
                  disabled={isGeolocating}
                  className="flex items-center gap-1.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 text-[11px] font-medium px-2.5 py-1 rounded transition disabled:opacity-50"
                >
                  {isGeolocating ? <Spinner /> : "📍 Fetch GPS Location"}
                </button>
              )}
            </div>

            {geoError && (
              <p className="text-[11px] text-rose-400 mb-2 font-mono">⚠️ {geoError}</p>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Latitude</label>
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={formData.latitude ?? ""}
                  onChange={e => setFormData(prev => ({ ...prev, latitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="e.g. 8.950700"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Longitude</label>
                <input
                  type="number"
                  step="any"
                  disabled={isReadOnly}
                  value={formData.longitude ?? ""}
                  onChange={e => setFormData(prev => ({ ...prev, longitude: e.target.value ? parseFloat(e.target.value) : null }))}
                  placeholder="e.g. 7.076800"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Lead Inspector</label>
              <input
                type="text"
                disabled={isReadOnly}
                value={formData.lead_inspector}
                onChange={e => setFormData(prev => ({ ...prev, lead_inspector: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Co-Inspectors</label>
              <input
                type="text"
                disabled={isReadOnly}
                placeholder="e.g. Jane Doe, John Smith"
                value={formData.co_inspectors}
                onChange={e => setFormData(prev => ({ ...prev, co_inspectors: e.target.value }))}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
              />
            </div>
          </div>
        </div>

        <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-4">
          <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
            1.2 Scope & Historical Baseline
          </h3>
          
          <div>
            <label className="block text-xs text-slate-400 mb-2 font-medium">Activities Evaluated</label>
            <div className="flex flex-wrap gap-2">
              {["Active Ingredient", "Finished Product", "Intermediate or bulk", "Packaging", "Importing", "Laboratory Testing", "Batch Control", "Batch release"].map(act => {
                const active = formData.activities_carried_out.includes(act);
                return (
                  <label
                    key={act}
                    className={`flex items-center gap-2 text-xs px-3 py-1.5 rounded-md border font-medium transition cursor-pointer select-none ${
                      active 
                        ? "bg-blue-600/30 border-blue-500 text-blue-300"
                        : "bg-slate-900 border-slate-700 text-slate-400 hover:border-slate-500"
                    } ${isReadOnly ? "cursor-not-allowed opacity-60" : ""}`}
                  >
                    <input
                      type="checkbox"
                      checked={active}
                      disabled={isReadOnly}
                      onChange={() => toggleActivity(act)}
                      className="rounded border-slate-700 bg-slate-800 text-blue-500 focus:ring-blue-500 focus:ring-offset-slate-900 cursor-pointer disabled:cursor-not-allowed"
                    />
                    <span>{act}</span>
                  </label>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1 font-medium">Vicinity & Surrounding Environment Assessment</label>
            <textarea
              rows={2}
              disabled={isReadOnly}
              value={formData.vicinity_assessment}
              onChange={e => setFormData(prev => ({ ...prev, vicinity_assessment: e.target.value }))}
              placeholder="Details regarding adjacent facilities, potential environmental risks..."
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        </div>
      </div>
    )}

    {/* Tab 2: The 6 Quality Systems */}
    {activeTab === 2 && (
      <div className="space-y-4 animate-fadeIn">
        {qualitySystemsConfigs.map(sys => (
          <div key={sys.key} className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-200">{sys.label}</h4>
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-400">Compliance Score:</span>
                <input
                  type="number"
                  min={0}
                  max={100}
                  disabled={isReadOnly}
                  value={formData[sys.scoreKey] as number}
                  onChange={e => setFormData(prev => ({ ...prev, [sys.scoreKey]: Number(e.target.value) }))}
                  className="w-16 bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-right text-blue-400 font-bold focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
                <span className="text-xs text-slate-500">%</span>
              </div>
            </div>
            <textarea
              rows={2}
              disabled={isReadOnly}
              placeholder={sys.placeholder}
              value={formData[sys.notesKey] as string}
              onChange={e => setFormData(prev => ({ ...prev, [sys.notesKey]: e.target.value }))}
              className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500 disabled:opacity-50"
            />
          </div>
        ))}
      </div>
    )}

    {/* Tab 3: Synthesis, Observations & Submit */}
    {activeTab === 3 && (
      <div className="space-y-6 animate-fadeIn">
        {/* Add Observation Form */}
        {!isReadOnly && (
          <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-3">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
              Log New Audit Deficit / Observation
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Severity</label>
                <select
                  value={newObsSeverity}
                  onChange={e => setNewObsSeverity(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="critical">Critical</option>
                  <option value="major">Major</option>
                  <option value="other">Other / Minor</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Quality Domain</label>
                <select
                  value={newObsSystem}
                  onChange={e => setNewObsSystem(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="pqs">PQS</option>
                  <option value="personnel">Personnel</option>
                  <option value="premises_equipment">Premises & Equipment</option>
                  <option value="qualification_validation">Qualification & Validation</option>
                  <option value="material_management">Material Management</option>
                  <option value="laboratory_control">Laboratory Control</option>
                </select>
              </div>

              <div>
                <label className="block text-[11px] text-slate-400 mb-1">Root Cause Category</label>
                <select
                  value={newObsRootCause}
                  onChange={e => setNewObsRootCause(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">Unassigned</option>
                  <option value="SOP_Deficit">SOP Deficit</option>
                  <option value="Training_Failure">Training Failure</option>
                  <option value="Equipment_Breakdown">Equipment Breakdown</option>
                  <option value="Design_Flaw">Design Flaw</option>
                  <option value="Human_Error">Human Error</option>
                  <option value="Vendor_Issue">Vendor Issue</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-[11px] text-slate-400 mb-1">Deficit Description</label>
              <textarea
                rows={2}
                value={newObsText}
                onChange={e => setNewObsText(e.target.value)}
                placeholder="Record clear objective evidence of non-compliance..."
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={addObservation}
                className="bg-blue-600 hover:bg-blue-500 text-white text-xs px-3 py-1.5 rounded transition font-medium"
              >
                + Append Observation
              </button>
            </div>
          </div>
        )}

        {/* Logged Observations Table */}
        <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-3">
          <h3 className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
            Recorded Audit Findings ({formData.observations.length})
          </h3>

          {formData.observations.length === 0 ? (
            <p className="text-xs text-slate-500 italic py-2">No findings or observations logged.</p>
          ) : (
            <div className="space-y-2">
              {formData.observations.map((obs) => (
                <div key={obs.id} className="bg-slate-900 border border-slate-800 p-3 rounded-md flex justify-between items-start gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded border ${
                        obs.severity === "critical" 
                          ? "bg-rose-950/60 border-rose-500/40 text-rose-400"
                          : obs.severity === "major"
                          ? "bg-amber-950/60 border-amber-500/40 text-amber-400"
                          : "bg-slate-800 border-slate-700 text-slate-300"
                      }`}>
                        {obs.severity}
                      </span>
                      <span className="text-[11px] font-mono text-slate-400">{obs.system_category}</span>
                      {obs.root_cause_category && (
                        <span className="text-[10px] text-blue-400 bg-blue-950/40 border border-blue-500/20 px-1.5 py-0.5 rounded">
                          {obs.root_cause_category}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-200">{obs.text}</p>
                  </div>

                  {!isReadOnly && (
                    <button
                      type="button"
                      onClick={() => removeObservation(obs.id, obs.severity)}
                      className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* FINAL ADJUDICATION DROPDOWN */}
        <div className="bg-slate-800/40 border border-slate-700/60 p-4 rounded-lg space-y-2">
          <label className="block font-bold text-xs text-slate-200 uppercase tracking-wider">
            Final Recommendation / Adjudication
          </label>
          <select
            disabled={isReadOnly}
            value={formData.final_recommendation || "PENDING"}
            onChange={e => setFormData(prev => ({ ...prev, final_recommendation: e.target.value }))}
            className="w-full bg-slate-900 border border-slate-700 rounded-md p-2.5 text-xs text-slate-200 font-semibold focus:outline-none focus:border-blue-500 disabled:opacity-50"
          >
            <option value="PENDING">Select / Awaiting Divisional Deputy Director Evaluation</option>
            <option value="APPROVED">Recommended for Approval / Issuance of Marketing Authorization</option>
            <option value="CAPA_PENDING">Compliance pending CAPA verification (Follow-up required)</option>
            <option value="REJECTED">Recommended for Rejection / Hold</option>
          </select>
        </div>
      </div>
    )}

    {/* Global Form Actions */}
    {!isReadOnly && (
      <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-700">
        {onSaveDraft && (
          <button
            type="button"
            onClick={handleDraftSubmit}
            disabled={isSavingDraft || isCompiling}
            className="bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-600 text-xs font-medium py-2.5 px-4 rounded-md transition flex items-center gap-2 disabled:opacity-50"
          >
            {isSavingDraft ? <Spinner /> : null}
            {isSavingDraft ? "Saving Draft..." : "Save Draft"}
          </button>
        )}

        <button
          type="button"
          onClick={handleFinalSubmit}
          disabled={isCompiling || isSavingDraft}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase tracking-wider py-2.5 px-5 rounded-md transition flex items-center gap-2 shadow-lg disabled:opacity-50"
        >
          {isCompiling ? <Spinner /> : null}
          {isCompiling ? "Generating..." : "AI Generate Report Framework"}
        </button>
      </div>
    )}
  </div>
);
};