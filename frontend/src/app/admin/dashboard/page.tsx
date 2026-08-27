"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  Stethoscope,
  FileText,
  Brain,
  ShieldCheck,
  AlertTriangle,
  Activity,
  ScrollText,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  ChevronRight,
  Clock,
  Pill,
  CheckCircle2,
  ShieldAlert,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface DashboardStats {
  total_users: number;
  total_patients: number;
  total_doctors: number;
  total_hospitals: number;
  total_documents: number;
  total_ai_analyses: number;
  active_consents: number;
  critical_clinical_events: number;
  audit_actions_24h: number;
  pending_doctor_verifications: number;
  documents_last_7d: number;
  avg_ai_execution_ms: number;
}

interface SystemSnapshot {
  active_prescriptions: number;
  active_emergency_sessions: number;
  pending_consent_requests: number;
  recent_critical_flags: {
    id: string;
    title: string;
    severity: string;
    event_date: string;
    patient_name: string;
  }[];
}

interface RecentActivity {
  id: string;
  action: string;
  resource_type: string;
  resource_id: string;
  ip_address: string;
  created_at: string;
  actor_name: string;
  actor_email: string;
  actor_role: string;
}

const ACTION_COLORS: Record<string, string> = {
  DOCUMENT_UPLOAD: "bg-cyan-50 text-[#0891B2] border border-cyan-200",
  DOCUMENT_VIEWED: "bg-blue-50 text-blue-700 border border-blue-200",
  CONSENT_APPROVED: "bg-emerald-50 text-emerald-700 border border-emerald-200",
  CONSENT_REVOKED: "bg-rose-50 text-rose-700 border border-rose-200",
  LOGIN: "bg-teal-50 text-[#0D9488] border border-teal-200",
  AI_ANALYSIS: "bg-purple-50 text-purple-700 border border-purple-200",
  EMERGENCY_ACCESS: "bg-amber-50 text-amber-700 border border-amber-200",
  DEFAULT: "bg-slate-100 text-slate-700 border border-slate-200",
};

function getActionColor(action: string) {
  for (const key of Object.keys(ACTION_COLORS)) {
    if (action?.toUpperCase().includes(key)) return ACTION_COLORS[key];
  }
  return ACTION_COLORS.DEFAULT;
}

function formatTimeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function AdminDashboardPage() {
  const { user, userProfile } = useAuth();
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [snapshot, setSnapshot] = useState<SystemSnapshot | null>(null);
  const [recentActivity, setRecentActivity] = useState<RecentActivity[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const adminName =
    userProfile?.displayName || (user?.email ? user.email.split("@")[0] : "Administrator");

  const fetchDashboardData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/dashboard/stats`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.stats) setStats(json.data.stats);
      if (json?.data?.snapshot) setSnapshot(json.data.snapshot);
      if (json?.data?.recent_activity) setRecentActivity(json.data.recent_activity);
    } catch (err) {
      console.warn("[AdminDashboard] Failed to fetch stats:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchDashboardData(); }, [user]);

  const handleRefresh = () => { setRefreshing(true); fetchDashboardData(); };

  const kpiCards = [
    {
      label: "Total Registered Users",
      value: stats?.total_users ?? "—",
      icon: Users,
      color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
      badge: null,
    },
    {
      label: "Active Patients",
      value: stats?.total_patients ?? "—",
      icon: Users,
      color: "bg-teal-50 text-[#0D9488] border border-teal-200/80",
      badge: null,
    },
    {
      label: "Verified Doctors",
      value: stats?.total_doctors ?? "—",
      icon: Stethoscope,
      color: "bg-sky-50 text-sky-600 border border-sky-200/80",
      badge: stats?.pending_doctor_verifications
        ? `${stats.pending_doctor_verifications} pending`
        : null,
    },
    {
      label: "Health Documents",
      value: stats?.total_documents ?? "—",
      icon: FileText,
      color: "bg-blue-50 text-blue-600 border border-blue-200/80",
      badge: stats?.documents_last_7d ? `+${stats.documents_last_7d} this week` : null,
    },
    {
      label: "AI Structured Analyses",
      value: stats?.total_ai_analyses ?? "—",
      icon: Brain,
      color: "bg-purple-50 text-purple-600 border border-purple-200/80",
      badge: stats?.avg_ai_execution_ms ? `avg ${stats.avg_ai_execution_ms}ms` : null,
    },
    {
      label: "Active Vault Consents",
      value: stats?.active_consents ?? "—",
      icon: ShieldCheck,
      color: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
      badge: snapshot?.pending_consent_requests
        ? `${snapshot.pending_consent_requests} pending`
        : null,
    },
    {
      label: "Critical Clinical Flags",
      value: stats?.critical_clinical_events ?? "—",
      icon: AlertTriangle,
      color: "bg-rose-50 text-rose-600 border border-rose-200/80",
      badge: null,
    },
    {
      label: "24h Audit Logs",
      value: stats?.audit_actions_24h ?? "—",
      icon: ScrollText,
      color: "bg-amber-50 text-amber-600 border border-amber-200/80",
      badge: null,
    },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">

      {/* ─── Greeting Hero Banner ─── */}
      <div className="bg-gradient-to-r from-[#0891B2] via-[#0e7490] to-[#22D3EE] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-900/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        {/* Subtle Ambient Mesh Rings */}
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-white/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute right-40 top-0 w-32 h-32 bg-cyan-300/20 rounded-full blur-xl pointer-events-none" />

        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-300 animate-pulse" />
            Live Platform Telemetry
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight leading-tight">
            Admin Control Centre
          </h1>
          <p className="text-cyan-50 text-sm leading-relaxed">
            Welcome back, <span className="font-bold text-white">{adminName}</span> — system-wide clinical monitoring, user governance, and compliance.
          </p>
        </div>

        <div className="flex items-center gap-3 z-10 flex-wrap">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur-md transition-all min-h-[42px] cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? "Syncing..." : "Refresh Data"}
          </button>
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#0891B2] hover:bg-cyan-50 shadow-md font-bold text-xs transition-all min-h-[42px]"
          >
            <Users className="w-4 h-4" />
            Manage Users
          </Link>
        </div>
      </div>

      {/* ─── KPI Cards Grid ─── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {kpiCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center justify-between">
                <div className={`p-2.5 rounded-2xl ${card.color}`}>
                  <Icon className="w-4 h-4" />
                </div>
                {card.badge && (
                  <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                    {card.badge}
                  </span>
                )}
              </div>
              <div>
                <p className="font-heading font-extrabold text-2xl text-[#0F172A]">
                  {loading ? (
                    <span className="inline-block w-12 h-7 bg-slate-100 rounded animate-pulse" />
                  ) : (
                    card.value.toLocaleString()
                  )}
                </p>
                <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* ─── Bottom 2-Column Grid ─── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">

        {/* ─── Left Column: Recent Audit Activity ─── */}
        <div className="lg:col-span-7">
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <ScrollText className="w-4 h-4 text-[#0891B2]" />
                <h3 className="font-heading font-bold text-[#0F172A] text-sm">
                  Recent Platform Activity
                </h3>
              </div>
              <Link
                href="/admin/audit-logs"
                className="text-xs text-[#0891B2] font-bold hover:underline flex items-center gap-1"
              >
                View Full Audit Log <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="space-y-3">
                {[...Array(5)].map((_, i) => (
                  <div key={i} className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : recentActivity.length === 0 ? (
              <div className="py-12 text-center text-slate-400 text-xs">
                No audit activity recorded yet.
              </div>
            ) : (
              <div className="space-y-2 max-h-[480px] overflow-y-auto pr-1 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {recentActivity.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50/70 hover:bg-cyan-50/40 border border-slate-200/60 transition-all"
                  >
                    <div className="shrink-0 mt-0.5">
                      <span
                        className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-lg ${getActionColor(entry.action)}`}
                      >
                        {entry.action?.replace(/_/g, " ")}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-[#0F172A] truncate">
                        {entry.actor_name || entry.actor_email || "System"}
                        <span className="ml-1.5 text-[10px] font-bold text-slate-400 uppercase">
                          [{entry.actor_role}]
                        </span>
                      </p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {entry.resource_type} {entry.resource_id ? `· ${entry.resource_id.slice(0, 8)}…` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-[10px] text-slate-400 font-mono whitespace-nowrap">
                        {formatTimeAgo(entry.created_at)}
                      </p>
                      {entry.ip_address && (
                        <p className="text-[9px] text-slate-300 font-mono">{entry.ip_address}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ─── Right Column: Snapshot & Critical Flags ─── */}
        <div className="lg:col-span-5 space-y-5">

          {/* System Snapshot */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <Activity className="w-4 h-4 text-[#0891B2]" />
              <h3 className="font-heading font-bold text-[#0F172A] text-sm">System Snapshot</h3>
            </div>
            <div className="grid grid-cols-2 gap-3">
              {[
                {
                  label: "Active Prescriptions",
                  value: snapshot?.active_prescriptions ?? "—",
                  icon: Pill,
                  href: "/admin/prescriptions",
                  color: "text-teal-600 bg-teal-50 border border-teal-200/80",
                },
                {
                  label: "Emergency Sessions",
                  value: snapshot?.active_emergency_sessions ?? "—",
                  icon: ShieldAlert,
                  href: "/admin/consents/emergency",
                  color: "text-rose-600 bg-rose-50 border border-rose-200/80",
                },
                {
                  label: "Pending Consents",
                  value: snapshot?.pending_consent_requests ?? "—",
                  icon: Clock,
                  href: "/admin/consents",
                  color: "text-amber-600 bg-amber-50 border border-amber-200/80",
                },
                {
                  label: "Pending Doctors",
                  value: stats?.pending_doctor_verifications ?? "—",
                  icon: Stethoscope,
                  href: "/admin/doctors/verification",
                  color: "text-[#0891B2] bg-cyan-50 border border-cyan-200/80",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <Link
                    key={item.label}
                    href={item.href}
                    className="p-3.5 rounded-2xl border border-slate-200/70 bg-slate-50 hover:bg-cyan-50/50 hover:border-cyan-200 transition-all space-y-2 group"
                  >
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${item.color}`}>
                      <Icon className="w-4 h-4" />
                    </div>
                    <div>
                      <p className="font-heading font-extrabold text-lg text-[#0F172A] leading-none">
                        {loading ? "—" : item.value.toLocaleString()}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-1">{item.label}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </div>

          {/* Recent Critical Flags */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-4">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-100">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-heading font-bold text-[#0F172A] text-sm">Critical Clinical Flags</h3>
            </div>
            {loading ? (
              <div className="space-y-2">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="h-10 bg-slate-50 rounded-2xl animate-pulse" />
                ))}
              </div>
            ) : !snapshot?.recent_critical_flags?.length ? (
              <div className="py-6 text-center space-y-1">
                <CheckCircle2 className="w-8 h-8 text-green-400 mx-auto" />
                <p className="text-xs text-slate-500">No critical flags detected</p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[220px] overflow-y-auto [scrollbar-width:thin]">
                {snapshot.recent_critical_flags.map((flag) => (
                  <div
                    key={flag.id}
                    className="flex items-start gap-2.5 p-3 rounded-2xl bg-rose-50/60 border border-rose-100"
                  >
                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-bold text-[#0F172A] truncate">{flag.patient_name}</p>
                      <p className="text-[11px] text-slate-600 truncate">{flag.title}</p>
                      <p className="text-[10px] text-slate-400 font-mono">
                        {new Date(flag.event_date).toLocaleDateString()}
                      </p>
                    </div>
                    <span className="shrink-0 text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-600 text-white">
                      {flag.severity}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-5 space-y-3">
            <h3 className="font-heading font-bold text-[#0F172A] text-sm pb-2 border-b border-slate-100">
              Quick Actions
            </h3>
            <div className="space-y-2">
              {[
                { label: "Review Doctor Verifications", href: "/admin/doctors/verification", icon: Stethoscope },
                { label: "Browse Audit Trail", href: "/admin/audit-logs", icon: ScrollText },
                { label: "View BI Analytics", href: "/admin/analytics", icon: TrendingUp },
                { label: "System Health Monitor", href: "/admin/system", icon: Activity },
              ].map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="flex items-center gap-2.5 p-2.5 rounded-xl hover:bg-cyan-50 text-slate-700 hover:text-[#0891B2] transition-all text-xs font-semibold group border border-transparent hover:border-cyan-100"
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-slate-400 group-hover:text-[#0891B2]" />
                    <span className="flex-1">{link.label}</span>
                    <ChevronRight className="w-3.5 h-3.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
