"use client";

import React, { useState } from "react";

interface Product {
  name: string;
  classification: "AgroPesticides" | "Pharma" | "Medical Devices" | "Biologics" | "Vaccines" | "Premix" | "Animal Feed";
}

interface ProductLine {
  lineType: "Liquid" | "Solid" | "Powder" | "Aerosol" | "Sterile";
  products: Product[];
}

export default function ApplicationCreationPage() {
  const [loading, setLoading] = useState<boolean>(false);
  const [log, setLog] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Form States
  const [companyName, setCompanyName] = useState("");
  const [companyAddress, setCompanyAddress] = useState("");
  const [inspectionType, setInspectionType] = useState<"Pre-Production" | "Pre-Registration" | "Renewal" | "GMP-Reassessment">("Pre-Production");
  const [notificationEmail, setNotificationEmail] = useState("");
  const [productLines, setProductLines] = useState<ProductLine[]>([]);

  // Add a brand new production line block
  const addProductLine = () => {
    setProductLines([
      ...productLines,
      { lineType: "Liquid", products: [] },
    ]);
  };

  // Remove a production line block
  const removeProductLine = (index: number) => {
    const updated = [...productLines];
    updated.splice(index, 1);
    setProductLines(updated);
  };

  // Update a production line's main type
  const updateLineType = (index: number, val: ProductLine["lineType"]) => {
    const updated = [...productLines];
    updated[index].lineType = val;
    setProductLines(updated);
  };

  // Append a product node into a specific line
  const addProductToLine = (lineIndex: number) => {
    const updated = [...productLines];
    updated[lineIndex].products.push({
      name: "",
      classification: "Pharma",
    });
    setProductLines(updated);
  };

  // Remove a product node from a specific line
  const removeProductFromLine = (lineIndex: number, prodIndex: number) => {
    const updated = [...productLines];
    updated[lineIndex].products.splice(prodIndex, 1);
    setProductLines(updated);
  };

  // Mutate product values inline
  const updateProductValue = (
    lineIndex: number,
    prodIndex: number,
    field: keyof Product,
    value: string
  ) => {
    const updated = [...productLines];
    updated[lineIndex].products[prodIndex] = {
      ...updated[lineIndex].products[prodIndex],
      [field]: value,
    };
    setProductLines(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!companyName || !companyAddress || !notificationEmail) {
      setLog({ type: "error", text: "Please populate all foundational company and notification metrics." });
      return;
    }

    setLoading(true);
    setLog(null);

    try {
      const response = await fetch("/api/LocalInspectionReports/seed-application", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          companyName,
          companyAddress,
          inspectionType,
          notificationEmail,
          productLines,
        }),
      });
      const data = await response.json();

      if (!response.ok) throw new Error(data.error || "Application submission failure encountered.");

      setLog({ type: "success", text: data.message });
      // Reset form variables on success
      setCompanyName("");
      setCompanyAddress("");
      setNotificationEmail("");
      setProductLines([]);
    } catch (err: any) {
      setLog({ type: "error", text: err.message || "Network execution breakdown." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-6">
      <div className="max-w-3xl w-full bg-slate-800 border border-slate-700 rounded-xl p-8 shadow-2xl">
        <h2 className="text-2xl font-bold tracking-tight mb-2">📋 New VMD Inspection Application</h2>
        <p className="text-slate-400 text-sm mb-6">
          Establish operational company parameters, track lines, and classify product types within standard compliance fields.
        </p>

        {log && (
          <div
            className={`p-4 rounded-lg mb-6 text-sm border font-mono ${
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
          {/* Section 1: Core Company Meta */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg space-y-4">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">1. Company Profile</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Facility / Company Name</label>
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  placeholder="e.g. Alpha Biologicals Ltd"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1 font-medium">Notification Email Address</label>
                <input
                  type="email"
                  value={notificationEmail}
                  onChange={(e) => setNotificationEmail(e.target.value)}
                  placeholder="regulatory@company.com"
                  className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Physical Plant Address</label>
              <textarea
                value={companyAddress}
                onChange={(e) => setCompanyAddress(e.target.value)}
                placeholder="Industrial Layout, Kaduna, Nigeria"
                rows={2}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>

          {/* Section 2: Inspection Metric */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg">
            <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider mb-3">2. Inspection Scope</h3>
            <div>
              <label className="block text-xs text-slate-400 mb-1 font-medium">Type of Inspection</label>
              <select
                value={inspectionType}
                onChange={(e) => setInspectionType(e.target.value as any)}
                className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm focus:outline-none focus:border-blue-500 transition"
              >
                <option value="Pre-Production">Pre-Production</option>
                <option value="Pre-Registration">Pre-Registration</option>
                <option value="Renewal">Renewal</option>
                <option value="GMP-Reassessment">GMP-Reassessment</option>
              </select>
            </div>
          </div>

          {/* Section 3: Dynamic Production Lines & Products */}
          <div className="bg-slate-800/40 p-4 border border-slate-700/60 rounded-lg space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">3. Manufacturing Lines & Inventory</h3>
              <button
                type="button"
                onClick={addProductLine}
                className="bg-blue-600/20 text-blue-400 border border-blue-500/30 hover:bg-blue-600/30 font-medium text-xs py-1.5 px-3 rounded transition"
              >
                + Add Production Line
              </button>
            </div>

            {productLines.length === 0 ? (
              <p className="text-xs text-slate-500 italic text-center py-4">No manufacturing lines added yet. Click above to attach a line structure.</p>
            ) : (
              <div className="space-y-4">
                {productLines.map((line, lIdx) => (
                  <div key={lIdx} className="bg-slate-900/60 border border-slate-700 p-4 rounded-lg relative">
                    <button
                      type="button"
                      onClick={() => removeProductLine(lIdx)}
                      className="absolute top-3 right-3 text-xs text-rose-400 hover:text-rose-300 transition"
                    >
                      Remove Line
                    </button>

                    <div className="max-w-xs mb-4">
                      <label className="block text-xs text-slate-400 mb-1 font-medium">Line Form Category</label>
                      <select
                        value={line.lineType}
                        onChange={(e) => updateLineType(lIdx, e.target.value as any)}
                        className="w-full bg-slate-900 border border-slate-700 rounded-md px-2 py-1 text-xs focus:outline-none focus:border-blue-500"
                      >
                        <option value="Liquid">Liquid</option>
                        <option value="Solid">Solid</option>
                        <option value="Powder">Powder</option>
                        <option value="Aerosol">Aerosol</option>
                        <option value="Sterile">Sterile</option>
                      </select>
                    </div>

                    {/* Products Block inside Line */}
                    <div className="mt-2 pl-4 border-l-2 border-slate-700 space-y-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-300">Registered Intended Products</span>
                        <button
                          type="button"
                          onClick={() => addProductToLine(lIdx)}
                          className="bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-600/30 text-[11px] px-2 py-1 rounded transition"
                        >
                          + Add Product to Line
                        </button>
                      </div>

                      {line.products.map((prod, pIdx) => (
                        <div key={pIdx} className="grid grid-cols-1 sm:grid-cols-12 gap-2 items-center">
                          <div className="sm:col-span-6">
                            <input
                              type="text"
                              value={prod.name}
                              onChange={(e) => updateProductValue(lIdx, pIdx, "name", e.target.value)}
                              placeholder="Product Formulation Generic/Brand Name"
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 placeholder-slate-500"
                            />
                          </div>
                          <div className="sm:col-span-5">
                            <select
                              value={prod.classification}
                              onChange={(e) => updateProductValue(lIdx, pIdx, "classification", e.target.value)}
                              className="w-full bg-slate-900 border border-slate-700 rounded px-2 py-1 text-xs text-slate-300"
                            >
                              <option value="AgroPesticides">AgroPesticides</option>
                              <option value="Pharma">Pharma</option>
                              <option value="Medical Devices">Medical Devices</option>
                              <option value="Biologics">Biologics</option>
                              <option value="Vaccines">Vaccines</option>
                              <option value="Premix">Premix</option>
                              <option value="Animal Feed">Animal Feed</option>
                            </select>
                          </div>
                          <div className="sm:col-span-1 text-right">
                            <button
                              type="button"
                              onClick={() => removeProductFromLine(lIdx, pIdx)}
                              className="text-rose-400 hover:text-rose-300 text-xs font-bold"
                              title="Delete Product"
                            >
                              ✕
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Action Trigger */}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-sm py-2.5 px-4 rounded-md transition duration-150 shadow-md"
          >
            {loading ? "Registering Application Data..." : "Submit and Intitialize VMD Workflow"}
          </button>
        </form>
      </div>
    </div>
  );
}