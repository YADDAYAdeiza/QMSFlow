// lib/actions/performance.ts
import { db } from "@/db";
import { qmsTimelines } from "@/db/schema";
import { isNotNull, desc } from "drizzle-orm";

/**
 * Fetches and aggregates QMS performance metrics for the entire Directorate.
 * Used by both the Director and LOD to monitor staff throughput.
 */
export async function getGlobalDirectoratePerformance() {
  try {
    // 1. Fetch all segments that have been completed (endTime is not null)
    // We pull across all divisions for a unified Directorate view.
    const segments = await db.query.qmsTimelines.findMany({
      where: isNotNull(qmsTimelines.endTime),
      orderBy: [desc(qmsTimelines.endTime)],
    });

    if (!segments || segments.length === 0) {
      return [];
    }

    // 2. Aggregate data by Staff ID using a Reducer
    const staffStats = segments.reduce((acc: any, curr) => {
      const sId = curr.staffId || "Unknown Staff";
      
      // Calculate the difference in milliseconds
      const startTime = curr.startTime?.getTime() || 0;
      const endTime = curr.endTime?.getTime() || 0;
      const rawDuration = endTime - startTime;

      /**
       * SAFETY CHECK: Math.max(0, rawDuration)
       * This prevents "Negative Duration" errors if DB timestamps are swapped.
       * If rawDuration is negative, it defaults to 0.
       */
      const duration = Math.max(0, rawDuration);

      if (!acc[sId]) {
        acc[sId] = {
          id: sId,
          division: curr.division || "UNASSIGNED",
          totalDuration: 0,
          taskCount: 0,
          lastActive: curr.endTime,
        };
      }

      acc[sId].totalDuration += duration;
      acc[sId].taskCount += 1;
      
      // Update lastActive if this segment is more recent
      if (curr.endTime && curr.endTime > acc[sId].lastActive) {
        acc[sId].lastActive = curr.endTime;
      }

      return acc;
    }, {});

    // 3. Convert the object back into an array and Sort
    // We sort by highest taskCount first so the most active staff appear at the top.
    const performanceList = Object.values(staffStats).sort((a: any, b: any) => {
      return b.taskCount - a.taskCount;
    });

    return performanceList;

  } catch (error) {
    console.error("Critical Error in getGlobalDirectoratePerformance:", error);
    return [];
  }
}