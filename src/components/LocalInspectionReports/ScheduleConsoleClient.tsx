"use client";

import React, { useState, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import "leaflet/dist/leaflet.css";

const MapContainer = dynamic(() => import("react-leaflet").then(m => m.MapContainer), { ssr: false });
const TileLayer = dynamic(() => import("react-leaflet").then(m => m.TileLayer), { ssr: false });
const Marker = dynamic(() => import("react-leaflet").then(m => m.Marker), { ssr: false });
const Popup = dynamic(() => import("react-leaflet").then(m => m.Popup), { ssr: false });
const Circle = dynamic(() => import("react-leaflet").then(m => m.Circle), { ssr: false });

interface UserOption {
  id: string;
  name: string;
  rank: string;
  directorate: string;
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
  initialUsers: UserOption[];
  initialFacilities: FacilityOption[];
}

export default function ScheduleConsoleClient({ applicationId, initialUsers = [], initialFacilities = [] }: Props) {
  const [selectedRank, setSelectedRank] = useState<string>("ALL");
  const [selectedUserDirectorate, setSelectedUserDirectorate] = useState<string>("ALL");
  
  // Facility & Product Line Filters
  const [selectedFacilityCountry, setSelectedFacilityCountry] = useState<string>("ALL");
  const [selectedFacilityDirectorate, setSelectedFacilityDirectorate] = useState<string>("ALL");
  const [selectedSterility, setSelectedSterility] = useState<string>("ALL");
  const [selectedContainment, setSelectedContainment] = useState<string>("ALL");
  const [selectedClassification, setSelectedClassification] = useState<string>("ALL");

  const [selectedStaffId, setSelectedStaffId] = useState<string>("");
  const [selectedFacilityId, setSelectedFacilityId] = useState<string>("");

  const [assignedTeam, setAssignedTeam] = useState<UserOption[]>([]);
  const [assignedFacilities, setAssignedFacilities] = useState<FacilityOption[]>([]);

  const [dynamicCoords, setDynamicCoords] = useState<{ lat: number; lng: number } | null>(null);

  const [isMounted, setIsMounted] = useState(false);
  useEffect(() => {
    setIsMounted(true);
    const timer = setTimeout(() => {
      window.dispatchEvent(new Event("resize"));
    }, 250);
    return () => clearTimeout(timer);
  }, []);

  const filteredUsers = useMemo(() => {
    if (!Array.isArray(initialUsers)) return [];
    return initialUsers.filter(user => {
      if (!user) return false;
      const matchRank = selectedRank === "ALL" || user.rank === selectedRank;
      const matchDir = selectedUserDirectorate === "ALL" || user.directorate === selectedUserDirectorate;
      return matchRank && matchDir;
    });
  }, [initialUsers, selectedRank, selectedUserDirectorate]);

  // Dynamically extract unique countries across all facilities
  const availableCountries = useMemo(() => {
    const countries = new Set<string>();
    initialFacilities.forEach(f => {
      if (f.country) countries.add(f.country.trim());
    });
    return Array.from(countries);
  }, [initialFacilities]);

  console.log('availableCountries:',availableCountries)

  // Dynamically extract unique product classifications across all facilities for the dropdown
  const availableClassifications = useMemo(() => {
    const classifications = new Set<string>();
    initialFacilities.forEach(f => {
      f.product_lines?.forEach(l => {
        l.products?.forEach(p => {
          if (p.classification) classifications.add(p.classification);
        });
      });
    });
    return Array.from(classifications);
  }, [initialFacilities]);

  const filteredFacilities = useMemo(() => {
    if (!Array.isArray(initialFacilities)) return [];
    return initialFacilities.filter(facility => {
      if (!facility) return false;
      
      const matchCountry = 
        selectedFacilityCountry === "ALL" || 
        (facility.country && facility.country.trim().toLowerCase() === selectedFacilityCountry.trim().toLowerCase());
        
      const matchDir = selectedFacilityDirectorate === "ALL" || (facility.facility_type && facility.facility_type.includes(selectedFacilityDirectorate));
      
      const matchSterility = selectedSterility === "ALL" || facility.product_lines?.some(l => l.sterility_level === selectedSterility);
      const matchContainment = selectedContainment === "ALL" || facility.product_lines?.some(l => l.containment_category === selectedContainment);
      const matchClassification = selectedClassification === "ALL" || facility.product_lines?.some(l => l.products?.some(p => p.classification === selectedClassification));

      return matchCountry && matchDir && matchSterility && matchContainment && matchClassification;
    });
  }, [initialFacilities, selectedFacilityCountry, selectedFacilityDirectorate, selectedSterility, selectedContainment, selectedClassification]);

  const activeFacility = useMemo(() => {
    if (!Array.isArray(initialFacilities)) return null;
    return initialFacilities.find(f => f?.id === selectedFacilityId) || assignedFacilities[0] || initialFacilities[0] || null;
  }, [selectedFacilityId, assignedFacilities, initialFacilities]);

  useEffect(() => {
    let isMounted = true;
    
    if (activeFacility && (activeFacility.latitude == null || activeFacility.longitude == null) && activeFacility.address) {
      const addressQuery = encodeURIComponent(`${activeFacility.address}, ${activeFacility.country || ""}`);
      
      fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${addressQuery}&limit=1`, {
        headers: {
          'User-Agent': 'VMAP-Regulatory-Inspection-Console'
        }
      })
        .then(res => res.json())
        .then(data => {
          if (isMounted && data && data.length > 0) {
            setDynamicCoords({
              lat: parseFloat(data[0].lat),
              lng: parseFloat(data[0].lon)
            });
          } else {
            setDynamicCoords(null);
          }
        })
        .catch(() => {
          if (isMounted) setDynamicCoords(null);
        });
    } else {
      setDynamicCoords(null);
    }

    return () => {
      isMounted = false;
    };
  }, [activeFacility]);

  const centerLat = activeFacility?.latitude ?? dynamicCoords?.lat ?? 6.5244; 
  const centerLng = activeFacility?.longitude ?? dynamicCoords?.lng ?? 3.3792;

  const adjacentFacilities = useMemo(() => {
    if (!activeFacility || activeFacility.latitude == null || activeFacility.longitude == null || !Array.isArray(initialFacilities)) return [];
    
    return initialFacilities.filter(f => {
      if (!f || f.id === activeFacility.id || f.latitude == null || f.longitude == null) return false;
      const latDiff = Math.abs(f.latitude - activeFacility.latitude);
      const lngDiff = Math.abs(f.longitude - activeFacility.longitude);
      return latDiff < 2.0 && lngDiff < 2.0; 
    });
  }, [activeFacility, initialFacilities]);

  const handleAssignStaff = () => {
    const staff = initialUsers.find(u => u?.id === selectedStaffId);
    if (staff && !assignedTeam.some(s => s?.id === staff.id)) {
      if (assignedTeam.length >= 3) {
        alert("Foreign inspection team cannot exceed 3 members.");
        return;
      }
      setAssignedTeam([...assignedTeam, staff]);
      setSelectedStaffId("");
    }
  };

  const handleDeassignStaff = (id: string) => {
    setAssignedTeam(assignedTeam.filter(s => s?.id !== id));
  };

  const handleAssignFacility = () => {
    const facility = initialFacilities.find(f => f?.id === selectedFacilityId);
    if (facility && !assignedFacilities.some(f => f?.id === facility.id)) {
      setAssignedFacilities([...assignedFacilities, facility]);
    }
  };

  const handleDeassignFacility = (id: string) => {
    setAssignedFacilities(assignedFacilities.filter(f => f?.id !== id));
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 p-6 max-w-7xl mx-auto">
      
      <div className="lg:col-span-5 space-y-6">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            👥 Inspection Team Builder (2 - 3 Staff)
          </h3>
          
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Rank</label>
              <select
                value={selectedRank}
                onChange={(e) => setSelectedRank(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Ranks</option>
                <option value="ACRO">ACRO</option>
                <option value="RO">RO</option>
                <option value="SRO">SRO</option>
                <option value="Principal">Principal</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Directorate</label>
              <select
                value={selectedUserDirectorate}
                onChange={(e) => setSelectedUserDirectorate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Directorates</option>
                <option value="VMAP">VMAP</option>
                <option value="IRSD">IRSD</option>
                <option value="VMD">VMD</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">-- Select Staff Member --</option>
              {filteredUsers.map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.rank} / {u.directorate})
                </option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedStaffId}
              onClick={handleAssignStaff}
              className="px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Assign
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700">Assigned Team Members:</p>
            {assignedTeam.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No staff assigned to batch yet.</p>
            ) : (
              assignedTeam.map((member, idx) => (
                <div key={member.id} className="flex justify-between items-center bg-slate-50 p-2 rounded border border-slate-200 text-xs">
                  <div>
                    <span className="font-bold text-slate-900">{idx === 0 ? "⭐ Lead: " : "Co-Inspector: "}</span>
                    {member.name} <span className="text-slate-500">({member.rank})</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeassignStaff(member.id)}
                    className="text-rose-600 hover:text-rose-800 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Granular Facility & Product Line Filters */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-4">
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800">
            🏭 Target Foreign Facilities & Product Line Filters
          </h3>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Country</label>
              <select
                value={selectedFacilityCountry}
                onChange={(e) => setSelectedFacilityCountry(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Countries</option>
                {availableCountries.map(country => (
                  <option key={country} value={country}>{country}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Filter by Facility Type</label>
              <select
                value={selectedFacilityDirectorate}
                onChange={(e) => setSelectedFacilityDirectorate(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Types</option>
                <option value="Veterinary">Veterinary Pharmaceuticals</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Sterility Level</label>
              <select
                value={selectedSterility}
                onChange={(e) => setSelectedSterility(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Sterility Levels</option>
                <option value="Sterile">Sterile</option>
                <option value="Non-Sterile">Non-Sterile</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">Containment Category</label>
              <select
                value={selectedContainment}
                onChange={(e) => setSelectedContainment(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
              >
                <option value="ALL">All Categories</option>
                <option value="Standard General Facility">Standard General Facility</option>
                <option value="High Containment">High Containment</option>
                <option value="Beta-Lactams">Beta-Lactams</option>
                <option value="Hormones/Cytotoxics">Hormones/Cytotoxics</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Product Classification</label>
            <select
              value={selectedClassification}
              onChange={(e) => setSelectedClassification(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="ALL">All Product Classifications</option>
              {availableClassifications.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>

          <div className="flex gap-2 pt-2">
            <select
              value={selectedFacilityId}
              onChange={(e) => setSelectedFacilityId(e.target.value)}
              className="flex-1 text-xs border border-slate-300 rounded-lg p-2 bg-white"
            >
              <option value="">-- Select Filtered Facility --</option>
              {filteredFacilities.map(f => (
                <option key={f.id} value={f.id}>{f.name} ({f.country})</option>
              ))}
            </select>
            <button
              type="button"
              disabled={!selectedFacilityId}
              onClick={handleAssignFacility}
              className="px-3 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg transition-colors cursor-pointer"
            >
              Add
            </button>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-100">
            <p className="text-xs font-bold text-slate-700">Batch Inspection Itinerary:</p>
            {assignedFacilities.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No facilities added to batch itinerary.</p>
            ) : (
              assignedFacilities.map(fac => (
                <div key={fac.id} className="flex justify-between items-center bg-emerald-50 p-2 rounded border border-emerald-200 text-xs">
                  <div>
                    <span className="font-bold text-emerald-900">{fac.name}</span>
                    <div className="text-[10px] text-slate-600">{fac.address}, {fac.country}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeassignFacility(fac.id)}
                    className="text-rose-600 hover:text-rose-800 font-bold px-1"
                  >
                    ✕
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

     <div className="lg:col-span-7 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col">
        <h3 className="text-sm font-bold uppercase tracking-wider text-slate-800 mb-3">
          🗺️ Geographic Cluster & Proximity Radar
        </h3>

        <div className="h-[480px] w-full rounded-lg overflow-hidden border border-slate-300 relative z-0">
          {isMounted ? (
            <MapContainer
              key={`${centerLat}-${centerLng}`}
              center={[centerLat, centerLng]}
              zoom={6}
              style={{ height: "100%", width: "100%" }}
              className="w-full h-full"
            >
              <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
              />

              {activeFacility && (activeFacility.latitude != null || dynamicCoords) && activeFacility.longitude != null && (
                <Marker position={[centerLat, centerLng]}>
                  <Popup>
                    <div className="text-xs">
                      <strong>{activeFacility.name}</strong><br />
                      {activeFacility.address}<br />
                      <span className="text-blue-600 font-bold">[Primary Target]</span>
                    </div>
                  </Popup>
                </Marker>
              )}

              {activeFacility && (activeFacility.latitude != null || dynamicCoords) && activeFacility.longitude != null && (
                <Circle
                  center={[centerLat, centerLng]}
                  radius={50000} 
                  pathOptions={{ color: 'emerald', fillColor: 'emerald', fillOpacity: 0.1 }}
                />
              )}

              {adjacentFacilities.map(adj => (
                adj && adj.latitude != null && adj.longitude != null && (
                  <Marker key={adj.id} position={[adj.latitude, adj.longitude]}>
                    <Popup>
                      <div className="text-xs">
                        <strong>{adj.name}</strong> (Nearby)<br />
                        {adj.address}<br />
                        <button
                          type="button"
                          onClick={() => {
                            if (!assignedFacilities.some(f => f?.id === adj.id)) {
                              setAssignedFacilities([...assignedFacilities, adj]);
                            }
                          }}
                          className="mt-1 px-2 py-1 bg-emerald-600 text-white rounded text-[10px] font-bold"
                        >
                          + Add to Batch
                        </button>
                      </div>
                    </Popup>
                  </Marker>
                )
              ))}
            </MapContainer>
          ) : (
            <div className="flex items-center justify-center h-full bg-slate-100 text-slate-400 text-xs">
              Loading Geospatial Map Interface...
            </div>
          )}
        </div>

        <div className="mt-4 pt-3 border-t border-slate-200 flex justify-between items-center">
          <p className="text-xs text-slate-500">
            💡 Click on adjacent pins on the map to instantly add clustered facilities to the mission itinerary.
          </p>
          <button
            type="button"
            disabled={assignedTeam.length === 0 || assignedFacilities.length === 0}
            onClick={() => alert("Inspection batch schedule successfully committed!")}
            className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white text-xs font-bold rounded-lg shadow-sm transition-all cursor-pointer"
          >
            🚀 Finalize & Dispatch Mission Orders
          </button>
        </div>
      </div>

    </div>
  );
}