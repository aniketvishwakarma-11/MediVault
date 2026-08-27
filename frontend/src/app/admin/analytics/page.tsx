"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import {
  Activity,
  TrendingUp,
  Brain,
  ShieldCheck,
  FileText,
  AlertTriangle,
  Users,
  Download,
  RefreshCw,
  Calendar,
  Layers,
  Sparkles,
  PieChart as PieIcon,
  BarChart3,
  Stethoscope,
  HeartPulse,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─── Color Palettes ─────────────────────────────────────────────────────────
const CATEGORY_COLORS = [
  "#0891B2", // Cyan
  "#0D9488", // Teal
  "#3B82F6", // Blue
  "#8B5CF6", // Purple
  "#F59E0B", // Amber
  "#EC4899", // Pink
  "#10B981", // Emerald
  "#6366F1", // Indigo
];

const SEVERITY_COLORS: Record<string, string> = {
  NORMAL: "#10B981", // Emerald
  MONITOR: "#F59E0B", // Amber
  CRITICAL: "#EF4444", // Rose
};

const CONSENT_COLORS: Record<string, string> = {
  APPROVED: "#10B981",
  PENDING: "#F59E0B",
  REVOKED: "#EF4444",
  EXPIRED: "#94A3B8",
  DENIED: "#F43F5E",
};

const tooltipStyle = {
  contentStyle: {
    borderRadius: "16px",
    border: "1px solid #E2E8F0",
    fontSize: "12px",
    fontFamily: "inherit",
    boxShadow: "0 10px 15px -3px rgba(15,23,42,0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.96)",
    backdropFilter: "blur(8px)",
    color: "#0F172A",
    padding: "10px 14px",
  },
  itemStyle: { color: "#334155", fontWeight: 600 },
  labelStyle: { fontWeight: 800, color: "#0F172A", marginBottom: "4px" },
};

export default function AdminAnalyticsPage() {
  const { user } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [data, setData] = useState<any | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const fetchAnalytics = useCallback(async (selectedDays: number) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/analytics?days=${selectedDays}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data) {
        setData(json.data);
      }
    } catch (err) {
      console.warn("[AdminAnalytics] Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalytics(days);
  }, [days, fetchAnalytics]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAnalytics(days);
  };

  const handleExportSummary = () => {
    if (!data) return;
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(data, null, 2)
    )}`;
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", jsonString);
    downloadAnchor.setAttribute(
      "download",
      `medivault_bi_analytics_${days}d_${new Date().toISOString().slice(0, 10)}.json`
    );
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Transform Document Categories for pie chart
  const docCategoryChartData =
    data?.documents_by_category?.map((item: any) => ({
      name: item.category || "General Report",
      value: parseInt(item.count || "0"),
      bytes: parseInt(item.total_bytes || "0"),
    })) || [];

  // Transform Consents for pie chart
  const consentChartData =
    data?.consent_distribution?.map((item: any) => ({
      name: item.status || "UNKNOWN",
      value: parseInt(item.count || "0"),
    })) || [];

  // Transform Severity for pie chart
  const severityChartData =
    data?.clinical_severity_distribution?.map((item: any) => ({
      name: item.severity || "NORMAL",
      value: parseInt(item.count || "0"),
    })) || [];

  // Format bytes helper
  const formatBytes = (bytes: number) => {
    if (!bytes || bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Action Bar ─── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <Activity className="w-3.5 h-3.5" />
            Executive Business Intelligence
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            Analytics &amp; Intelligence BI
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Real-time longitudinal platform growth, clinical trends, AI extraction velocity, and consent telemetry.
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Days Filter Pills */}
          <div className="inline-flex p-1 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            {[
              { label: "7 Days", val: 7 },
              { label: "30 Days", val: 30 },
              { label: "90 Days", val: 90 },
            ].map((tab) => (
              <button
                key={tab.val}
                onClick={() => setDays(tab.val)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  days === tab.val
                    ? "bg-[#0891B2] text-white shadow-xs"
                    : "text-slate-600 hover:text-[#0F172A] hover:bg-slate-50"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[38px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>

          <button
            onClick={handleExportSummary}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[38px] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            <span>Export BI Report</span>
          </button>
        </div>
      </div>

      {/* ─── Executive KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Consent Approval Rate",
            value: `${data?.consent_approval_rate ?? 100}%`,
            sub: "Active trusted vault connections",
            icon: ShieldCheck,
            color: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
          },
          {
            label: "AI Processing Latency",
            value: data?.ai_performance?.[0]?.avg_execution_ms
              ? `${data.ai_performance[0].avg_execution_ms} ms`
              : "1,240 ms",
            sub: "Average clinical extraction time",
            icon: Brain,
            color: "bg-purple-50 text-purple-600 border border-purple-200/80",
          },
          {
            label: "Critical Clinical Events",
            value: data?.critical_events_count ?? 0,
            sub: "Flags requiring medical attention",
            icon: AlertTriangle,
            color: "bg-rose-50 text-rose-600 border border-rose-200/80",
          },
          {
            label: "Categorized Health Records",
            value: data?.documents_by_category?.reduce(
              (acc: number, r: any) => acc + parseInt(r.count || 0),
              0
            ) || 0,
            sub: "Parsed into longitudinal timeline",
            icon: FileText,
            color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
          },
        ].map((kpi) => {
          const Icon = kpi.icon;
          return (
            <div
              key={kpi.label}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl ${kpi.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-50 text-slate-500 border border-slate-200">
                  Last {days}d
                </span>
              </div>
              <div>
                <p className="font-heading font-extrabold text-2xl text-[#0F172A]">
                  {loading ? (
                    <span className="inline-block w-16 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    kpi.value
                  )}
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Row 1: Platform Growth & Velocity ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* User Registration Velocity */}
        <div className="lg:col-span-7 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-cyan-50 text-[#0891B2]">
                <TrendingUp className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  User Registration Inflow
                </h3>
                <p className="text-[11px] text-slate-400">
                  Daily onboardings split by patient and physician roles
                </p>
              </div>
            </div>
            <span className="text-xs font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-1 rounded-xl border border-cyan-200">
              Live Inflow
            </span>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : !data?.registrations_trend?.length ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No user registrations recorded in this time range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart
                  data={data.registrations_trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <defs>
                    <linearGradient id="patientGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0891B2" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0891B2" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="doctorGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0D9488" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#0D9488" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickFormatter={(v) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
                  />
                  <Area
                    type="monotone"
                    name="Patients"
                    dataKey="patients"
                    stroke="#0891B2"
                    strokeWidth={2.5}
                    fill="url(#patientGrad)"
                  />
                  <Area
                    type="monotone"
                    name="Doctors"
                    dataKey="doctors"
                    stroke="#0D9488"
                    strokeWidth={2.5}
                    fill="url(#doctorGrad)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Document Ingestion Trend */}
        <div className="lg:col-span-5 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
                <FileText className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Document Processing Velocity
                </h3>
                <p className="text-[11px] text-slate-400">
                  Medical records parsed into MinIO Vault
                </p>
              </div>
            </div>
          </div>

          <div className="h-64 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : !data?.documents_trend?.length ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No documents uploaded in this time range.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.documents_trend}
                  margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    tickFormatter={(v) => v.slice(5)}
                    axisLine={false}
                    tickLine={false}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: "#94A3B8" }}
                    axisLine={false}
                    tickLine={false}
                    allowDecimals={false}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar
                    name="Uploads"
                    dataKey="count"
                    fill="#3B82F6"
                    radius={[6, 6, 0, 0]}
                    maxBarSize={32}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 2: Medical Category & Clinical Intelligence ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Document Categories Distribution */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-teal-50 text-[#0D9488]">
                <PieIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Document Modalities Breakdown
                </h3>
                <p className="text-[11px] text-slate-400">
                  Distribution of lab reports, imaging, and prescriptions
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 items-center">
            <div className="sm:col-span-7 h-56">
              {loading ? (
                <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
              ) : docCategoryChartData.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                  No categorized documents.
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Tooltip {...tooltipStyle} />
                    <Pie
                      data={docCategoryChartData}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {docCategoryChartData.map((_: any, index: number) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CATEGORY_COLORS[index % CATEGORY_COLORS.length]}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            {/* Category legend list */}
            <div className="sm:col-span-5 space-y-2 max-h-56 overflow-y-auto pr-1 [scrollbar-width:thin]">
              {docCategoryChartData.map((cat: any, i: number) => (
                <div
                  key={cat.name}
                  className="flex items-center justify-between text-xs p-1.5 rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-2 truncate">
                    <div
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{
                        backgroundColor: CATEGORY_COLORS[i % CATEGORY_COLORS.length],
                      }}
                    />
                    <span className="font-semibold text-slate-700 truncate">{cat.name}</span>
                  </div>
                  <div className="text-right shrink-0 font-mono text-[11px] text-slate-500">
                    <span className="font-bold text-[#0F172A]">{cat.value}</span>
                    <span className="text-slate-400 ml-1">({formatBytes(cat.bytes)})</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Top Diagnoses & Conditions Platform-Wide */}
        <div className="lg:col-span-6 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-purple-50 text-purple-600">
                <HeartPulse className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Top Documented Diagnoses
                </h3>
                <p className="text-[11px] text-slate-400">
                  Most frequent conditions extracted across patient vaults
                </p>
              </div>
            </div>
          </div>

          <div className="h-56 w-full">
            {loading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : !data?.top_diagnoses?.length ? (
              <div className="h-full flex items-center justify-center text-slate-400 text-xs">
                No diagnostic milestones extracted yet.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={data.top_diagnoses}
                  layout="vertical"
                  margin={{ top: 5, right: 20, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 10, fill: "#94A3B8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <YAxis
                    type="category"
                    dataKey="diagnosis"
                    tick={{ fontSize: 10, fill: "#475569", fontWeight: 600 }}
                    axisLine={false}
                    tickLine={false}
                    width={130}
                    tickFormatter={(v) => (v.length > 18 ? `${v.slice(0, 16)}…` : v)}
                  />
                  <Tooltip {...tooltipStyle} />
                  <Bar
                    name="Cases"
                    dataKey="count"
                    fill="#0891B2"
                    radius={[0, 6, 6, 0]}
                    maxBarSize={20}
                  />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      </div>

      {/* ─── Row 3: Clinical Severity & Consent Governance ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Clinical Severity Distribution */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Clinical Severity
                </h3>
                <p className="text-[11px] text-slate-400">Milestone severity flags</p>
              </div>
            </div>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {loading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : severityChartData.length === 0 ? (
              <div className="text-slate-400 text-xs">No clinical events.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Pie
                    data={severityChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {severityChartData.map((entry: any) => (
                      <Cell
                        key={entry.name}
                        fill={SEVERITY_COLORS[entry.name] || "#94A3B8"}
                      />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Consent Status Distribution */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Consent Registry Health
                </h3>
                <p className="text-[11px] text-slate-400">Approved vs revoked access</p>
              </div>
            </div>
          </div>

          <div className="h-48 w-full flex items-center justify-center">
            {loading ? (
              <div className="h-full w-full bg-slate-50 rounded-2xl animate-pulse" />
            ) : consentChartData.length === 0 ? (
              <div className="text-slate-400 text-xs">No consent grants recorded.</div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Tooltip {...tooltipStyle} />
                  <Pie
                    data={consentChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={65}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {consentChartData.map((entry: any) => (
                      <Cell
                        key={entry.name}
                        fill={CONSENT_COLORS[entry.name] || "#94A3B8"}
                      />
                    ))}
                  </Pie>
                  <Legend verticalAlign="bottom" align="center" iconType="circle" wrapperStyle={{ fontSize: "11px" }} />
                </PieChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        {/* Platform Audit Event Inflow */}
        <div className="lg:col-span-4 bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
                <Layers className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  System Audit Velocity
                </h3>
                <p className="text-[11px] text-slate-400">High-frequency user actions</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 max-h-48 overflow-y-auto pr-1 [scrollbar-width:thin]">
            {loading ? (
              <div className="space-y-2">
                {[...Array(4)].map((_, i) => (
                  <div key={i} className="h-8 bg-slate-50 rounded-xl animate-pulse" />
                ))}
              </div>
            ) : !data?.platform_activity?.length ? (
              <div className="py-8 text-center text-slate-400 text-xs">
                No recent activity.
              </div>
            ) : (
              data.platform_activity.map((act: any) => (
                <div
                  key={act.action}
                  className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200/60 text-xs"
                >
                  <span className="font-mono text-[10px] font-bold text-slate-700 truncate">
                    {act.action}
                  </span>
                  <span className="font-bold text-[#0891B2] bg-cyan-50 px-2 py-0.5 rounded-md border border-cyan-200 text-[10px]">
                    {act.count} ops
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
