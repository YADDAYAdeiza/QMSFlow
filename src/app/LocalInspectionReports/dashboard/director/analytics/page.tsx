// @/app/dashboard/director/analytics/page.tsx
"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import ExecutiveDashboardHeader from "@/components/LocalInspectionReports/ExecutiveDashboardHeader";

interface AnalyticsData {
  qualityDeficits: Array<{
    qualitySystem: string;
    criticalCount: number;
    majorCount: number;
    otherCount: number;
    totalCount: number;
  }>;
  rootCauses: Array<{
    rootCauseCategory: string;
    count: number;
    percentage: number;
  }>;
  capaVelocity: {
    totalCapaRequired: number;
    closedCapaCount: number;
    pendingCapaCount: number;
    avgTurnaroundDays: number;
    compliance30DayRate: number;
  };
}

const SEVERITY_COLORS = {
  critical: "#ef4444",
  major: "#f59e0b",
  other: "#38bdf8",
};

const ROOT_CAUSE_PALETTE = [
  "#0f172a",
  "#0284c7",
  "#059669",
  "#d97706",
  "#64748b",
];

export default function AnalyticsDashboardPage() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // 🎯 Dynamic Filter States
  const [timeframe, setTimeframe] = useState<string>("YTD");
  const [inspectionType, setInspectionType] = useState<string>("ALL");

  // Fetch analytics whenever filters change
  const fetchAnalytics = useCallback(async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        timeframe,
        inspectionType,
      }).toString();

      const res = await fetch(`/api/LocalInspectionReports/analytics/dashboard?${queryParams}`);
      const outcome = await res.json();
      if (outcome.success) {
        setData(outcome.data);
      }
    } catch (err) {
      console.error("Failed to load filtered analytics data:", err);
    } finally {
      setIsLoading(false);
    }
  }, [timeframe, inspectionType]);

  useEffect(() => {
    fetchAnalytics();
  }, [fetchAnalytics]);

  const qualityDeficits = data?.qualityDeficits || [];
  const rootCauses = data?.rootCauses || [];
  const capa = data?.capaVelocity || {
    totalCapaRequired: 0,
    closedCapaCount: 0,
    pendingCapaCount: 0,
    avgTurnaroundDays: 0,
    compliance30DayRate: 0,
  };

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-6 bg-slate-50 min-h-screen">
      {/* 1. Header with Export Button */}
      <ExecutiveDashboardHeader />

      {/* 2. Dynamic Filter Control Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-slate-700 text-sm font-semibold">
          <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
          </svg>
          <span>Analytics Filter Controls:</span>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Timeframe Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Period:</label>
            <select
              value={timeframe}
              onChange={(e) => setTimeframe(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="YTD">Year to Date (YTD 2026)</option>
              <option value="Q1">Q1 (Jan - Mar 2026)</option>
              <option value="Q2">Q2 (Apr - Jun 2026)</option>
              <option value="Q3">Q3 (Jul - Sep 2026)</option>
              <option value="ALL">All Time</option>
            </select>
          </div>

          {/* Inspection Type Selector */}
          <div className="flex items-center gap-2">
            <label className="text-xs font-medium text-slate-500">Audit Type:</label>
            <select
              value={inspectionType}
              onChange={(e) => setInspectionType(e.target.value)}
              className="bg-slate-50 border border-slate-200 text-slate-800 text-xs font-medium rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-slate-900"
            >
              <option value="ALL">All Inspection Types</option>
              <option value="PRI">Pre-Registration Inspection (PRI)</option>
              <option value="ROUTINE">Routine Renewal Audit</option>
              <option value="FOLLOW_UP">CAPA Follow-Up Audit</option>
            </select>
          </div>

          {/* Reset Filters */}
          {(timeframe !== "YTD" || inspectionType !== "ALL") && (
            <button
              onClick={() => {
                setTimeframe("YTD");
                setInspectionType("ALL");
              }}
              className="text-xs text-sky-600 hover:text-sky-800 font-medium underline ml-2"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* 3. Executive KPI Cards */}
      <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Avg CAPA Velocity
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {capa.avgTurnaroundDays || 0} <span className="text-sm font-normal text-slate-500">Days</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Target: &le; 30 Days Statutory Limit
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            30-Day CAPA Compliance
          </div>
          <div className="text-3xl font-extrabold text-emerald-600 mt-2">
            {capa.compliance30DayRate || 0}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Closed on schedule
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Active CAPAs Pending
          </div>
          <div className="text-3xl font-extrabold text-amber-600 mt-2">
            {capa.pendingCapaCount || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Awaiting facility submission
          </p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm">
          <div className="text-xs font-bold uppercase tracking-wider text-slate-400">
            Total CAPAs Issued
          </div>
          <div className="text-3xl font-extrabold text-slate-900 mt-2">
            {capa.totalCapaRequired || 0}
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Across audited sites
          </p>
        </div>
      </div>

      {/* 4. Recharts Section */}
      <div className={`grid grid-cols-1 lg:grid-cols-3 gap-6 transition-opacity ${isLoading ? "opacity-50" : "opacity-100"}`}>
        
        {/* Quality System Deficit Stacked Bar Chart (2 Columns) */}
        <div className="lg:col-span-2 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900">
                Quality System Deficit Severity Breakdown
              </h2>
              <p className="text-xs text-slate-500">
                Filtered by Period: <strong>{timeframe}</strong> | Type: <strong>{inspectionType}</strong>
              </p>
            </div>
          </div>

          {qualityDeficits.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm italic">
              No observation findings recorded for the selected filter parameters.
            </div>
          ) : (
            <div className="h-[340px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={qualityDeficits}
                  margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis
                    dataKey="qualitySystem"
                    tick={{ fontSize: 11, fill: "#64748b" }}
                    interval={0}
                    angle={-15}
                    textAnchor="end"
                  />
                  <YAxis tick={{ fontSize: 11, fill: "#64748b" }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    itemStyle={{ color: "#fff" }}
                  />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    wrapperStyle={{ fontSize: "12px", paddingBottom: "10px" }}
                  />
                  <Bar
                    dataKey="criticalCount"
                    name="Critical"
                    stackId="a"
                    fill={SEVERITY_COLORS.critical}
                  />
                  <Bar
                    dataKey="majorCount"
                    name="Major"
                    stackId="a"
                    fill={SEVERITY_COLORS.major}
                  />
                  <Bar
                    dataKey="otherCount"
                    name="Other"
                    stackId="a"
                    fill={SEVERITY_COLORS.other}
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Root Cause Donut Chart (1 Column) */}
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
          <div className="mb-4">
            <h2 className="text-lg font-bold text-slate-900">
              Primary Failure Root Causes
            </h2>
            <p className="text-xs text-slate-500">
              Distribution of underlying drivers
            </p>
          </div>

          {rootCauses.length === 0 ? (
            <div className="h-[320px] flex items-center justify-center text-slate-400 text-sm italic">
              No root cause data logged.
            </div>
          ) : (
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={rootCauses}
                    dataKey="count"
                    nameKey="rootCauseCategory"
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                  >
                    {rootCauses.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={ROOT_CAUSE_PALETTE[index % ROOT_CAUSE_PALETTE.length]}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      border: "none",
                      borderRadius: "8px",
                      color: "#fff",
                      fontSize: "12px",
                    }}
                    formatter={(value: any, name: any, item: any) => [
                      `${value} Observations (${item.payload.percentage}%)`,
                      name,
                    ]}
                  />
                </PieChart>
              </ResponsiveContainer>

              <div className="mt-2 space-y-1.5 max-h-[100px] overflow-y-auto pr-1">
                {rootCauses.map((rc, idx) => (
                  <div key={idx} className="flex justify-between items-center text-xs">
                    <div className="flex items-center gap-2">
                      <span
                        className="w-2.5 h-2.5 rounded-full"
                        style={{
                          backgroundColor:
                            ROOT_CAUSE_PALETTE[idx % ROOT_CAUSE_PALETTE.length],
                        }}
                      />
                      <span className="text-slate-700 font-medium">
                        {rc.rootCauseCategory}
                      </span>
                    </div>
                    <span className="font-bold text-slate-900">{rc.percentage}%</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}