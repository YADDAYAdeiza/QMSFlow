"use client";

import React, { useState, useEffect, Suspense } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { 
  Building2, 
  ShieldAlert, 
  Clock, 
  Save, 
  ArrowLeft, 
  CheckCircle2, 
  AlertCircle,
  Layers,
  Award,
  Calendar,
  UserCheck,
  Loader2
} from "lucide-react";
import { createClient } from "@/utils/supabase/client";
import { facilityCategorizationWorkflow } from "@/config/workflows/facilityCategorizationWorkflow";

// --- Schema Types ---
interface ProductLocal {
  id: string;
  line_id: string;
  name: string;
  classification: string;
  target_species: string;
  vmd_approved: boolean;
}

interface ProductLineLocal {
  id: string;
  facility_id: string;
  name: string;
  sterility_level: string;
  containment_category: string;
  is_dedicated_line: boolean;
  products: ProductLocal[];
}

interface FacilityData {
  id: string;
  name: string;
  facility_type: string;
  address: string;
  is_categorized: boolean;
  product_lines: ProductLineLocal[];
}

type IntrinsicLevel = "Low" | "Medium" | "High";
type ComplianceLevel = "Low" | "Medium" | "High";
type RiskRating = "A" | "B" | "C";

function CategorizationContent() {
  const supabase = createClient();
  const router = useRouter();
  const searchParams = useSearchParams();

  const facilityIdParam = searchParams.get("facilityId") || searchParams.get("applicationId") || "fac-1029384";
  const stepParam = searchParams.get("step") || "UNDER_CATEGORIZATION";

  // QMS Timer Tracking
  const [timerSeconds, setTimerSeconds] = useState<number>(0);
  const [isTimerRunning, setIsTimerRunning] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [facility, setFacility] = useState<FacilityData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // PIC/S Part B: Intrinsic Risk Inputs
  const [complexityScore, setComplexityScore] = useState<1 | 2 | 3>(3);
  const [criticalityScore, setCriticalityScore] = useState<1 | 2 | 3>(2);

  // PIC/S Part C: Compliance Risk Inputs (With Others Slot)
  const [criticalDeficiencies, setCriticalDeficiencies] = useState<number>(0);
  const [majorDeficiencies, setMajorDeficiencies] = useState<number>(0);
  const [otherDeficiencies, setOtherDeficiencies] = useState<number>(0);

  // PIC/S Part F: Recommended Scope
  const [inspectionScopeNotes, setInspectionScopeNotes] = useState<string>(
    "Focus on HVAC validation and aseptic line sterile hold tests."
  );
  const [recommendedInspectors, setRecommendedInspectors] = useState<number>(3);
  const [recommendedDurationDays, setRecommendedDurationDays] = useState<number>(4);

  // Reviewing Official Title
  const [reviewerTitle] = useState<string>("Divisional Deputy Director");

  // QMS Timer Interval
  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isTimerRunning) {
      interval = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isTimerRunning]);

  // Single Data Fetching Effect (Including Facility-Specific Historical Analytics)
  useEffect(() => {
    async function fetchFacilityData() {
      if (!facilityIdParam) return;
      setIsLoading(true);

      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(facilityIdParam);
      const isNumeric = /^\d+$/.test(facilityIdParam);

      try {
        let resolvedFacilityId: string | null = null;

        if (isUUID) {
          resolvedFacilityId = facilityIdParam;
        } else if (isNumeric) {
          const numericId = parseInt(facilityIdParam, 10);

          const { data: appData, error: appError } = await supabase
            .from("applications")
            .select("facility_id")
            .eq("id", numericId)
            .maybeSingle();

          if (appError) {
            console.error("Application Lookup Error:", appError.message);
          }

          if (appData?.facility_id) {
            resolvedFacilityId = appData.facility_id;
          } else {
            const { data: compFacility, error: compError } = await supabase
              .from("facilities")
              .select("id")
              .eq("application_id", numericId)
              .maybeSingle();

            if (compError) {
              console.error("Facility Application Search Error:", compError.message);
            }

            if (compFacility?.id) {
              resolvedFacilityId = compFacility.id;
            }
          }
        }

        if (!resolvedFacilityId) {
          console.warn(`[QMS Warning] Could not resolve a valid Facility UUID for parameter: "${facilityIdParam}"`);
          setIsLoading(false);
          return;
        }

        const isValidResolvedUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(resolvedFacilityId);

        if (!isValidResolvedUUID) {
          console.error(`Invalid resolved UUID format: "${resolvedFacilityId}"`);
          setIsLoading(false);
          return;
        }

        // Fetch facility record using verified UUID
        const { data: facilityData, error: facilityError } = await supabase
          .from("facilities")
          .select("id, name, facility_type, address, is_categorized")
          .eq("id", resolvedFacilityId)
          .maybeSingle();

        if (facilityError || !facilityData) {
          console.error("Facility Query Error:", facilityError);
          setIsLoading(false);
          return;
        }

        // Fetch historical risk assessment / compliance record for auto-population
        const { data: historicalRisk } = await supabase
          .from("risk_assessments")
          .select("critical_deficiencies, major_deficiencies, other_deficiencies")
          .eq("facility_id", facilityData.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (historicalRisk) {
          setCriticalDeficiencies(historicalRisk.critical_deficiencies ?? 0);
          setMajorDeficiencies(historicalRisk.major_deficiencies ?? 0);
          setOtherDeficiencies(historicalRisk.other_deficiencies ?? 0);
        }

        // Fetch facility-specific historical analytical observations
        const { data: pastObservations } = await supabase
          .from("inspection_observations_analytics")
          .select("quality_system, severity, observation_text")
          .eq("facility_id", facilityData.id);

        if (pastObservations && pastObservations.length > 0) {
          const systemCounts: Record<string, number> = {};
          pastObservations.forEach(obs => {
            if (obs.severity === "Critical" || obs.severity === "Major") {
              systemCounts[obs.quality_system] = (systemCounts[obs.quality_system] || 0) + 1;
            }
          });

          const topSystem = Object.entries(systemCounts).sort((a, b) => b[1] - a[1])[0];
          
          if (topSystem) {
            setInspectionScopeNotes(
              `Automated Scope Recommendation: Historical trends indicate recurrent deficiencies in "${topSystem[0]}". Prioritize deep-dive verification during next audit cycle.`
            );
          } else {
            setInspectionScopeNotes(
              "Initial Assessment Scope: Standard comprehensive cGMP review and facility infrastructure validation."
            );
          }
        } else {
          // Built-in Fallback for Brand New Facilities
          setInspectionScopeNotes(
            "Baseline Inspection Scope: First-time facility verification. Focus on general quality systems, HVAC validation, and production line compliance."
          );
        }

        // Fetch child product lines
        const { data: linesData, error: linesError } = await supabase
          .from("product_lines_local")
          .select(`
            id,
            facility_id,
            name,
            sterility_level,
            containment_category,
            is_dedicated_line,
            products_local (
              id,
              line_id,
              name,
              classification,
              target_species,
              vmd_approved
            )
          `)
          .eq("facility_id", facilityData.id);

        if (linesError) {
          console.error("Product Lines Query Error:", linesError);
        }

        const formattedFacility: FacilityData = {
          id: facilityData.id,
          name: facilityData.name,
          facility_type: facilityData.facility_type,
          address: facilityData.address,
          is_categorized: facilityData.is_categorized ?? false,
          product_lines: (linesData ?? []).map((line: any) => ({
            id: line.id,
            facility_id: line.facility_id,
            name: line.name,
            sterility_level: line.sterility_level,
            containment_category: line.containment_category,
            is_dedicated_line: line.is_dedicated_line,
            products: line.products_local ?? [],
          })),
        };

        setFacility(formattedFacility);
      } catch (err: any) {
        console.error("Unexpected fetch exception:", err?.message || err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchFacilityData();
  }, [facilityIdParam, supabase]);

  // --- PIC/S Matrix Logic ---
  const getIntrinsicRisk = (comp: number, crit: number): IntrinsicLevel => {
    const score = comp * crit;
    if (score >= 6) return "High";
    if (score >= 3) return "Medium";
    return "Low";
  };

  const intrinsicRisk = getIntrinsicRisk(complexityScore, criticalityScore);

  const getComplianceRisk = (criticals: number, majors: number, others: number): ComplianceLevel => {
    const adjustedMajors = majors + Math.floor(others / 5);
    if (criticals >= 1 || adjustedMajors > 5) return "High";
    if (adjustedMajors >= 1 && adjustedMajors <= 5) return "Medium";
    return "Low";
  };

  const complianceRisk = getComplianceRisk(criticalDeficiencies, majorDeficiencies, otherDeficiencies);

  const getOverallRiskRating = (intrinsic: IntrinsicLevel, compliance: ComplianceLevel): RiskRating => {
    if (intrinsic === "High" && compliance === "High") return "C";
    if (intrinsic === "High" || compliance === "High") return "C";
    if (intrinsic === "Medium" && compliance === "Medium") return "B";
    if (intrinsic === "Low" && compliance === "High") return "B";
    if (intrinsic === "High" && compliance === "Low") return "B";
    return "A";
  };

  const overallRiskRating = getOverallRiskRating(intrinsicRisk, complianceRisk);

  const getInspectionFrequency = (rating: RiskRating): string => {
    switch (rating) {
      case "C": return "Increased Frequency (< 12 months)";
      case "B": return "Moderate Frequency (12 to 24 months)";
      case "A": return "Reduced Frequency (24 to 36 months)";
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  const calculateNextInspectionDate = (rating: RiskRating): string => {
    const date = new Date();
    if (rating === "C") date.setMonth(date.getMonth() + 12);
    else if (rating === "B") date.setMonth(date.getMonth() + 18);
    else date.setMonth(date.getMonth() + 36);
    return date.toISOString();
  };

  const handleSaveCategorization = async () => {
    if (!facility) return;
    setIsSaving(true);
    setIsTimerRunning(false);

    const targetDate = calculateNextInspectionDate(overallRiskRating);
    const numericAppId = /^\d+$/.test(facilityIdParam) ? parseInt(facilityIdParam, 10) : null;

    try {
      // 🚀 Dispatch everything through your secure server API route
      const response = await fetch("/api/LocalInspectionReports/inspectors/categorization", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          facilityId: facility.id,
          applicationId: numericAppId,
          complexityScore,
          criticalityScore,
          intrinsicLevel: intrinsicRisk,
          criticalDeficiencies,
          majorDeficiencies,
          otherDeficiencies,
          complianceLevel: complianceRisk,
          overallRiskRating,
          nextInspectionDate: targetDate,
          timerSeconds,
          reviewerTitle,
        }),
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || "Failed to save categorization.");
      }

      setSaveSuccess(true);

      setTimeout(() => {
        router.push("/LocalInspectionReports/Inspectors/Inbox?tab=unassigned");
      }, 1200);

    } catch (err: any) {
      console.error("Save error:", err?.message || err);
      alert(err.message || "An error occurred while saving.");
      setIsTimerRunning(true); // Resume timer if save fails
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6 font-sans text-slate-600">
        <div className="flex items-center space-x-3 bg-white px-6 py-4 rounded-xl shadow-sm border border-slate-200">
          <Loader2 className="w-5 h-5 animate-spin text-blue-600" />
          <span className="text-sm font-medium">Fetching facility categorization record...</span>
        </div>
      </div>
    );
  }

  if (!facility) {
    return (
      <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900 flex items-center justify-center">
        <div className="max-w-md w-full bg-white p-6 rounded-xl border border-slate-200 shadow-sm text-center space-y-4">
          <AlertCircle className="w-10 h-10 text-amber-500 mx-auto" />
          <h2 className="text-lg font-bold text-slate-800">Facility Record Not Found</h2>
          <p className="text-xs text-slate-500">
            Could not locate a facility record matching ID: <code className="font-mono text-slate-700">{facilityIdParam}</code>.
          </p>
          <Link
            href="/LocalInspectionReports/Inspectors/Inbox"
            className="inline-flex items-center text-sm font-semibold text-blue-600 hover:text-blue-700"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Return to Inbox
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 font-sans text-slate-900">
      <div className="max-w-6xl mx-auto space-y-6">
        
        <div className="flex items-center justify-between">
          <Link
            href="/LocalInspectionReports/Inspectors/Inbox"
            className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Inbox
          </Link>

          <div className="flex items-center space-x-3 bg-white px-4 py-2 rounded-lg border border-slate-200 shadow-sm">
            <Clock className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">QMS Review Time:</span>
            <span className="font-mono font-bold text-slate-800">{formatTime(timerSeconds)}</span>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-3">
              <Building2 className="w-6 h-6 text-blue-600" />
              <h1 className="text-2xl font-bold text-slate-900">{facility.name}</h1>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              {facility.address} • {facility.facility_type}
            </p>
            <div className="mt-2 inline-flex items-center gap-2 text-xs text-slate-500 font-mono bg-slate-100 px-2 py-1 rounded">
              <span>ID: {facility.id}</span>
              <span>•</span>
              <span>Step: {stepParam}</span>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            <div className={`px-5 py-3 rounded-xl border flex items-center space-x-3 ${
              overallRiskRating === "C"
                ? "bg-amber-50 border-amber-300 text-amber-900"
                : overallRiskRating === "B"
                ? "bg-blue-50 border-blue-300 text-blue-900"
                : "bg-emerald-50 border-emerald-300 text-emerald-900"
            }`}>
              <ShieldAlert className="w-7 h-7 flex-shrink-0" />
              <div>
                <div className="text-xs uppercase font-bold tracking-wider opacity-80">PIC/S Risk Rating</div>
                <div className="text-xl font-black">Rating {overallRiskRating}</div>
              </div>
            </div>
          </div>
        </div>

        {saveSuccess && (
          <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-emerald-900">
            <div className="flex items-center space-x-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 animate-bounce" />
              <span className="font-medium text-sm">Facility categorization saved! Redirecting to Inbox...</span>
            </div>
            <Link href="/LocalInspectionReports/Inspectors/Inbox" className="text-xs font-bold underline hover:text-emerald-700">
              Return to Inbox
            </Link>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-blue-600" />
            Registered Product Lines
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {facility.product_lines?.map((line) => (
              <div key={line.id} className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                <div className="flex justify-between items-start">
                  <h3 className="font-bold text-sm text-slate-800">{line.name}</h3>
                  <span className={`text-[10px] px-2 py-0.5 font-bold rounded ${
                    line.sterility_level === "Sterile" ? "bg-purple-100 text-purple-800" : "bg-slate-200 text-slate-700"
                  }`}>
                    {line.sterility_level}
                  </span>
                </div>
                <div className="text-xs text-slate-600 space-y-1">
                  <div><strong>Containment:</strong> {line.containment_category}</div>
                  <div><strong>Dedicated Line:</strong> {line.is_dedicated_line ? "Yes" : "No"}</div>
                </div>
                <div className="pt-2 border-t border-slate-200">
                  <div className="text-[11px] font-semibold text-slate-500 uppercase">Products Manufactured:</div>
                  <ul className="mt-1 space-y-1">
                    {(line.products ?? []).map((p) => (
                      <li key={p.id} className="text-xs text-slate-700 flex justify-between">
                        <span>{p.name} ({p.target_species})</span>
                        {p.vmd_approved && <span className="text-emerald-600 font-medium">VMD Approved</span>}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          
          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <Award className="w-5 h-5 text-blue-600" />
              PIC/S Part B: Intrinsic Risk Score
            </h2>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Process & Product Complexity (1 to 3)
              </label>
              <select
                value={complexityScore}
                onChange={(e) => setComplexityScore(Number(e.target.value) as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 - Low (Non-sterile, standard formulation)</option>
                <option value={2}>2 - Moderate (Multi-product, dedicated lines)</option>
                <option value={3}>3 - High (Sterile/Aseptic, High Containment, Biologicals)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                Supply Criticality (1 to 3)
              </label>
              <select
                value={criticalityScore}
                onChange={(e) => setCriticalityScore(Number(e.target.value) as any)}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500"
              >
                <option value={1}>1 - Low (Non-essential / Multi-supplier available)</option>
                <option value={2}>2 - Medium (Important veterinary therapeutic)</option>
                <option value={3}>3 - High (Sole supplier / Essential national vaccine)</option>
              </select>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">Calculated Intrinsic Risk:</span>
              <span className="font-bold text-blue-900">{intrinsicRisk} Intrinsic Risk ({complexityScore * criticalityScore}/9)</span>
            </div>
          </div>

          <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
            <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600" />
              PIC/S Part C: Compliance Risk Score
            </h2>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Critical
                </label>
                <input
                  type="number"
                  min="0"
                  value={criticalDeficiencies}
                  onChange={(e) => setCriticalDeficiencies(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Major
                </label>
                <input
                  type="number"
                  min="0"
                  value={majorDeficiencies}
                  onChange={(e) => setMajorDeficiencies(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">
                  Other <span className="text-[9px] text-slate-400 lowercase">(5=1 Maj)</span>
                </label>
                <input
                  type="number"
                  min="0"
                  value={otherDeficiencies}
                  onChange={(e) => setOtherDeficiencies(Number(e.target.value))}
                  className="w-full rounded-lg border border-slate-300 p-2 text-sm focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex justify-between items-center text-sm">
              <span className="text-slate-600 font-medium">Calculated Compliance Risk:</span>
              <span className="font-bold text-amber-900">{complianceRisk} Compliance Risk</span>
            </div>
          </div>

        </div>

        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h2 className="text-base font-semibold text-slate-900 flex items-center gap-2">
            <Calendar className="w-5 h-5 text-blue-600" />
            PIC/S Part E & F: Recommended Frequency & Scope of Next Inspection
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="text-xs font-bold uppercase text-blue-800">Recommended Frequency</div>
              <div className="text-sm font-extrabold text-blue-950 mt-1">{getInspectionFrequency(overallRiskRating)}</div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Team Size (Inspectors)</label>
              <input
                type="number"
                value={recommendedInspectors}
                onChange={(e) => setRecommendedInspectors(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Duration (Days)</label>
              <input
                type="number"
                value={recommendedDurationDays}
                onChange={(e) => setRecommendedDurationDays(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-300 p-2 text-sm"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Recommended Focus & Depth</label>
            <textarea
              rows={3}
              value={inspectionScopeNotes}
              onChange={(e) => setInspectionScopeNotes(e.target.value)}
              className="w-full rounded-lg border border-slate-300 p-3 text-sm focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>

        <div className="flex justify-between items-center bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex items-center space-x-2 text-xs text-slate-500">
            <UserCheck className="w-4 h-4 text-slate-400" />
            <span>Sign-off Official: <strong>{reviewerTitle}</strong></span>
          </div>

          <button
            onClick={handleSaveCategorization}
            disabled={isSaving}
            className="py-2.5 px-6 bg-blue-600 hover:bg-blue-700 text-white font-semibold text-sm rounded-lg shadow-sm transition-colors flex items-center space-x-2 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{isSaving ? "Saving..." : "Save PIC/S Facility Categorization"}</span>
          </button>
        </div>

      </div>
    </div>
  );
}

export default function CategorizationPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-slate-500">Loading categorization assessment...</div>}>
      <CategorizationContent />
    </Suspense>
  );
}