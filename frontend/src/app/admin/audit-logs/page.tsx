"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  Search,
  Download,
  Eye,
  ShieldCheck,
  ShieldAlert,
  Clock,
  User,
  Stethoscope,
  RefreshCw,
  X,
  ChevronLeft,
  ChevronRight,
  Copy,
  CheckCircle2,
  Lock,
  Globe,
  Database,
  Layers,
  Sparkles,
  Terminal,
  Activity,
  Filter,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface AuditLogRecord {
  id: string;
  user_id?: string;
  action: string;
  resource_type?: string;
  resource_id?: string;
  ip_address?: string;
  user_agent?: string;
  metadata?: any;
  created_at: string;
  actor_name?: string;
  actor_email?: string;
  actor_role?: string;
}

interface AuditSummary {
  total_events: number;
  events_24h: number;
  unique_actors: number;
  security_events: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

function getActionBadgeStyle(action: string) {
  const act = action.toUpperCase();
  if (act.includes("EMERGENCY") || act.includes("TERMINATE") || act.includes("REVOKE") || act.includes("DENIED")) {
    return "bg-rose-50 text-rose-700 border-rose-200";
  }
  if (act.includes("APPROVED") || act.includes("GRANT") || act.includes("SUCCESS")) {
    return "bg-emerald-50 text-emerald-700 border-emerald-200";
  }
  if (act.includes("DOCUMENT") || act.includes("UPLOAD") || act.includes("VIEW")) {
    return "bg-cyan-50 text-[#0891B2] border-cyan-200";
  }
  if (act.includes("AI") || act.includes("ANALYSIS") || act.includes("OCR")) {
    return "bg-purple-50 text-purple-700 border-purple-200";
  }
  if (act.includes("ROLE") || act.includes("ADMIN") || act.includes("SETTING")) {
    return "bg-amber-50 text-amber-700 border-amber-200";
  }
  return "bg-blue-50 text-blue-700 border-blue-200";
}

function getRoleBadgeStyle(role?: string) {
  switch (role?.toLowerCase()) {
    case "doctor":
      return "bg-teal-50 text-[#0D9488] border-teal-200";
    case "patient":
      return "bg-cyan-50 text-[#0891B2] border-cyan-200";
    case "admin":
      return "bg-purple-50 text-purple-700 border-purple-200";
    case "hospital":
      return "bg-blue-50 text-blue-700 border-blue-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export default function AdminAuditLogsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
  const [logs, setLogs] = useState<AuditLogRecord[]>([]);
  const [summary, setSummary] = useState<AuditSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 25,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [selectedRole, setSelectedRole] = useState("all");
  const [selectedAction, setSelectedAction] = useState("all");
  const [selectedDays, setSelectedDays] = useState("30");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drawer / Inspection state
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedJson, setCopiedJson] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const fetchAuditLogs = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "25",
        search: search.trim(),
        role: selectedRole,
        action: selectedAction,
        days: selectedDays,
      });

      const res = await fetch(`${API_BASE_URL}/admin/audit-logs?${queryParams}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.logs) setLogs(json.data.logs);
      if (json?.data?.summary) setSummary(json.data.summary);
      if (json?.data?.pagination) setPagination(json.data.pagination);
    } catch (err) {
      console.warn("[AdminAuditLogs] Failed to fetch logs:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedRole, selectedAction, selectedDays]);

  useEffect(() => {
    fetchAuditLogs(1);
  }, [fetchAuditLogs]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchAuditLogs(pagination.page);
  };

  const handleExportCSV = async () => {
    setIsExporting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/audit-logs/export?days=${selectedDays}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data) {
        const rawLogs: AuditLogRecord[] = json.data;
        const csvHeader = "ID,Timestamp,Action,Actor Name,Actor Email,Actor Role,Resource Type,Resource ID,IP Address\n";
        const csvRows = rawLogs.map((l) =>
          `"${l.id}","${l.created_at}","${l.action}","${l.actor_name || "System"}","${l.actor_email || ""}","${l.actor_role || "system"}","${l.resource_type || ""}","${l.resource_id || ""}","${l.ip_address || ""}"`
        );
        const blob = new Blob([csvHeader + csvRows.join("\n")], { type: "text/csv;charset=utf-8;" });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", `medivault_hipaa_audit_trail_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const handleCopy = (text: string, type: "id" | "json") => {
    navigator.clipboard.writeText(text);
    if (type === "id") {
      setCopiedId(true);
      setTimeout(() => setCopiedId(false), 2000);
    } else {
      setCopiedJson(true);
      setTimeout(() => setCopiedJson(false), 2000);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Export Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <Lock className="w-3.5 h-3.5" />
            HIPAA §164.312(b) Immutable Audit Trail
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            Audit Trail Explorer
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cryptographically sealed platform ledger tracking all PHI interactions, consents, authentication, and admin overrides.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh"}
          </button>
          <button
            onClick={handleExportCSV}
            disabled={isExporting}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
          >
            <Download className="w-4 h-4" />
            {isExporting ? "Exporting..." : "Export HIPAA CSV"}
          </button>
        </div>
      </div>

      {/* ─── HIPAA Summary KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Audited Events",
            value: summary?.total_events ?? "—",
            sub: "Immutable ledger entries",
            icon: ShieldCheck,
            color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
          },
          {
            label: "24-Hour Velocity",
            value: summary?.events_24h ?? "—",
            sub: "Events in the last 24h",
            icon: Activity,
            color: "bg-teal-50 text-[#0D9488] border border-teal-200/80",
          },
          {
            label: "Unique Platform Actors",
            value: summary?.unique_actors ?? "—",
            sub: "Patients, doctors & admins",
            icon: User,
            color: "bg-purple-50 text-purple-600 border border-purple-200/80",
          },
          {
            label: "Security & Override Actions",
            value: summary?.security_events ?? "—",
            sub: "Revocations & break-glasses",
            icon: ShieldAlert,
            color: "bg-rose-50 text-rose-600 border border-rose-200/80",
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
              </div>
              <div>
                <p className="font-heading font-extrabold text-2xl text-[#0F172A]">
                  {loading ? (
                    <span className="inline-block w-14 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    kpi.value.toLocaleString()
                  )}
                </p>
                <p className="text-xs font-bold text-slate-700 mt-0.5">{kpi.label}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{kpi.sub}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Search & Multi-Filter Controls Bar ─── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by actor name, email, action name, resource ID, or IP address..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-[#0891B2] focus:bg-white transition-all"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Timeframe Dropdown */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs font-bold text-slate-400">Timeframe:</span>
            <select
              value={selectedDays}
              onChange={(e) => setSelectedDays(e.target.value)}
              className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 focus:outline-none focus:border-[#0891B2] cursor-pointer"
            >
              <option value="1">Last 24 Hours</option>
              <option value="7">Last 7 Days</option>
              <option value="30">Last 30 Days</option>
              <option value="90">Last 90 Days</option>
              <option value="365">All Time (1 Year)</option>
            </select>
          </div>
        </div>

        {/* Role Tabs & Action Filter */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1 border-t border-slate-100">
          {/* Role Filter Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 [scrollbar-width:none]">
            {[
              { key: "all", label: "All Roles" },
              { key: "doctor", label: "Doctors" },
              { key: "patient", label: "Patients" },
              { key: "admin", label: "Administrators" },
              { key: "hospital", label: "Hospitals" },
            ].map((tab) => {
              const isSelected = selectedRole === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedRole(tab.key)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                    isSelected
                      ? "bg-[#0891B2] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Action Filter */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase">Action Filter:</span>
            <select
              value={selectedAction}
              onChange={(e) => setSelectedAction(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 focus:outline-none focus:border-[#0891B2] cursor-pointer"
            >
              <option value="all">All Actions</option>
              <option value="LOGIN">Auth / Login</option>
              <option value="DOCUMENT">Document Access</option>
              <option value="CONSENT">Consent Operations</option>
              <option value="EMERGENCY">Emergency Break-Glass</option>
              <option value="AI">AI Processing</option>
              <option value="ROLE">Role Modification</option>
            </select>
          </div>
        </div>
      </div>

      {/* ─── Audit Trail Data Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Timestamp &amp; Event ID</th>
                <th className="py-3.5 px-4">Actor Context</th>
                <th className="py-3.5 px-4">Action Name</th>
                <th className="py-3.5 px-4">Target Resource</th>
                <th className="py-3.5 px-4">Client IP / Origin</th>
                <th className="py-3.5 px-6 text-right">Inspect</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
              {loading ? (
                [...Array(8)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-10 w-40 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-28 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-12 bg-slate-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No audit trail entries matched filters</p>
                    <p className="text-xs text-slate-400">Try broadening your timeframe or clearing search keywords</p>
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actionStyle = getActionBadgeStyle(log.action);
                  const roleStyle = getRoleBadgeStyle(log.actor_role);

                  return (
                    <tr
                      key={log.id}
                      className="hover:bg-cyan-50/30 transition-colors group"
                    >
                      {/* Timestamp & ID */}
                      <td className="py-3.5 px-6">
                        <div className="space-y-0.5">
                          <p className="font-semibold text-xs text-[#0F172A] font-mono">
                            {new Date(log.created_at).toLocaleString()}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">
                            ID: {log.id.slice(0, 13)}…
                          </p>
                        </div>
                      </td>

                      {/* Actor Context */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-xs shrink-0 font-heading">
                            {log.actor_name ? log.actor_name.slice(0, 2).toUpperCase() : "SY"}
                          </div>
                          <div className="min-w-0 max-w-[180px]">
                            <p className="font-bold text-xs text-[#0F172A] truncate">
                              {log.actor_name || "System Automated"}
                            </p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase border ${roleStyle}`}>
                                {log.actor_role || "system"}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold font-mono border ${actionStyle}`}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Resource */}
                      <td className="py-3.5 px-4">
                        {log.resource_type ? (
                          <div className="space-y-0.5">
                            <span className="text-xs font-semibold text-slate-700 capitalize">
                              {log.resource_type.replace(/_/g, " ")}
                            </span>
                            {log.resource_id && (
                              <p className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                                {log.resource_id}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>

                      {/* IP & Origin */}
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <p className="text-xs font-mono text-slate-700 font-semibold">
                            {log.ip_address || "127.0.0.1"}
                          </p>
                          <p className="text-[10px] text-slate-400 truncate max-w-[120px]">
                            {log.user_agent?.includes("Mozilla") ? "Web Browser Client" : "API Gateway"}
                          </p>
                        </div>
                      </td>

                      {/* Inspect Action */}
                      <td className="py-3.5 px-6 text-right">
                        <button
                          onClick={() => setSelectedLog(log)}
                          className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                          title="Inspect Event Payload"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* ─── Pagination Footer ─── */}
        <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-slate-500">
            Showing <span className="font-bold text-[#0F172A]">{logs.length}</span> of{" "}
            <span className="font-bold text-[#0F172A]">{pagination.total}</span> audit records
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchAuditLogs(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600 px-2 font-mono">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchAuditLogs(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Detailed Event Inspector Drawer ─── */}
      {selectedLog && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedLog(null)}
        >
          <div
            className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-start justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-200">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">
                    Audit Trail Event
                  </h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-slate-400 font-mono">{selectedLog.id}</span>
                    <button
                      onClick={() => handleCopy(selectedLog.id, "id")}
                      className="text-slate-400 hover:text-slate-600 cursor-pointer"
                      title="Copy Event ID"
                    >
                      {copiedId ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>
              <button
                onClick={() => setSelectedLog(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Action & Timestamp Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 text-xs font-bold uppercase">Action Identifier</span>
                <span className={`px-2.5 py-1 rounded-xl text-xs font-bold font-mono border ${getActionBadgeStyle(selectedLog.action)}`}>
                  {selectedLog.action}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Timestamp</span>
                <span className="font-mono font-bold text-slate-700">
                  {new Date(selectedLog.created_at).toLocaleString()}
                </span>
              </div>
            </div>

            {/* Actor Information */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-heading">
                Executing Actor
              </h4>
              <div className="grid grid-cols-2 gap-2 pt-1">
                <div>
                  <span className="text-slate-400">Name:</span>
                  <p className="font-bold text-[#0F172A]">{selectedLog.actor_name || "System"}</p>
                </div>
                <div>
                  <span className="text-slate-400">Role:</span>
                  <p className="font-bold uppercase text-[#0891B2]">{selectedLog.actor_role || "system"}</p>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400">Email:</span>
                  <p className="font-mono text-slate-700">{selectedLog.actor_email || "system-internal@medivault.health"}</p>
                </div>
              </div>
            </div>

            {/* Forensic Network Specs */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-heading">
                Forensics &amp; Client Origin
              </h4>
              <div className="space-y-1.5 pt-1">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Origin IP:</span>
                  <span className="font-mono font-bold text-slate-800">{selectedLog.ip_address || "127.0.0.1"}</span>
                </div>
                <div>
                  <span className="text-slate-400">User Agent / Client:</span>
                  <p className="font-mono text-[11px] text-slate-600 break-all bg-white p-2 rounded-xl border border-slate-200 mt-1">
                    {selectedLog.user_agent || "MediVault-Internal-Engine/2.0"}
                  </p>
                </div>
              </div>
            </div>

            {/* JSON Metadata Inspector */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-heading">
                  JSON Metadata Payload
                </h4>
                <button
                  onClick={() => handleCopy(JSON.stringify(selectedLog.metadata || {}, null, 2), "json")}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] cursor-pointer"
                >
                  {copiedJson ? <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedJson ? "Copied" : "Copy Payload"}
                </button>
              </div>

              <pre className="p-4 rounded-2xl bg-slate-900 text-slate-100 text-xs font-mono overflow-x-auto max-h-56 leading-relaxed">
                {JSON.stringify(selectedLog.metadata || {}, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
