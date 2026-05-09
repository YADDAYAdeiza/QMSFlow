import NigeriaMap from "@/components/Vetstat/NigeriaMap";

export default function MapTestPage() {
  // Mock Data: Simulating high pressure in the South-West and North-West
  const mockAnalytics = [
    { zone: "South-West", value: 1500 }, // Deep Navy
    { zone: "North-West", value: 800 },  // Mid Blue
    { zone: "North-Central", value: 400 }, // Light Blue
    { zone: "South-South", value: 150 }, // Very Light Blue
    { zone: "North-East", value: 50 },   // Near White
    { zone: "South-East", value: 0 },    // Slate/Empty
  ];

  return (
    <div className="p-10 bg-slate-100 min-h-screen">
      <div className="max-w-4xl mx-auto bg-white p-10 rounded-[3rem] shadow-2xl">
        <h1 className="text-2xl font-black mb-2 tracking-tighter">Surveillance Test Rig</h1>
        <p className="text-slate-500 mb-8 font-bold">Testing Geopolitical Heatmap Rendering...</p>
        
        <div className="border border-slate-100 rounded-3xl p-4">
          <NigeriaMap zoneData={mockAnalytics} />
        </div>

        <div className="mt-8 grid grid-cols-2 gap-4 text-[10px] font-mono bg-slate-50 p-4 rounded-xl">
           <div>SW: 1500 (Expected: Deep Blue)</div>
           <div>SE: 0 (Expected: Grey/Slate)</div>
        </div>
      </div>
    </div>
  );
}