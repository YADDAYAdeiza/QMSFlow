// app/dashboard/vetstat/page.tsx
import { getAMSRegionalAnalytics } from "@/lib/actions/Vetstat/fetchAnalytics";
import NigeriaMap from "@/components/Vetstat/NigeriaMap";
import AMSDashboard from "@/components/Vetstat/AMSDashboard";

export default async function VetstatAnalyticsPage() {
  const analytics = await getAMSRegionalAnalytics();

  return (
    <div className="max-w-7xl mx-auto py-10">
      <div className="flex justify-between items-end mb-8 px-6">
        <div>
          <h1 className="text-4xl font-black text-slate-900 tracking-tighter">
            VMD Surveillance Hub
          </h1>
          <p className="text-slate-500 font-bold">Real-time Antimicrobial Load (Nigeria)</p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* The Interactive Map takes up 2/3 of the width */}
        <div className="xl:col-span-2 bg-white rounded-[3rem] shadow-xl border border-slate-100 p-8">
           <NigeriaMap zoneData={analytics.zones} />
        </div>

        {/* Sidebar for Species Breakdown & Totals */}
        <div className="space-y-6">
           <AMSDashboard data={analytics.raw} />
        </div>
      </div>
    </div>
  );
}