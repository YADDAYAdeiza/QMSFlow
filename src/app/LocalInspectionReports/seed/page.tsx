"use client";

import React, { useState } from "react";
import { Combobox } from "@/components/LocalInspectionReports/Combobox";

// --- TYPES & CONSTANTS ---
export type DirectorateCategory = "VMD" | "PAD" | "AFPD" | "IRSD";

export const DIRECTORATE_PRODUCT_MAP: Record<DirectorateCategory, string[]> = {
  VMD: [
    "Veterinary Antibiotic / Antimicrobial",
    "Veterinary Vaccine & Biological",
    "Parasiticide / Anthelmintic",
    "Veterinary NSAID / Analgesic",
    "Vitamins, Minerals & Supplements",
  ],
  AFPD: ["Animal Feed", "Feed Additive & Premix"],
  PAD: ["AgroPesticides & Ectoparasiticides", "Public Health Chemicals / Disinfectants"],
  IRSD: ["Veterinary Medical Devices"],
};

export const PRODUCTION_LINE_TYPES = [
  "Liquid",
  "Solid",
  "Aerosol",
  "Powder",
  "Semi-Solid / Ointment",
  "Injectable / Biological",
] as const;

export interface Product {
  id?: string;
  name: string;
  classification: string;
  targetSpecies?: "Poultry" | "Ruminants" | "Swine" | "Aquaculture" | "Equine" | "Companion" | "Multi-Species";
}

export interface ProductLine {
  lineName: string;
  products: Product[];
}

// --- MAIN COMPONENT ---
export default function ApplicationCreationPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [log, setLog] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Auto-tracked IDs
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | number | null>(null);
  const [selectedFacilityId, setSelectedFacilityId] = useState<string | null>(null);

  // Form States
  const [companyName, setCompanyName] = useState("");
  const [facilityName, setFacilityName] = useState("");
  const [facilityAddress, setFacilityAddress] = useState("");
  const [inspectionType, setInspectionType] = useState<"Pre-Production" | "Pre-Registration" | "Renewal" | "GMP-Reassessment">("Pre-Registration");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [targetDirectorate, setTargetDirectorate] = useState<DirectorateCategory>("VMD");
  const [estimatedInspectionDays, setEstimatedInspectionDays] = useState<number>(3);

  // Geolocation
  const [latitude, setLatitude] = useState<string>("");
  const [longitude, setLongitude] = useState<string>("");

  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  // --- HANDLERS ---
  const handleCompanyChange = async (val: string, option?: any) => {
    setCompanyName(val);
    const compId = option?.id || null;
    setSelectedCompanyId(compId);

    // Reset current facility choices first
    setFacilityName("");
    setSelectedFacilityId(null);
    setFacilityAddress("");
    setLatitude("");
    setLongitude("");

    // Autofill with the first available facility for the selected company
    if (compId) {
      try {
        const res = await fetch(`/api/LocalInspectionReports/Combo/facilities?companyId=${compId}`);
        const data = await res.json();
        
        // Handle array responses (or data wrapper formats)
        const facilitiesList = Array.isArray(data) ? data : data?.data || [];

        if (facilitiesList.length > 0) {
          const firstFacility = facilitiesList[0];
          setFacilityName(firstFacility.name || firstFacility.label || "");
          setSelectedFacilityId(firstFacility.id || null);
          if (firstFacility.address) setFacilityAddress(firstFacility.address);
          if (firstFacility.latitude != null) setLatitude(String(firstFacility.latitude));
          if (firstFacility.longitude != null) setLongitude(String(firstFacility.longitude));
        }
      } catch (err) {
        console.error("Failed to auto-fetch first facility:", err);
      }
    }
  };

  const handleFacilityChange = (val: string, option?: any) => {
    setFacilityName(val);
    if (option) {
      setSelectedFacilityId(option.id || null);
      if (option.address) setFacilityAddress(option.address);
      if (option.latitude != null) setLatitude(String(option.latitude));
      if (option.longitude != null) setLongitude(String(option.longitude));
    } else {
      setSelectedFacilityId(null);
    }
  };

  const handleDirectorateChange = (newDirectorate: DirectorateCategory) => {
    setTargetDirectorate(newDirectorate);
    const defaultClassification = DIRECTORATE_PRODUCT_MAP[newDirectorate][0];

    setProductLines((prevLines) =>
      prevLines.map((line) => ({
        ...line,
        products: line.products.map((prod) => ({
          ...prod,
          classification: defaultClassification,
        })),
      }))
    );
  };

  const addProductLine = () => {
    setProductLines((prev) => [...prev, { lineName: PRODUCTION_LINE_TYPES[0], products: [] }]);
  };

  const removeProductLine = (index: number) => {
    setProductLines((prev) => prev.filter((_, i) => i !== index));
  };

  const updateLineName = (index: number, val: string) => {
    setProductLines((prev) => {
      const updated = [...prev];
      // Update line category and clear existing products for a clean start
      updated[index] = {
        ...updated[index],
        lineName: val,
        products: [], 
      };
      return updated;
    });
  };

  const addProductToLine = (lineIndex: number) => {
    const defaultClassification = DIRECTORATE_PRODUCT_MAP[targetDirectorate][0];
    setProductLines((prev) => {
      const updated = [...prev];
      updated[lineIndex].products.push({
        name: "",
        classification: defaultClassification,
        targetSpecies: "Multi-Species",
      });
      return updated;
    });
  };

  const removeProductFromLine = (lineIndex: number, prodIndex: number) => {
    setProductLines((prev) => {
      const updated = [...prev];
      updated[lineIndex].products.splice(prodIndex, 1);
      return updated;
    });
  };

  const updateProductValue = (
    lineIndex: number,
    prodIndex: number,
    field: keyof Product,
    value: any,
    option?: any
  ) => {
    setProductLines((prev) => {
      const updated = [...prev];
      const currentProd = updated[lineIndex].products[prodIndex];
      updated[lineIndex].products[prodIndex] = {
        ...currentProd,
        [field]: value,
        ...(option?.id ? { id: option.id } : {}),
        ...(option?.classification ? { classification: option.classification } : {}),
      };
      return updated;
    });
  };

  const resetForm = () => {
    setSelectedCompanyId(null);
    setSelectedFacilityId(null);
    setCompanyName("");
    setFacilityName("");
    setFacilityAddress("");
    setNotificationEmail("");
    setTargetDirectorate("VMD");
    setEstimatedInspectionDays(3);
    setLatitude("");
    setLongitude("");
    setProductLines([]);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !facilityAddress || !notificationEmail) {
      setLog({ type: "error", text: "Please populate all foundational company, facility, and contact details." });
      return;
    }

    setLoading(true);
    setLog(null);

    const payload = {
      companyId: selectedCompanyId,
      companyName,
      facilityId: selectedFacilityId,
      facilityName: facilityName || `${companyName} Main Plant`,
      facilityAddress,
      inspectionType,
      notificationEmail,
      targetDirectorate,
      estimatedInspectionDays,
      latitude: latitude ? parseFloat(latitude) : null,
      longitude: longitude ? parseFloat(longitude) : null,
      productLines,
    };

    try {
      const response = await fetch("/api/LocalInspectionReports/seed-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Application submission failed.");

      const appNum = data.data?.applicationNumber || data.applicationNumber;
      setLog({
        type: "success",
        text: `Application #${appNum} created successfully! You can track this ID in your records.`,
      });

      resetForm();
    } catch (err: any) {
      setLog({ type: "error", text: err.message || "Network error encountered." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-4xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-2xl font-bold tracking-tight">📋 NAFDAC Intake & Application Intake</h2>
          <span className="bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[10px] font-mono px-2.5 py-1 rounded">
            Admin Portal
          </span>
        </div>
        <p className="text-slate-400 text-xs mb-6">
          Register new facility applications, assign directorate routing, and establish manufacturing lines.
        </p>

        {log && (
          <div
            className={`p-4 rounded-lg mb-6 text-xs border font-mono ${
              log.type === "success"
                ? "bg-emerald-950/50 border-emerald-500/30 text-emerald-400"
                : "bg-rose-950/50 border-rose-500/30 text-rose-400"
            }`}
          >
            {log.type === "success" ? "✨ Success: " : "❌ Failure: "}
            {log.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Section 1: Corporate & Facility Information */}
            <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg space-y-4">
              <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                1. Company & Facility Site Identification
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">
                    Corporate / Parent Company
                  </label>
                  <Combobox
                    value={companyName}
                    onChange={handleCompanyChange}
                    fetchUrl="/api/LocalInspectionReports/Combo/companies"
                    placeholder="e.g. Wata Pharma Ltd."
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1 font-medium">
                    Facility / Plant Name
                  </label>
                  <Combobox
                    value={facilityName}
                    onChange={handleFacilityChange}
                    // Only pass a fetchUrl if an existing company ID was selected
                    fetchUrl={
                      selectedCompanyId
                        ? `/api/LocalInspectionReports/Combo/facilities?companyId=${selectedCompanyId}`
                        : ""
                    }
                    placeholder={
                      companyName.trim()
                        ? selectedCompanyId
                          ? "Select facility or type new plant name..."
                          : "Type new facility name..."
                        : "Type or select a company first..."
                    }
                    // Enable input as long as companyName is typed (even for brand-new companies)
                    disabled={!companyName.trim()} 
                  />
                </div>

                <div>
                  <label className="block text-xs text-slate-400 mb-1 font-medium">
                    Target Directorate
                  </label>
                  <select
                    value={targetDirectorate}
                    onChange={(e) => handleDirectorateChange(e.target.value as DirectorateCategory)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-blue-400 font-bold focus:outline-none focus:border-blue-500"
                  >
                    <option value="VMD">VMD (Veterinary Medicine)</option>
                    <option value="PAD">PAD (Pesticides & Agro-chemicals)</option>
                    <option value="AFPD">AFPD (Animal Feed & Premix)</option>
                    <option value="IRSD">IRSD (Inspection, Relations & Stakeholders)</option>
                  </select>
                </div>
              </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs text-slate-400 mb-1 font-medium">Physical Plant Address</label>
                <input
                  type="text"
                  value={facilityAddress}
                  onChange={(e) => setFacilityAddress(e.target.value)}
                  placeholder="Industrial Estate, Gwagwalada, Abuja, Nigeria"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Official Contact Email</label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="regulatory@company.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            {/* Optional Intake Geolocation Fields */}
            <div className="pt-2 border-t border-slate-700/50">
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Draft GPS Coordinates{" "}
                <span className="text-slate-500 font-normal">(Optional - reconfirmed by staff during inspection)</span>
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Latitude</label>
                  <input
                    type="number"
                    step="any"
                    value={latitude}
                    onChange={(e) => setLatitude(e.target.value)}
                    placeholder="8.950700"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-400 mb-1">Longitude</label>
                  <input
                    type="number"
                    step="any"
                    value={longitude}
                    onChange={(e) => setLongitude(e.target.value)}
                    placeholder="7.076800"
                    className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Section 2: Inspection Metrics */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg">
            <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider mb-3">
              2. Inspection Type & Scope
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Type of Inspection</label>
                <select
                  value={inspectionType}
                  onChange={(e) => setInspectionType(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="Pre-Production">Pre-Production Inspection (PPI)</option>
                  <option value="Pre-Registration">Pre-Registration Inspection (PRI)</option>
                  <option value="Renewal">Renewal Inspection (REN)</option>
                  <option value="GMP-Reassessment">GMP-Reassessment (GMP)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Target Audit Duration (Days)</label>
                <input
                  type="number"
                  min={1}
                  max={14}
                  value={estimatedInspectionDays}
                  onChange={(e) => setEstimatedInspectionDays(Number(e.target.value))}
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-xs text-slate-200 font-bold focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Product Lines & Products */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-xs font-semibold text-blue-400 uppercase tracking-wider">
                  3. Manufacturing Lines & Products
                </h3>
                <p className="text-[11px] text-slate-500">Products auto-filter based on selected directorate ({targetDirectorate})</p>
              </div>
              <button
                type="button"
                onClick={addProductLine}
                className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-medium text-xs py-1.5 px-3 rounded transition"
              >
                + Add Production Line
              </button>
            </div>

            {productLines.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">
                No manufacturing lines added yet. Click above to attach a line structure.
              </p>
            ) : (
              <div className="space-y-4">
                {productLines.map((line, lIdx) => (
                  <div key={lIdx} className="bg-slate-900/60 border border-slate-700 p-4 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => removeProductLine(lIdx)}
                      className="absolute top-3 right-3 text-xs text-rose-400 hover:text-rose-300 font-bold transition"
                    >
                      Remove Line
                    </button>

                    <div className="max-w-xs mb-4">
                      <label className="block text-xs text-slate-400 mb-1 font-medium">Line Category / Form</label>
                      <select
                        value={line.lineName}
                        onChange={(e) => updateLineName(lIdx, e.target.value)}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                      >
                        {PRODUCTION_LINE_TYPES.map((typeOption) => (
                          <option key={typeOption} value={typeOption}>
                            {typeOption}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="mt-2 pl-4 border-l-2 border-slate-700 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-300">Registered Intended Products</span>
                        <button
                          type="button"
                          onClick={() => addProductToLine(lIdx)}
                          className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-[11px] px-2 py-1 rounded transition"
                        >
                          + Add Product
                        </button>
                      </div>

                      {line.products.length === 0 ? (
                        <p className="text-[11px] text-slate-500 italic py-1">
                          No products assigned to this line yet. Click + Add Product above to start adding items.
                        </p>
                      ) : (
                        line.products.map((prod, pIdx) => (
                          <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center bg-slate-950/40 p-2 rounded border border-slate-800">
                            <div className="sm:col-span-5">
                              <Combobox
                                label="Product Name"
                                fetchUrl={
                                  selectedFacilityId
                                    ? `/api/LocalInspectionReports/Combo/products?lineType=${encodeURIComponent(line.lineName)}&facilityId=${selectedFacilityId}`
                                    : selectedCompanyId
                                    ? `/api/LocalInspectionReports/Combo/products?lineType=${encodeURIComponent(line.lineName)}&companyId=${selectedCompanyId}`
                                    : `/api/LocalInspectionReports/Combo/products?lineType=${encodeURIComponent(line.lineName)}`
                                }
                                value={prod.name}
                                onChange={(val, opt) => updateProductValue(lIdx, pIdx, "name", val, opt)}
                                placeholder={
                                  selectedCompanyId 
                                    ? "Search existing company products..." 
                                    : "Type product name..."
                                }
                              />
                            </div>

                            <div className="sm:col-span-4">
                              <select
                                value={prod.classification}
                                onChange={(e) => updateProductValue(lIdx, pIdx, "classification", e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300 focus:outline-none focus:border-blue-500"
                              >
                                {DIRECTORATE_PRODUCT_MAP[targetDirectorate].map((categoryItem) => (
                                  <option key={categoryItem} value={categoryItem}>
                                    {categoryItem}
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="sm:col-span-2">
                              <select
                                value={prod.targetSpecies || "Multi-Species"}
                                onChange={(e) => updateProductValue(lIdx, pIdx, "targetSpecies", e.target.value)}
                                className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-[11px] text-slate-300 focus:outline-none focus:border-blue-500"
                              >
                                <option value="Multi-Species">Multi-Species</option>
                                <option value="Poultry">Poultry</option>
                                <option value="Ruminants">Ruminants</option>
                                <option value="Swine">Swine</option>
                                <option value="Aquaculture">Aquaculture</option>
                                <option value="Equine">Equine</option>
                                <option value="Companion">Companion</option>
                              </select>
                            </div>

                            <div className="sm:col-span-1 text-right">
                              <button
                                type="button"
                                onClick={() => removeProductFromLine(lIdx, pIdx)}
                                className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                              >
                                ✕
                              </button>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs py-3 px-4 rounded-md transition duration-150 shadow-md uppercase tracking-wider font-bold"
          >
            {loading ? "Registering Application..." : "Register Application & Initialize QMS Workflow"}
          </button>
        </form>
      </div>
    </div>
  );
}