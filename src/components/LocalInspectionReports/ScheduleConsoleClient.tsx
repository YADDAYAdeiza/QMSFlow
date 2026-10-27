"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });

// NAFDAC HQ Reference Hub (Abuja, Nigeria) for international travel distance calculations
const NAFDAC_HQ_LAT = 9.05785;
const NAFDAC_HQ_LNG = 7.49508;

// Haversine formula for great-circle distance in kilometers
const calculateDistanceKm = (lat1: number, lon1: number, lat2: number, lon2: number) => {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
};

// Travel logistics advisory engine
const getTravelLogistics = (distanceKm: number, country: string) => {
  if (distanceKm > 500) {
    return {
      mode: "✈️ International Air Travel + Ground Transfer",
      transitNote: `Long-haul flight required from NIB/LOS to primary international airport in ${country}, followed by secure corporate ground transfer.`,
      estimatedHours: Math.round(distanceKm / 750 + 3)
    };
  } else if (distanceKm > 50) {
    return {
      mode: "🚗 Regional Inter-City Transit / Domestic Flight",
      transitNote: "Regional transit via connecting domestic flight or chartered executive road transport.",
      estimatedHours: Math.round(distanceKm / 80 + 1)
    };
  } else {
    return {
      mode: "🚐 Local Ground Shuttle / Chauffeur",
      transitNote: "Short local transit distance from regional hotel or airport.",
      estimatedHours: Math.max(1, Math.round(distanceKm / 40))
    };
  }
};

// Leaflet custom colored marker generator
const createColoredIcon = (colorHex: string) => {
  if (typeof window === "undefined") return undefined;
  const L = require("leaflet");
  return L.divIcon({
    className: "custom-pin",
    html: `<div style="background-color: ${colorHex}; width: 26px; height: 26px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 8px rgba(0,0,0,0.3);"></div>`,
    iconSize: [26, 26],
    iconAnchor: [13, 13],
    popupAnchor: [0, -13],
  });
};

interface PendingAssignment {
  company_name: string;
  application_id: number;
  scheduled_date?: string;
  current_step_title?: string;
}

interface Inspector {
  id: string;
  full_name: string;
  name?: string;
  rank?: string;
  division?: string;
  directorate?: string;
  is_available: boolean;
  travel_history?: string[]; // e.g., ["Germany", "China", "India"]
  last_traveled_date?: string; // e.g., "14 Jan 2026"
  pending_assignments?: PendingAssignment[];
  locked_workflows?: PendingAssignment[];
}

interface ProductOption {
  id: string;
  name: string;
  classification: string | null;
  target_species: string | null;
  vmd_approved: boolean;
}

interface ProductLineOption {
  id: string;
  name: string;
  sterility_level: string;
  containment_category: string;
  is_dedicated_line: boolean;
  products: ProductOption[];
}

interface FacilityOption {
  id: string;
  name: string;
  address: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  facility_type: string;
  product_lines: ProductLineOption[];
}

interface Props {
  applicationId: string;
  initialUsers: Inspector[];
  initialFacilities: FacilityOption[];
}

export default function ScheduleConsoleClient({ applicationId, initialUsers = [], initialFacilities = [] }: Props) {
  // Facility & Product Line Filter States
  const [selectedFacilityCountry, setSelectedFacilityCountry] = useState<string>("ALL");
  const [selectedFacilityDirectorate, setSelectedFacilityDirectorate] = useState<string>("ALL");
  const [selectedSterility, setSelectedSterility] = useState<string>("ALL");
  const [selectedContainment, setSelectedContainment] = useState<string>("ALL");
  const [selectedClassification, setSelectedClassification] = useState<string>("ALL");

  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");
  const [assignedFacilities, setAssignedFacilities] = useState<FacilityOption[]>([]);

  // Team Builder Form States (Strict Role Separation & High-Performer Friendly)
  const [inspectionDate, setInspectionDate] = useState("");
  const [teamLeader, setTeamLeader] = useState("");
  const [coInspectors, setCoInspectors] = useState<string[]>([]);
  const [traineeInspectors, setTraineeInspectors] = useState<string[]>([]);

  // QMS Audit Sidebar State
  const [focusedInspector, setFocusedInspector] = useState<Inspector | null>(null);

  const [dynamicCoords, setDynamicCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => window.dispatchEvent(new Event("resize")), 250);
    return () => clearTimeout(timer);
  }, []);

  const normalizedInspectors = useMemo(() => {
    return (initialUsers || []).map(u => ({
      ...u,
      full_name: u.full_name || u.name || "Unnamed Officer",
      travel_history: u.travel_history || ["United Kingdom", "Switzerland"], // Mock/Fallback sample history if unprovided
      last_traveled_date: u.last_traveled_date || "Nov 2025",
      pending_assignments: u.pending_assignments || u.locked_workflows || [],
    }));
  }, [initialUsers]);

  // Unique metadata extractors for filters
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    initialFacilities.forEach(f => { if (f.country) countries.add(f.country.trim()); });
    return Array.from(countries);
  }, [initialFacilities]);

  const availableClassifications = useMemo(() => {
    const classifications = new Set<string>();
    initialFacilities.forEach(f => {
      f.product_lines?.forEach(l => {
        l.products?.forEach(p => { if (p.classification) classifications.add(p.classification); });
      });
    });
    return Array.from(classifications);
  }, [initialFacilities]);

  const filteredFacilities = useMemo(() => {
    if (!Array.isArray(initialFacilities)) return [];
    return initialFacilities.filter(facility => {
      if (!facility) return false;
      const matchCountry = selectedFacilityCountry === "ALL" || (facility.country && facility.country.trim().toLowerCase() === selectedFacilityCountry.trim().toLowerCase());
      const matchDir = selectedFacilityDirectorate === "ALL" || (facility.facility_type && facility.facility_type.includes(selectedFacilityDirectorate));
      const matchSterility = selectedSterility === "ALL" || facility.product_lines?.some(l => l.sterility_level === selectedSterility);
      const matchContainment = selectedContainment === "ALL" || facility.product_lines?.some(l => l.containment_category === selectedContainment);
      const matchClassification = selectedClassification === "ALL" || facility.product_lines?.some(l => l.products?.some(p => p.classification === selectedClassification));
      return matchCountry && matchDir && matchSterility && matchContainment && matchClassification;
    });
  }, [initialFacilities, selectedFacilityCountry, selectedFacilityDirectorate, selectedSterility, selectedContainment, selectedClassification]);

  const activeFacility = useMemo(() => {
    if (!Array.isArray(filteredFacilities)) return null;
    return filteredFacilities.find(f => f?.id === selectedFacilityId) || assignedFacilities[0] || filteredFacilities[0] || initialFacilities[0] || null;
  }, [selectedFacilityId, assignedFacilities, filteredFacilities, initialFacilities]);

  // Dynamic geocoding fallback for un-pinned facilities
  useEffect(() => {
    let isMounted = true;
    if (activeFacility && (activeFacility.latitude == null || activeFacility.longitude == null) && activeFacility.address) {
      const addressQuery = encodeURIComponent(`${activeFacility.address}, ${activeFacility.country || ""}`);
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${addressQuery}&limit=1`, {
        headers: { 'User-Agent': 'VMAP-Regulatory-Inspection-Console' }
      })
        .then(res => res.json())
        .then(data => {
          if (isMounted && data && data.length > 0) {
            setDynamicCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
          } else {
            setDynamicCoords(null);
          }
        })
        .catch(() => { if (isMounted) setDynamicCoords(null); });
    } else {
      setDynamicCoords(null);
    }
    return () => { isMounted = false; };
  }, [activeFacility]);

  const centerLat = activeFacility?.latitude ?? dynamicCoords?.lat ?? 6.5244; 
  const centerLng = activeFacility?.longitude ?? dynamicCoords?.lng ?? 3.3792;

  // 2 closest neighboring facilities calculation
  const closestTwoFacilities = useMemo(() => {
    if (!activeFacility || !Array.isArray(filteredFacilities)) return [];
    const activeLat = activeFacility.latitude ?? dynamicCoords?.lat;
    const activeLng = activeFacility.longitude ?? dynamicCoords?.lng;
    if (activeLat == null || activeLng == null) return [];

    const scored = filteredFacilities
      .filter(f => f && f.id !== activeFacility.id && f.latitude != null && f.longitude != null)
      .map(f => {
        const latDiff = f.latitude! - activeLat;
        const lngDiff = f.longitude! - activeLng;
        return { facility: f, distance: Math.sqrt(latDiff * latDiff + lngDiff * lngDiff) };
      });

    scored.sort((a, b) => a.distance - b.distance);
    return scored.slice(0, 2).map(item => item.facility);
  }, [activeFacility, filteredFacilities, dynamicCoords]);

  const activeTravelInfo = useMemo(() => {
    const dist = calculateDistanceKm(NAFDAC_HQ_LAT, NAFDAC_HQ_LNG, centerLat, centerLng);
    const logistics = getTravelLogistics(dist, activeFacility?.country || "International Hub");
    return { dist, ...logistics };
  }, [centerLat, centerLng, activeFacility]);

  // Check if selected staff has active assignments to show advisory warnings
  const selectedLeaderObj = normalizedInspectors.find(i => i.id === teamLeader);
  const hasLeaderPending = (selectedLeaderObj?.pending_assignments?.length ?? 0) > 0;

  const handleSubmitSchedule = async () => {
    if (!inspectionDate || !teamLeader) {
      alert("Validation Error: Inspection target date and a designated Team Leader are mandatory parameters.");
      return;
    }
    if (assignedFacilities.length === 0) {
      alert("Validation Error: Please add at least one target facility to the Batch Inspection Itinerary.");
      return;
    }

    setSubmitting(true);
    try {
      const inspectorPayload = [
        { inspectorId: teamLeader, role: "TEAM_LEADER" as const },
        ...coInspectors.map((id) => ({ inspectorId: id, role: "CO_INSPECTOR" as const })),
        ...traineeInspectors.map((id) => ({ inspectorId: id, role: "TRAINEE_INSPECTOR" as const })),
      ];

      const response = await fetch('/api/LocalInspectionReports/schedule/single', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          applicationId: Number(applicationId),
          scheduledDate: inspectionDate,
          inspectors: inspectorPayload,
          facilities: assignedFacilities.map(f => f.id),
        }),
      });

      const result = await response.json();
      if (!result.success && response.status !== 200) {
        throw new Error(result.error || 'Failed to update inspection schedule.');
      }
      alert("Foreign inspection batch schedule successfully committed and dispatched!");
    } catch (err: unknown) {
      alert(err instanceof Error ? `Submission Error: ${err.message}` : 'An unexpected error occurred during submission.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-[95rem] mx-auto grid grid-cols-1 xl:grid-cols-12 gap-6 p-4">
      
      {/* COLUMN 1: Inspection Team Builder & Facility Filters (4 Cols) */}
      <div className="xl:col-span-4 space-y-6">
        
        {/* Team Builder Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h3 className="text-xs font-black uppercase tracking-wider text-slate-900">
              👥 Inspection Team Matrix
            </h3>
            <span className="text-[10px] bg-emerald-50 text-emerald-700 font-bold px-2 py-0.5 rounded-full">High-Performer Enabled</span>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Target Inspection Date</label>
            <input 
              type="date" 
              className="w-full text-xs font-semibold border border-slate-300 rounded-xl p-3 bg-slate-50/50 focus:bg-white focus:outline-emerald-500"
              value={inspectionDate}
              onChange={(e) => setInspectionDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Designated Team Leader</label>
            <select 
              className="w-full text-xs font-bold border border-slate-300 rounded-xl p-3 bg-slate-50/50 focus:bg-white cursor-pointer"
              value={teamLeader}
              onChange={(e) => {
                const leader = e.target.value;
                setTeamLeader(leader);
                setCoInspectors(prev => prev.filter(id => id !== leader));
                setTraineeInspectors(prev => prev.filter(id => id !== leader));
              }}
            >
              <option value="">-- Select Team Leader --</option>
              {normalizedInspectors.map(ins => {
                const activeCount = ins.pending_assignments?.length || 0;
                return (
                  <option key={ins.id} value={ins.id}>
                    ⭐ {ins.full_name} ({ins.rank || ins.division?.toUpperCase() || 'STAFF'}) {activeCount > 0 ? `[${activeCount} active tasks]` : ''}
                  </option>
                );
              })}
            </select>

            {/* High Performer Advisory Warning */}
            {hasLeaderPending && (
              <div className="mt-2 p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-800 flex items-start gap-2">
                <span>⚠️</span>
                <div>
                  <strong className="font-bold">Scheduler Advisory:</strong> Selected Team Leader ({selectedLeaderObj?.full_name}) currently has {selectedLeaderObj?.pending_assignments?.length} pending assignment(s). High performer authorized for parallel dispatch.
                </div>
              </div>
            )}
          </div>

          {/* Co-Inspectors Checkbox Matrix (All open for high performers) */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Co-Inspectors Pool</label>
            <div className="max-h-36 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50/50">
              {normalizedInspectors
                .filter(ins => ins.id !== teamLeader && !traineeInspectors.includes(ins.id))
                .map(ins => {
                  const activeCount = ins.pending_assignments?.length || 0;
                  return (
                    <label key={ins.id} className="flex items-center text-xs space-x-2 p-1.5 hover:bg-white rounded-lg cursor-pointer justify-between transition-colors">
                      <div className="flex items-center space-x-2">
                        <input 
                          type="checkbox" 
                          className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                          checked={coInspectors.includes(ins.id)}
                          onChange={() => setCoInspectors(prev => prev.includes(ins.id) ? prev.filter(i => i !== ins.id) : [...prev, ins.id])}
                        />
                        <span className="text-slate-800 font-medium">
                          {ins.full_name} {activeCount > 0 && <span className="text-[10px] text-amber-600 font-bold">({activeCount} active)</span>}
                        </span>
                      </div>
                      <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-slate-200/70 text-slate-700">
                        {ins.rank || ins.division || 'STAFF'}
                      </span>
                    </label>
                  );
                })}
            </div>
          </div>

          {/* Trainee Inspectors Checkbox Matrix */}
          <div>
            <label className="block text-[10px] font-black uppercase text-slate-500 mb-1">Trainee Inspectors (Max 2)</label>
            <div className="max-h-32 overflow-y-auto border border-slate-200 rounded-xl p-2.5 space-y-1 bg-slate-50/50">
              {normalizedInspectors
                .filter(ins => ins.id !== teamLeader && !coInspectors.includes(ins.id))
                .map(ins => (
                  <label key={ins.id} className="flex items-center text-xs space-x-2 p-1.5 hover:bg-white rounded-lg cursor-pointer justify-between transition-colors">
                    <div className="flex items-center space-x-2">
                      <input 
                        type="checkbox" 
                        className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                        checked={traineeInspectors.includes(ins.id)}
                        onChange={() => {
                          if (traineeInspectors.includes(ins.id)) {
                            setTraineeInspectors(prev => prev.filter(i => i !== ins.id));
                          } else {
                            if (traineeInspectors.length >= 2) {
                              alert("QMS Guardrail: Maximum of two (2) trainee inspectors allowed per mission group.");
                              return;
                            }
                            setTraineeInspectors(prev => [...prev, ins.id]);
                          }
                        }}
                      />
                      <span className="text-slate-800 font-medium">{ins.full_name}</span>
                    </div>
                    <span className="px-1.5 py-0.5 text-[9px] font-bold uppercase rounded bg-amber-100 text-amber-800">
                      Trainee
                    </span>
                  </label>
                ))}
            </div>
          </div>
        </div>

        {/* Facility Filters & Itinerary Selector Panel */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 border-b border-slate-100 pb-3">
            🏭 Facility Filters & Itinerary
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Country</label>
              <select
                value={selectedFacilityCountry}
                onChange={(e) => setSelectedFacilityCountry(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50/50 cursor-pointer"
              >
                <option value="ALL">All Countries</option>
                {availableCountries.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Sterility</label>
              <select
                value={selectedSterility}
                onChange={(e) => setSelectedSterility(e.target.value)}
                className="w-full text-xs font-bold border border-slate-300 rounded-xl p-2.5 bg-slate-50/50 cursor-pointer"
              >
                <option value="ALL">All Sterility</option>
                <option value="Sterile">Sterile</option>
                <option value="Non-Sterile">Non-Sterile</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[9px] font-black uppercase text-slate-400 mb-1">Select Filtered Facility</label>
            <div className="flex gap-2">
              <select
                value={selectedFacilityId}
                onChange={(e) => setSelectedFacilityId(e.target.value)}
                className="flex-1 text-xs font-semibold border border-slate-300 rounded-xl p-2.5 bg-slate-50/50 cursor-pointer"
              >
                <option value="">-- Choose Facility --</option>
                {filteredFacilities.map(f => (
                  <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
                ))}
              </select>
              <button
                type="button"
                disabled={!selectedFacilityId}
                onClick={() => {
                  const fac = initialFacilities.find(f => f?.id === selectedFacilityId);
                  if (fac && !assignedFacilities.some(f => f?.id === fac.id)) {
                    setAssignedFacilities([...assignedFacilities, fac]);
                  }
                }}
                className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Add
              </button>
            </div>
          </div>

          {/* Assigned Itinerary List */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100">
            <p className="text-[10px] font-black uppercase text-slate-500">Batch Itinerary Queue ({assignedFacilities.length}):</p>
            {assignedFacilities.length === 0 ? (
              <p className="text-xs text-slate-400 italic p-2 bg-slate-50 rounded-xl text-center">No facilities added to batch itinerary yet.</p>
            ) : (
              assignedFacilities.map(fac => (
                <div key={fac.id} className="flex justify-between items-center bg-emerald-50/80 p-2.5 rounded-xl border border-emerald-200 text-xs">
                  <div>
                    <span className="font-bold text-emerald-900 block">{fac.name}</span>
                    <span className="text-[10px] text-slate-600">{fac.address}, {fac.country}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAssignedFacilities(assignedFacilities.filter(f => f?.id !== fac.id))}
                    className="text-rose-600 hover:text-rose-800 font-bold px-2 py-1 text-sm cursor-pointer"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* COLUMN 2: Map & Travel Intelligence Radar (5 Cols) */}
      <div className="xl:col-span-5 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-col justify-between">
        <div>
          <h3 className="text-xs font-black uppercase tracking-wider text-slate-900 mb-3 flex items-center justify-between">
            <span>🗺️ Proximity & Travel Radar</span>
            {activeFacility && (
              <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full font-bold">
                {activeFacility.name} ({activeFacility.country})
              </span>
            )}
          </h3>

          <div className="h-[430px] w-full rounded-xl overflow-hidden border border-slate-300 relative z-0 mb-4 shadow-inner">
            {isMounted ? (
              <MapContainer
                key={`${centerLat}-${centerLng}`}
                center={[centerLat, centerLng]}
                zoom={5}
                style={{ height: "100%", width: "100%" }}
                className="w-full h-full"
              >
                <TileLayer
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                />

                {/* Primary Green Marker */}
                {activeFacility && (
                  <Marker position={[centerLat, centerLng]} icon={createColoredIcon("#10b981")}>
                    <Popup>
                      <div className="text-xs space-y-1">
                        <strong>{activeFacility.name}</strong><br />
                        📍 {activeFacility.address} ({activeFacility.country})<br />
                        ✈️ <strong>Distance from HQ:</strong> {activeTravelInfo.dist} km<br />
                        🚗 <strong>Transport:</strong> {activeTravelInfo.mode}<br />
                        <span className="text-emerald-600 font-bold">[Primary Target Facility]</span>
                      </div>
                    </Popup>
                  </Marker>
                )}

                {/* 2 Closest Red Neighbors */}
                {closestTwoFacilities.map(neigh => {
                  const neighDist = neigh.latitude != null && neigh.longitude != null ? calculateDistanceKm(centerLat, centerLng, neigh.latitude, neigh.longitude) : null;
                  return (
                    neigh && neigh.latitude != null && neigh.longitude != null && (
                      <Marker key={neigh.id} position={[neigh.latitude, neigh.longitude]} icon={createColoredIcon("#f43f5e")}>
                        <Popup>
                          <div className="text-xs space-y-1">
                            <strong>{neigh.name}</strong> (Closest Neighbor)<br />
                            📍 {neigh.address} ({neigh.country})<br />
                            📏 <strong>Distance from Primary:</strong> ~{neighDist} km<br />
                            <button
                              type="button"
                              onClick={() => {
                                if (!assignedFacilities.some(f => f?.id === neigh.id)) {
                                  setAssignedFacilities([...assignedFacilities, neigh]);
                                }
                              }}
                              className="mt-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-[10px] font-bold cursor-pointer"
                            >
                              + Add to Batch
                            </button>
                          </div>
                        </Popup>
                      </Marker>
                    )
                  );
                })}
              </MapContainer>
            ) : (
              <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 text-xs">
                Loading Geospatial Map Interface...
              </div>
            )}
          </div>

          {/* Travel Intelligence Advisory Box */}
          {activeFacility && (
            <div className="p-3.5 bg-blue-50/70 border border-blue-100 rounded-xl space-y-1 text-xs">
              <p className="font-bold text-blue-900 uppercase tracking-wide text-[10px]">✈️ Mission Logistics & Travel Advisory</p>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1">
                <p><strong>Distance from HQ:</strong> {activeTravelInfo.dist.toLocaleString()} km</p>
                <p><strong>Est. Transit:</strong> ~{activeTravelInfo.estimatedHours} hours</p>
              </div>
              <p className="text-slate-700 pt-0.5"><strong>Mode:</strong> {activeTravelInfo.mode}</p>
              <p className="text-[10px] text-slate-500 italic">{activeTravelInfo.transitNote}</p>
            </div>
          )}
        </div>

        <div className="pt-3 mt-4 border-t border-slate-200">
          <button
            type="button"
            disabled={!inspectionDate || !teamLeader || assignedFacilities.length === 0 || submitting}
            onClick={handleSubmitSchedule}
            className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-200 text-white text-xs font-black uppercase rounded-xl shadow-md transition-all cursor-pointer"
          >
            {submitting ? 'Committing Multi-Table Transactions...' : '🚀 Finalize & Dispatch Mission Orders'}
          </button>
        </div>
      </div>

      {/* COLUMN 3: QMS Workforce Audit Sidebar (3 Cols) - Enhanced with Travel History & Pending Tasks */}
      <div className="xl:col-span-3 bg-slate-50 border border-slate-200 rounded-2xl p-4 flex flex-col justify-between shadow-sm">
        <div>
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider mb-2 border-b border-slate-200 pb-2">
            Workforce Audit Registry
          </h3>
          <p className="text-[10px] text-slate-500 mb-3 leading-relaxed">
            Select any inspector to inspect travel history, pending tasks, and last traveled info.
          </p>

          <div className="space-y-1.5 max-h-[220px] overflow-y-auto pr-1 mb-4">
            {normalizedInspectors.map(ins => {
              const activeCount = ins.pending_assignments?.length || 0;
              return (
                <button
                  key={ins.id}
                  onClick={() => setFocusedInspector(ins)}
                  className={`w-full text-left text-xs p-2.5 rounded-xl flex items-center justify-between border transition-all cursor-pointer ${
                    focusedInspector?.id === ins.id 
                      ? 'bg-slate-900 border-slate-900 text-white font-medium shadow-sm' 
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span className="truncate max-w-[120px] font-semibold">
                    {ins.full_name}
                  </span>
                  <span className={`px-2 py-0.5 text-[9px] rounded-full font-bold ${
                    activeCount > 0 ? 'bg-amber-100 text-amber-800' : 'bg-emerald-100 text-emerald-800'
                  }`}>
                    {activeCount > 0 ? `${activeCount} Active` : 'Available'}
                  </span>
                </button>
              );
            })}
          </div>

          {focusedInspector ? (
            <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-inner space-y-2.5 text-xs">
              <div>
                <h4 className="font-black text-slate-900 truncate">
                  {focusedInspector.full_name}
                </h4>
                <p className="text-[10px] text-slate-400 uppercase font-bold">
                  {focusedInspector.rank || focusedInspector.division || 'General Staff'}
                </p>
              </div>

              {/* Last Time Traveled */}
              <div className="bg-slate-50 p-2 rounded-lg border border-slate-100 text-[11px]">
                <span className="font-bold text-slate-700">✈️ Last Traveled:</span> <span className="text-slate-600">{focusedInspector.last_traveled_date}</span>
              </div>

              {/* Inspection / Travel History */}
              <div className="space-y-1">
                <p className="text-[10px] font-black text-slate-500 uppercase">🌍 Travel & Facility History:</p>
                <div className="flex flex-wrap gap-1">
                  {focusedInspector.travel_history && focusedInspector.travel_history.length > 0 ? (
                    focusedInspector.travel_history.map((country, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-md text-[10px] font-bold">
                        {country}
                      </span>
                    ))
                  ) : (
                    <span className="text-[10px] text-slate-400 italic">No previous foreign mission history recorded.</span>
                  )}
                </div>
              </div>

              {/* Current Pending Assignments */}
              <div className="space-y-1 pt-1 border-t border-slate-100">
                <p className="text-[10px] font-black text-slate-500 uppercase">📋 Pending Now ({focusedInspector.pending_assignments?.length || 0}):</p>
                {focusedInspector.pending_assignments && focusedInspector.pending_assignments.length > 0 ? (
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {focusedInspector.pending_assignments.map((task, idx) => (
                      <div key={idx} className="bg-amber-50/60 border border-amber-200/60 p-1.5 rounded-lg text-[10px]">
                        <p className="font-bold text-slate-800 truncate">{task.company_name || "Assigned Task"}</p>
                        <p className="text-amber-800 italic">{task.current_step_title || `File ID: #${task.application_id}`}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-[10px] text-emerald-600 font-semibold italic">No pending tasks. Fully ready for new assignment.</p>
                )}
              </div>
            </div>
          ) : (
            <div className="border border-dashed border-slate-300 rounded-xl p-4 text-center text-xs text-slate-400 italic bg-white/50 min-h-[160px] flex items-center justify-center">
              Select officer above to audit travel history and pending tasks.
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 text-[9px] text-slate-400 font-bold uppercase text-center bg-slate-100/60 -mx-4 -mb-4 p-3 rounded-b-2xl">
          High-Performer Management Protocol
        </div>
      </div>

    </div>
  );
}