// app/dashboard/lod/analytics/page.tsx
import AnalyticsView from "@/components/management/AnalyticsView";
import { getGMPHealthReport } from "@/lib/actions/analytics";

/**
 * LOD Analytics Page
 * Provides the Liaison Office with a high-level overview of National GMP Health
 * derived from the VMAP findings ledger.
 */
export default async function LODAnalyticsPage() {
  // 1. Fetch the aggregate GMP data from the server action
  // This looks into applications.details -> findings_ledger
  const stats = await getGMPHealthReport();

  // 2. Render the shared Management View
  // We wrap it in a simple container to ensure it respects the LOD layout padding
  return (
    <div className="animate-in fade-in duration-500">
      <AnalyticsView stats={stats} />
    </div>
  );
}