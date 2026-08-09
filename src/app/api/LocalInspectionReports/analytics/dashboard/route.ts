// @/app/api/analytics/dashboard/route.ts
import { NextResponse } from "next/server";
import { getQualitySystemDeficits, getRootCauseDistribution, getCapaVelocityMetrics } from "@/lib/LocalInspectionReports/analytics/inspectionAnalytics";

export async function GET() {
  try {
    const [qualityDeficits, rootCauses, capaVelocity] = await Promise.all([
      getQualitySystemDeficits(),
      getRootCauseDistribution(),
      getCapaVelocityMetrics(),
    ]);

    return NextResponse.json({
      success: true,
      data: {
        qualityDeficits,
        rootCauses,
        capaVelocity,
      },
    });
  } catch (error: any) {
    console.error("ANALYTICS_FETCH_ERROR:", error);
    return NextResponse.json(
      { success: false, error: "Failed to aggregate regulatory intelligence data." },
      { status: 500 }
    );
  }
}