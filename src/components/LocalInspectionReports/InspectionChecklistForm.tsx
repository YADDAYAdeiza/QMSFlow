// @/components/LocalInspectionReports/InspectionChecklistForm.tsx
"use client";

import { useState } from "react";

interface Observation {
  id: string;
  severity: "critical" | "major" | "other";
  text: string;
}

interface ChecklistData {
  premises_score: number;
  equipment_score: number;
  sanitation_score: number;
  quality_systems_score: number;
  observations: Observation[];
}

interface ChecklistFormProps {
  initialData?: Partial<ChecklistData>;
  onSave: (data: ChecklistData) => void;
  isReadOnly?: boolean;
}

export default function InspectionChecklistForm({ 
  initialData, 
  onSave, 
  isReadOnly = false 
}: ChecklistFormProps) {
  // Core Telemetry State
  const [premisesScore, setPremisesScore] = useState(initialData?.premises_score ?? 100);
  const [equipmentScore, setEquipmentScore] = useState(initialData?.equipment_score ?? 100);
  const [sanitationScore, setSanitationScore] = useState(initialData?.sanitation_score ?? 100);
  const [qualityScore, setQualityScore] = useState(initialData?.quality_systems_score ?? 100);

  // Dynamic Observations State
  const [observations, setObservations] = useState<Observation[]>(initialData?.observations ?? []);
  const [newObsText, setNewObsText] = useState("");
  const [newObsSeverity, setNewObsSeverity] = useState<"critical" | "major" | "other">("major");

  const addObservation = () => {
    if (!newObsText.trim()) return;
    const newObs: Observation = {
      id: crypto.randomUUID(),
      severity: newObsSeverity,
      text: newObsText.trim()
    };
    setObservations([...observations, newObs]);
    setNewObsText("");
  };

  const removeObservation = (id: string) => {
    setObservations(observations.filter(obs => obs.id !== id));
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      premises_score: Number(premisesScore),
      equipment_score: Number(equipmentScore),
      sanitation_score: Number(sanitationScore),
      quality_systems_score: Number(qualityScore),
      observations
    });
  };

  return (
    <form onSubmit={handleFormSubmit} className="space-y-6 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
      <div className="border-b border-slate-100 pb-3">
        <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider">📋 Technical Checklist & Telemetry Entry</h3>
        <p className="text-xs text-slate-500 mt-0.5">Record quantitative audit grades and qualitative findings observed on-site.</p>
      </div>

      {/* CORE QUALITY SYSTEM SCORES */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Premises & Facility Layout (%)</label>
          <input 
            type="number" min="0" max="100" 
            disabled={isReadOnly}
            value={premisesScore} 
            onChange={(e) => setPremisesScore(Math.min(100, Number(e.target.value)))}
            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 disabled:bg-slate-100 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Equipment & Calibration (%)</label>
          <input 
            type="number" min="0" max="100" 
            disabled={isReadOnly}
            value={equipmentScore} 
            onChange={(e) => setEquipmentScore(Math.min(100, Number(e.target.value)))}
            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 disabled:bg-slate-100 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Sanitation & Hygiene (%)</label>
          <input 
            type="number" min="0" max="100" 
            disabled={isReadOnly}
            value={sanitationScore} 
            onChange={(e) => setSanitationScore(Math.min(100, Number(e.target.value)))}
            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 disabled:bg-slate-100 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Quality Management Systems (%)</label>
          <input 
            type="number" min="0" max="100" 
            disabled={isReadOnly}
            value={qualityScore} 
            onChange={(e) => setQualityScore(Math.min(100, Number(e.target.value)))}
            className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-slate-50 disabled:bg-slate-100 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500" 
          />
        </div>
      </div>

      <hr className="border-slate-100" />

      {/* DYNAMIC DEFICIENCY REGISTER */}
      <div>
        <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">🔎 Deficiency & Non-Conformance Register</h4>
        
        {/* ADD DEFICIENCY INPUT FIELDS */}
        {!isReadOnly && (
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 mb-4 space-y-3">
            <div className="flex gap-2">
              <div className="w-1/3">
                <select
                  value={newObsSeverity}
                  onChange={(e) => setNewObsSeverity(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none"
                >
                  <option value="other">Other/Minor</option>
                  <option value="major">Major Deficiency</option>
                  <option value="critical">Critical Deficiency</option>
                </select>
              </div>
              <div className="w-2/3">
                <input 
                  type="text"
                  placeholder="Describe the specific non-conformance observation..."
                  value={newObsText}
                  onChange={(e) => setNewObsText(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none"
                />
              </div>
            </div>
            <button 
              type="button"
              onClick={addObservation}
              className="w-full px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs rounded-md shadow-sm transition-all"
            >
              ＋ Log Deficiency Line Item
            </button>
          </div>
        )}

        {/* DEFICIENCY ITEMS LISTING */}
        <div className="space-y-2">
          {observations.length === 0 ? (
            <p className="text-xs text-slate-400 italic text-center py-2 bg-slate-50 rounded-lg border border-dashed border-slate-200">No deficiencies logged. Facility currently compliant with baseline parameters.</p>
          ) : (
            observations.map((obs) => (
              <div key={obs.id} className="flex justify-between items-start gap-4 p-2.5 rounded-lg border border-slate-200 bg-white shadow-sm text-xs">
                <div className="flex gap-2 items-start">
                  <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide text-white mt-0.5 ${
                    obs.severity === "critical" ? "bg-rose-600 animate-pulse" : 
                    obs.severity === "major" ? "bg-amber-500" : "bg-blue-500"
                  }`}>
                    {obs.severity}
                  </span>
                  <p className="text-slate-700 font-medium">{obs.text}</p>
                </div>
                {!isReadOnly && (
                  <button 
                    type="button" 
                    onClick={() => removeObservation(obs.id)}
                    className="text-slate-400 hover:text-rose-600 font-bold px-1"
                  >
                    ✕
                  </button>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* SAVE TRIGGERS */}
      {!isReadOnly && (
        <div className="pt-2 border-t border-slate-100 flex justify-end">
          <button 
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-lg shadow-sm transition-all"
          >
            💾 Cache Checklist Progress
          </button>
        </div>
      )}
    </form>
  );
}