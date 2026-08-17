"use client";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell,
} from "recharts";

// ─── Sample vitals trend data ───────────────────────────────────────
const vitalsTrendData = [
  { month: "Feb", systolic: 124, diastolic: 80, bmi: 23.4 },
  { month: "Mar", systolic: 121, diastolic: 78, bmi: 23.1 },
  { month: "Apr", systolic: 119, diastolic: 77, bmi: 22.8 },
  { month: "May", systolic: 118, diastolic: 76, bmi: 22.6 },
  { month: "Jun", systolic: 116, diastolic: 75, bmi: 22.3 },
  { month: "Jul", systolic: 115, diastolic: 74, bmi: 22.0 },
];

const activityData = [
  { month: "Feb", records: 2 },
  { month: "Mar", records: 1 },
  { month: "Apr", records: 4 },
  { month: "May", records: 2 },
  { month: "Jun", records: 3 },
  { month: "Jul", records: 1 },
];

// ─── Tooltip styling shared config ──────────────────────────────────
const tooltipStyle = {
  contentStyle: {
    borderRadius: "10px",
    border: "1px solid #E2E8F0",
    fontSize: "12px",
    fontFamily: "'Noto Sans', sans-serif",
    boxShadow: "0 4px 6px -1px rgba(15,23,42,0.08)",
    color: "#0F172A",
  },
  itemStyle: { color: "#475569" },
  labelStyle: { fontWeight: 700, color: "#0F172A", marginBottom: "4px" },
};

// ─────────────────────────────────────────────────────────────────────
// Blood Pressure Trend Chart
// ─────────────────────────────────────────────────────────────────────
export function BloodPressureChart() {
  return (
    <ResponsiveContainer width="100%" height={140}>
      <AreaChart
        data={vitalsTrendData}
        margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
      >
        <defs>
          <linearGradient id="systolicGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#0891B2" stopOpacity={0.12} />
            <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
          </linearGradient>
          <linearGradient id="diastolicGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#22C55E" stopOpacity={0.1} />
            <stop offset="95%" stopColor="#22C55E" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid
          strokeDasharray="3 3"
          stroke="#E2E8F0"
          vertical={false}
        />
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
          domain={[60, 140]}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value, name) => [
            `${value} mmHg`,
            name === "systolic" ? "Systolic" : "Diastolic",
          ]}
        />
        <Area
          type="monotone"
          dataKey="systolic"
          stroke="#0891B2"
          strokeWidth={2}
          fill="url(#systolicGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#0891B2", stroke: "#fff", strokeWidth: 2 }}
        />
        <Area
          type="monotone"
          dataKey="diastolic"
          stroke="#22C55E"
          strokeWidth={1.5}
          fill="url(#diastolicGrad)"
          dot={false}
          activeDot={{ r: 4, fill: "#22C55E", stroke: "#fff", strokeWidth: 2 }}
          strokeDasharray="4 2"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

// ─────────────────────────────────────────────────────────────────────
// Monthly Records Activity Bar Chart
// ─────────────────────────────────────────────────────────────────────
export function RecordsActivityChart() {
  return (
    <ResponsiveContainer width="100%" height={80}>
      <BarChart
        data={activityData}
        margin={{ top: 4, right: 4, left: -28, bottom: 0 }}
        barCategoryGap="35%"
      >
        <XAxis
          dataKey="month"
          tick={{ fontSize: 10, fill: "#94A3B8", fontFamily: "JetBrains Mono" }}
          axisLine={false}
          tickLine={false}
        />
        <Tooltip
          {...tooltipStyle}
          formatter={(value) => [`${value} records`, "Uploads"]}
        />
        <Bar dataKey="records" radius={[3, 3, 0, 0]}>
          {activityData.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={entry.records === Math.max(...activityData.map((d) => d.records))
                ? "#0891B2"
                : "#E2E8F0"
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
