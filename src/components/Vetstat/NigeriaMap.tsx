'use client'

import React, { useState, useMemo } from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";
import { NIGERIA_GEO_DATA } from "./nigeriaGeoData"; 

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

// Strips hyphens, spaces, and casing to ensure "North-West" matches "northwest"
const normalize = (str: string) => str?.toLowerCase().replace(/[^a-z0-9]/g, "") || "";

export default function NigeriaMap({ zones = [] }: { zones: any[] }) {
  const [tooltip, setTooltip] = useState("");

  // 1. Create a Lookup Map
  const zoneLookup = useMemo(() => {
    const lookup: Record<string, number> = {};
    zones.forEach(z => {
      // Handles both {zone, value} and {geopolitical_zone, ddd_consumed} formats
      const key = normalize(z.zone || z.geopolitical_zone);
      const val = parseFloat(z.value || z.ddd_consumed) || 0;
      lookup[key] = val;
    });
    console.log("Map Lookup Table:", lookup); // DEBUG: Ensure this isn't empty
    return lookup;
  }, [zones]);

  // 2. Find Max Value for Scale
  const maxVal = useMemo(() => {
    const vals = Object.values(zoneLookup);
    const max = vals.length > 0 ? Math.max(...vals) : 100;
    return max === 0 ? 100 : max; // Prevent division by zero
  }, [zoneLookup]);

  // 3. Define Color Scale
  const colorScale = scaleLinear<string>()
    .domain([0, maxVal * 0.1, maxVal])
    .range(["#f1f5f9", "#3b82f6", "#1e3a8a"]);

  return (
    <div className="w-full h-full relative">
      {tooltip && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 bg-slate-900 text-white px-3 py-1 rounded shadow-lg text-[10px] z-50">
          {tooltip}
        </div>
      )}
      
      <ComposableMap 
        projection="geoMercator" 
        projectionConfig={{ scale: 3800, center: [8.6, 9.2] }}
        className="w-full h-auto"
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
                  onMouseEnter={() => setTooltip(`${stateName} (${zoneName}): ${val.toFixed(2)}`)}
                  onMouseLeave={() => setTooltip("")}
                  fill={val > 0 ? colorScale(val) : "#f8fafc"}
                  stroke="#cbd5e1"
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
    </div>
  );
}