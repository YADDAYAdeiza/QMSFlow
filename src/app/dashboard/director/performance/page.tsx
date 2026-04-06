import PerformanceView from "@/components/management/PerformanceView";
import { getGlobalDirectoratePerformance } from "@/lib/actions/performance";

export default async function DirectorPerformancePage() {
  const data = await getGlobalDirectoratePerformance();
  return <PerformanceView performanceList={data} />;
}