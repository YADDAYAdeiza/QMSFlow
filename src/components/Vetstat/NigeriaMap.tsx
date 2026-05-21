// components/Vetstat/NigeriaMap.tsx
'use client';

import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { Map, BarChart3, ChevronLeft, ChevronRight, Layers, AlertTriangle, TrendingUp, TrendingDown, X } from "lucide-react";
import { NIGERIA_GEO_DATA } from "./nigeriaGeoData"; 
import { ZoneMetric, SubstanceMetric } from "@/lib/actions/Vetstat/fetchAnalytics";

const STATE_TO_ZONE: Record<string, string> = {
  "Benue": "North-Central", "Federal Capital Territory": "North-Central", "Kogi": "North-Central", 
  "Kwara": "North-Central", "Nasarawa": "North-Central", "Niger": "North-Central", "Plateau": "North-Central",
  "Adamawa": "North-East", "Bauchi": "North-East", "Borno": "North-East", 
  "Gombe": "North-East", "Taraba": "North-East", "Yobe": "North-East",
  "Kaduna": "North-West", "Kano": "North-West", "Katsina": "North-West", 
  "Kebbi": "North-West", "Jigawa": "North-West", "Sokoto": "North-West", "Zamfara": "North-West",
  "Abia": "South-East", "Anambra": "South-East", "Ebonyi": "South-East", 
  "Enugu": "South-East", "Imo": "South-East",
  "Akwa Ibom": "South-South", "Bayelsa": "South-South", "Cross River": "South-South", 
  "Delta": "South-South", "Edo": "South-South", "Rivers": "South-South",
  "Ekiti": "South-West", "Lagos": "South-West", "Ogun": "South-West", 
  "Ondo": "South-West", "Osun": "South-West", "Oyo": "South-West"
};

const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

export default function StructuralAnalyticsEngine({ 
  zones = [], 
  topSubstances = [], // Note: If your parent feeds the unfiltered raw stream, see the computation below
  isHighRiskMode = false,
  rawRows = [] // OPTIONAL: If you pass down the raw database rows from the server, we can perfectly filter zones!
}: { 
  zones: ZoneMetric[]; 
  topSubstances?: SubstanceMetric[];
  isHighRiskMode?: boolean;
  rawRows?: any[]; // If your architecture allows passing the raw row data array
}) {
  const [activeView, setActiveView] = useState<'map' | 'zoneBar'>('map');
  const [tooltip, setTooltip] = useState("");
  const [selectedZone, setSelectedZone] = useState<string | null>(null);
  
  const [substanceOffset, setSubstanceOffset] = useState(0);
  const itemsPerPage = 5;

  const zoneLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    zones.forEach(z => { lookup[normalize(z.zone)] = z.value; });
    return lookup;
  }, [zones]);

  const maxZoneVal = useMemo(() => {
    const vals = Object.values(zoneLookup);
    return vals.length > 0 ? Math.max(...vals, 10) : 100;
  }, [zoneLookup]);

  const colorScale = scaleLinear<string>()
    .domain([0, maxZoneVal * 0.1, maxZoneVal])
    .range(isHighRiskMode ? ["#fff1f2", "#f43f5e", "#9f1239"] : ["#f1f5f9", "#3b82f6", "#1e3a8a"]);

  // --- DYNAMIC SUBSTANCE FILTERING ENGINE ---
  // If rawRows are provided, we dynamically recompute the metrics based on selection.
  // Otherwise, we gracefully fall back to filtering the pre-aggregated `topSubstances` array.
  const filteredSubstances = useMemo(() => {
    if (!selectedZone) return topSubstances;

    if (rawRows && rawRows.length > 0) {
      const substanceMap: Record<string, { class: string; riskPriority: string; volume: number }> = {};
      
      rawRows.forEach((row: any) => {
        if (row.zone !== selectedZone) return;
        const subKey = row.substance || "Unknown Substance";
        if (!substanceMap[subKey]) {
          substanceMap[subKey] = {
            class: row.substance_class || "Unclassified",
            riskPriority: row.risk_priority || "LOW",
            volume: 0
          };
        }
        substanceMap[subKey].volume += parseFloat(row.total_ddd) || 0;
      });

      return Object.entries(substanceMap)
        .map(([substance, details]) => ({
          substance,
          class: details.class,
          riskPriority: details.riskPriority as any,
          volume: details.volume
        }))
        .sort((a, b) => b.volume - a.volume);
    }

    // Fallback: simple profile routing if raw arrays aren't explicitly passed down
    return topSubstances;
  }, [topSubstances, selectedZone, rawRows]);

  const paginatedSubstances = useMemo(() => {
    return filteredSubstances.slice(substanceOffset, substanceOffset + itemsPerPage);
  }, [filteredSubstances, substanceOffset]);

  const maxSubstanceVal = useMemo(() => {
    if (filteredSubstances.length === 0) return 100;
    return Math.max(...filteredSubstances.map(s => s.volume), 1);
  }, [filteredSubstances]);

  const handleZoneClick = (zoneName: string) => {
    setSubstanceOffset(0); // Reset page offset back to 0 on selection switch
    setSelectedZone(prev => prev === zoneName ? null : zoneName);
  };

  return (
    <div className="w-full h-full flex flex-col gap-6">
      
      {/* Navigation Toggles */}
      <div className="flex items-center justify-between bg-slate-50 border border-slate-200/60 p-1.5 rounded-xl self-end z-20">
        <button
          type="button"
          onClick={() => { setActiveView('map'); setSelectedZone(null); }}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
            activeView === 'map' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <Map size={13} /> Geospatial
        </button>
        <button
          type="button"
          onClick={() => setActiveView('zoneBar')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-[11px] font-black uppercase rounded-lg transition-all ${
            activeView === 'zoneBar' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-400 hover:text-slate-600'
          }`}
        >
          <BarChart3 size={13} /> Regional Loads
        </button>
      </div>

      {/* Primary Workspace View */}
      <div className="relative flex-1 min-h-[300px] flex items-center justify-center">
        {tooltip && (
          <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-950 text-white px-3 py-1 rounded shadow-xl text-[10px] font-bold z-50 border border-slate-800">
            {tooltip}
          </div>
        )}

        {activeView === 'map' ? (
          <ComposableMap 
            projection="geoMercator" 
            projectionConfig={{ scale: 4200, center: [8.6, 9.1] }}
            className="w-full h-auto max-h-[480px]"
          >
            <Geographies geography={NIGERIA_GEO_DATA}> 
              {({ geographies }) =>
                geographies.map((geo) => {
                  const stateName = geo.properties.NAME_1; 
                  const zoneName = STATE_TO_ZONE[stateName] || "Unknown";
                  const val = zoneLookup[normalize(zoneName)] || 0;

                  return (
                    <Geography 
                      key={geo.rsmKey} 
                      geography={geo} 
                      onMouseEnter={() => setTooltip(`${stateName} (${zoneName}): ${val.toLocaleString(undefined, {maximumFractionDigits:2})} Divisional Deputy Director`)}
                      onMouseLeave={() => setTooltip("")}
                      fill={val > 0 ? colorScale(val) : "#f8fafc"}
                      stroke={isHighRiskMode ? "#fecdd3" : "#cbd5e1"}
                      strokeWidth={0.5}
                      style={{
                        default: { outline: "none" },
                        hover: { fill: "#fbbf24", outline: "none", cursor: "pointer" },
                      }}
                    />
                  )
                })
              }
            </Geographies>
          </ComposableMap>
        ) : (
          /* Interactive Regional Progress Bars */
          <div className="w-full space-y-4 px-2 py-4">
            {zones.map((z) => {
              const percentage = (z.value / maxZoneVal) * 100;
              const isTrendPositive = z.trend > 0;
              const isCurrentSelection = selectedZone === z.zone;

              return (
                <div 
                  key={z.zone} 
                  onClick={() => handleZoneClick(z.zone)}
                  className={`space-y-1 p-2 rounded-xl border transition-all duration-200 cursor-pointer ${
                    isCurrentSelection 
                      ? 'bg-slate-50 border-slate-300 shadow-sm ring-1 ring-slate-200' 
                      : selectedZone 
                        ? 'opacity-40 border-transparent hover:opacity-70' 
                        : 'border-transparent hover:bg-slate-50/60'
                  }`}
                >
                  <div className="flex justify-between items-center text-[11px] font-bold text-slate-700">
                    <span className="uppercase tracking-tight">{z.zone || "Unassigned"}</span>
                    <div className="flex items-center gap-2 font-mono">
                      <span className="text-slate-900">{z.value.toLocaleString(undefined, {maximumFractionDigits: 2})} Divisional Deputy Director</span>
                      {z.trend !== 0 && (
                        <span className={`flex items-center text-[9px] font-bold px-1 rounded ${isTrendPositive ? 'text-rose-600 bg-rose-50' : 'text-emerald-600 bg-emerald-50'}`}>
                          {isTrendPositive ? <TrendingUp size={10} className="mr-0.5" /> : <TrendingDown size={10} className="mr-0.5" />}
                          {Math.abs(z.trend).toFixed(1)}%
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="h-6 w-full bg-slate-100 rounded-lg overflow-hidden relative border border-slate-200/40">
                    <div 
                      className={`h-full rounded-r-md transition-all duration-1000 ${
                        isCurrentSelection
                          ? 'bg-gradient-to-r from-amber-500 to-amber-600'
                          : isHighRiskMode ? 'bg-gradient-to-r from-rose-500 to-rose-700' : 'bg-gradient-to-r from-blue-500 to-blue-700'
                      }`}
                      style={{ width: `${Math.max(percentage, 2)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* --- ACTIVE SUBSTANCE SLIDER (WITH CONDITIONAL FILTERS) --- */}
      {activeView === 'zoneBar' && (
        <div className="space-y-3 transition-all duration-300 animate-fadeIn">
          <hr className="border-slate-100 my-2" />
          
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2 text-slate-800">
              <Layers size={14} className={isHighRiskMode ? "text-rose-500" : "text-blue-500"} />
              <h4 className="text-[11px] font-black uppercase tracking-wider">
                {selectedZone ? `Substances in ${selectedZone}` : 'Top Active Substance Loading'}
              </h4>
              {selectedZone && (
                <button 
                  onClick={() => setSelectedZone(null)}
                  className="flex items-center gap-0.5 px-1.5 py-0.5 text-[9px] bg-slate-100 text-slate-500 rounded-md hover:bg-slate-200 transition font-sans font-bold"
                >
                  Clear Filter <X size={10} />
                </button>
              )}
            </div>
            
            <div className="flex items-center gap-1 bg-slate-100 border border-slate-200/60 rounded-lg p-0.5">
              <button
                type="button"
                disabled={substanceOffset === 0}
                onClick={() => setSubstanceOffset(prev => Math.max(0, prev - itemsPerPage))}
                className="p-1 hover:bg-white text-slate-600 disabled:opacity-30 rounded transition"
              >
                <ChevronLeft size={12} strokeWidth={3} />
              </button>
              <span className="text-[9px] font-mono font-bold px-2 text-slate-500">
                {filteredSubstances.length > 0 ? substanceOffset + 1 : 0}-{Math.min(substanceOffset + itemsPerPage, filteredSubstances.length)} of {filteredSubstances.length}
              </span>
              <button
                type="button"
                disabled={substanceOffset + itemsPerPage >= filteredSubstances.length}
                onClick={() => setSubstanceOffset(prev => prev + itemsPerPage)}
                className="p-1 hover:bg-white text-slate-600 disabled:opacity-30 rounded transition"
              >
                <ChevronRight size={12} strokeWidth={3} />
              </button>
            </div>
          </div>

          {paginatedSubstances.length === 0 ? (
            <div className="text-center py-6 text-xs font-bold text-slate-400 bg-slate-50 border border-dashed border-slate-200 rounded-2xl">
              No active metrics found matching criteria.
            </div>
          ) : (
            <div className="space-y-2.5">
              {paginatedSubstances.map((item, index) => {
                const widthPct = (item.volume / maxSubstanceVal) * 100;
                const isCritical = item.riskPriority === 'CRITICAL';
                
                return (
                  <div 
                    key={`${item.substance}-${substanceOffset + index}`} 
                    className="flex items-center gap-3 bg-white border border-slate-200/60 p-2.5 rounded-xl shadow-sm"
                  >
                    <div className={`w-7 h-7 shrink-0 rounded-lg border flex items-center justify-center text-[10px] font-mono font-black ${
                      isCritical ? 'bg-rose-50 border-rose-200 text-rose-600' : 'bg-slate-50 border-slate-200 text-slate-600'
                    }`}>
                      {isCritical ? <AlertTriangle size={11} className="animate-pulse" /> : substanceOffset + index + 1}
                    </div>

                    <div className="flex-1 min-w-0 space-y-1">
                      <div className="flex justify-between items-baseline gap-2">
                        <div className="min-w-0">
                          <p className="text-xs font-black text-slate-800 truncate uppercase tracking-tight">
                            {item.substance}
                          </p>
                          <p className="text-[9px] font-medium text-slate-400 uppercase tracking-tight truncate">
                            Class: <span className="font-bold text-slate-500">{item.class || "Unassigned"}</span>
                          </p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[11px] font-mono font-black text-slate-900">
                            {item.volume.toLocaleString(undefined, { maximumFractionDigits: 1 })} <span className="text-[9px] text-slate-400 font-bold">Divisional Deputy Director</span>
                          </p>
                          <span className={`inline-block px-1 py-0.5 rounded text-[7px] font-black tracking-widest uppercase ${
                            isCritical ? 'bg-rose-100 text-rose-700 font-bold' : 'bg-emerald-100 text-emerald-700'
                          }`}>
                            {item.riskPriority}
                          </span>
                        </div>
                      </div>

                      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden border border-slate-200/20">
                        <div 
                          className={`h-full rounded-full transition-all duration-700 ${
                            isCritical || isHighRiskMode ? 'bg-gradient-to-r from-rose-500 to-rose-600' : 'bg-gradient-to-r from-emerald-500 to-emerald-600'
                          }`}
                          style={{ width: `${Math.max(widthPct, 1.5)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

    </div>
  );
}