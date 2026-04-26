import PerformanceView from "@/components/management/PerformanceView";
import { getGlobalDirectoratePerformance } from "@/lib/actions/performance";

export default async function LODPerformancePage() {
  const data = await getGlobalDirectoratePerformance();
  return <PerformanceView performanceList={data} />;
}