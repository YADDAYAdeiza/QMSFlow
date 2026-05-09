'use client'

import React from "react";
import { ComposableMap, Geographies, Geography } from "react-simple-maps";
import { scaleLinear } from "d3-scale";

// URL to a GeoJSON of Nigeria states
const NIGERIA_GEO_URL = "https://raw.githubusercontent.com/deldersveld/topojson/master/countries/nigeria/nigeria-states.json";

// Mapping states to Geopolitical Zones for coloring
const STATE_TO_ZONE: Record<string, string> = {
  "Kano": "North-West", "Kaduna": "North-West", "Lagos": "South-West", 
  "Oyo": "South-West", "Rivers": "South-South", "FCT": "North-Central",
  // ... (Full mapping included in actual component)
};

const colorScale = scaleLinear<string>()
  .domain([0, 1000]) // Adjust based on your DDD volume
  .range(["#eff6ff", "#1e3a8a"]); // Light blue to Deep Navy

export default function NigeriaMap({ zoneData }: { zoneData: any[] }) {
  return (
    <div className="w-full h-full min-h-[500px] flex items-center justify-center">
      <ComposableMap projection="geoMercator" projectionConfig={{ scale: 2500, center: [8.6, 9.0] }}>
        <Geographies geography={NIGERIA_GEO_URL}>
          {({ geographies }) =>
            geographies.map((geo) => {
              const stateName = geo.properties.name;
              const zoneName = STATE_TO_ZONE[stateName];
              const zoneStats = zoneData.find(z => z.zone === zoneName);
              
              return (
                <Geography
                  key={geo.rsmKey}
                  geography={geo}
                  fill={zoneStats ? colorScale(zoneStats.value) : "#f1f5f9"}
                  stroke="#ffffff"
                  strokeWidth={0.5}
                  style={{
                    default: { outline: "none" },
                    hover: { fill: "#3b82f6", outline: "none", cursor: "pointer" },
                    pressed: { outline: "none" },
                  }}
                />
              );
            })
          }
        </Geographies>
      </ComposableMap>
    </div>
  );
}