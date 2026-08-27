"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Bell,
  Megaphone,
  Radio,
  Send,
  ShieldAlert,
  AlertTriangle,
  Info,
  CheckCircle2,
  Users,
  UserCheck,
  Stethoscope,
  Trash2,
  Eye,
  RefreshCw,
  Search,
  X,
  ExternalLink,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Smartphone,
  Mail,
  Zap,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  target_role: string;
  severity: string;
  delivery_channel: string;
  is_read: boolean;
  metadata: any;
  created_at: string;
  sender_name?: string;
  sender_email?: string;
}

interface NotificationStats {
  total_broadcasts: number;
  reach_pool: {
    patients: number;
    doctors: number;
    total_users: number;
  };
  audience_breakdown: Record<string, number>;
  severity_breakdown: Record<string, number>;
  delivery_channels: Record<
    string,
    { name: string; status: string; delivery_rate: number }
  >;
}

export default function AdminNotificationsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();

  const [stats, setStats] = useState<NotificationStats | null>(null);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Filters
  const [targetRoleFilter, setTargetRoleFilter] = useState("ALL_ROLES");
  const [severityFilter, setSeverityFilter] = useState("ALL_SEVERITIES");
  const [search, setSearch] = useState("");

  // Pagination
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modals & Drawers
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  // New Broadcast Form State
  const [broadcastForm, setBroadcastForm] = useState({
    title: "",
    message: "",
    target_role: "ALL",
    severity: "INFO",
    delivery_channel: "IN_APP",
    action_url: "",
  });
  const [isSending, setIsSending] = useState(false);

  // ─── Fetch Data ────────────────────────────────────────────────────────────
  const fetchData = useCallback(
    async (pageNumber = 1) => {
      try {
        setLoading(true);
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const queryParams = new URLSearchParams({
          page: pageNumber.toString(),
          limit: "10",
        });
        if (targetRoleFilter !== "ALL_ROLES") queryParams.set("target_role", targetRoleFilter);
        if (severityFilter !== "ALL_SEVERITIES") queryParams.set("severity", severityFilter);
        if (search.trim()) queryParams.set("search", search.trim());

        const [statsRes, listRes] = await Promise.all([
          fetch(`${API_BASE_URL}/admin/notifications/stats`, { headers }),
          fetch(`${API_BASE_URL}/admin/notifications?${queryParams.toString()}`, { headers }),
        ]);

        if (statsRes.ok) {
          const statsJson = await statsRes.json();
          setStats(statsJson.data);
        }

        if (listRes.ok) {
          const listJson = await listRes.json();
          setNotifications(listJson.data.notifications || []);
          if (listJson.data.pagination) {
            setPagination(listJson.data.pagination);
          }
        }
      } catch (err) {
        console.error("Error fetching notification center data:", err);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [targetRoleFilter, severityFilter, search]
  );

  useEffect(() => {
    fetchData(1);
  }, [fetchData]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchData(pagination.page);
  };

  // ─── Dispatch Broadcast ───────────────────────────────────────────────────
  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastForm.title.trim() || !broadcastForm.message.trim()) {
      showWarning("Validation", "Please provide both a broadcast title and message.");
      return;
    }

    try {
      setIsSending(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/notifications/broadcast`, {
        method: "POST",
        headers,
        body: JSON.stringify(broadcastForm),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || "Failed to dispatch broadcast");
      }

      showSuccess("Broadcast alert successfully dispatched to platform users!");
      setShowBroadcastModal(false);
      setBroadcastForm({
        title: "",
        message: "",
        target_role: "ALL",
        severity: "INFO",
        delivery_channel: "IN_APP",
        action_url: "",
      });
      fetchData(1);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setIsSending(false);
    }
  };

  // ─── Delete Broadcast ─────────────────────────────────────────────────────
  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to remove the broadcast "${title}"?`)) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/notifications/${id}`, {
        method: "DELETE",
        headers,
      });

      if (!res.ok) throw new Error("Failed to delete notification");
      if (selectedNotif?.id === id) setSelectedNotif(null);
      fetchData(pagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    }
  };

  const getSeverityBadge = (severity: string) => {
    switch (severity?.toUpperCase()) {
      case "CRITICAL":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
            <ShieldAlert className="w-3 h-3" /> Critical Outage
          </span>
        );
      case "WARNING":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <AlertTriangle className="w-3 h-3" /> Warning Notice
          </span>
        );
      case "SUCCESS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> Release / Update
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <Info className="w-3 h-3" /> General Info
          </span>
        );
    }
  };

  const getAudienceBadge = (role: string) => {
    switch (role?.toUpperCase()) {
      case "PATIENT":
      case "PATIENTS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
            <Users className="w-3 h-3" /> Patients Only
          </span>
        );
      case "DOCTOR":
      case "DOCTORS":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            <Stethoscope className="w-3 h-3" /> Doctors Only
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200">
            <Radio className="w-3 h-3" /> All Users (Platform)
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* ─── Header & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white shadow-sm shadow-cyan-500/20">
              <Megaphone className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-[#0F172A]">
                Notification &amp; Broadcast Center
              </h1>
              <p className="text-xs text-slate-500">
                Dispatch role-targeted alerts, critical outage advisories, and system-wide announcements.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            <span>Sync Feeds</span>
          </button>

          <button
            onClick={() => setShowBroadcastModal(true)}
            className="flex items-center gap-2 px-5 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-cyan-500/20 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>Dispatch Broadcast</span>
          </button>
        </div>
      </div>

      {/* ─── Broadcast KPIs ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Broadcasts */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100 shrink-0">
            <Megaphone className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Total Broadcasts</p>
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5">
              {loading ? "…" : stats?.total_broadcasts ?? 0}
            </h3>
            <p className="text-[10px] text-cyan-600 font-semibold mt-0.5">Active announcements</p>
          </div>
        </div>

        {/* Total Patient Reach */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
            <Users className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Patient Reach Pool</p>
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5">
              {loading ? "…" : stats?.reach_pool.patients ?? 0}
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">Active patient vaults</p>
          </div>
        </div>

        {/* Doctor Network Reach */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
            <Stethoscope className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Doctor Network</p>
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5">
              {loading ? "…" : stats?.reach_pool.doctors ?? 0}
            </h3>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">Verified clinicians</p>
          </div>
        </div>

        {/* Channel Health */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-amber-50 text-amber-600 border border-amber-100 shrink-0">
            <Zap className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Delivery Channels</p>
            <h3 className="text-2xl font-black text-[#0F172A] mt-0.5">99.8%</h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">In-app &amp; Email delivery</p>
          </div>
        </div>
      </div>

      {/* ─── Broadcast Delivery Channel Status ─── */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-50 text-[#0891B2]">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs text-[#0F172A]">In-App Toast &amp; Modal</h4>
              <p className="text-[10px] text-slate-400">Direct patient &amp; doctor dashboard popups</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            Operational (99.8%)
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs text-[#0F172A]">Email Notification Pipeline</h4>
              <p className="text-[10px] text-slate-400">SMTP &amp; transactional dispatch</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
            Active (98.4%)
          </span>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-heading font-bold text-xs text-[#0F172A]">SMS Emergency Gateway</h4>
              <p className="text-[10px] text-slate-400">Twilio OTP &amp; critical dispatch</p>
            </div>
          </div>
          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            Standby (97.2%)
          </span>
        </div>
      </div>

      {/* ─── Notification Feeds & Broadcast Registry ─── */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading font-extrabold text-lg text-[#0F172A]">
              Dispatched Broadcasts Registry
            </h2>
            <p className="text-xs text-slate-500">
              History of all announcements dispatched across MediVault roles.
            </p>
          </div>

          {/* Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search title or content..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9 pr-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            <select
              value={targetRoleFilter}
              onChange={(e) => setTargetRoleFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
            >
              <option value="ALL_ROLES">All Audiences</option>
              <option value="ALL">Entire Platform (All)</option>
              <option value="PATIENT">Patients Only</option>
              <option value="DOCTOR">Doctors Only</option>
            </select>

            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="px-3 py-1.5 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
            >
              <option value="ALL_SEVERITIES">All Severities</option>
              <option value="INFO">General Info</option>
              <option value="WARNING">Warning</option>
              <option value="CRITICAL">Critical Outage</option>
              <option value="SUCCESS">Release / Update</option>
            </select>
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-6">Announcement Title &amp; Details</th>
                  <th className="py-3.5 px-4">Target Audience</th>
                  <th className="py-3.5 px-4">Severity</th>
                  <th className="py-3.5 px-4">Channel</th>
                  <th className="py-3.5 px-4">Dispatched At</th>
                  <th className="py-3.5 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
                {loading ? (
                  [...Array(4)].map((_, i) => (
                    <tr key={i} className="animate-pulse">
                      <td className="py-4 px-6"><div className="h-10 w-52 bg-slate-100 rounded-xl" /></td>
                      <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                      <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                      <td className="py-4 px-4"><div className="h-6 w-16 bg-slate-100 rounded-lg" /></td>
                      <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                      <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg ml-auto" /></td>
                    </tr>
                  ))
                ) : notifications.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-14 text-center text-slate-400 space-y-2">
                      <Megaphone className="w-8 h-8 mx-auto text-slate-300" />
                      <p className="font-semibold text-sm text-slate-600">No broadcasts found</p>
                      <p className="text-xs text-slate-400">Click &quot;Dispatch Broadcast&quot; to send an announcement to users</p>
                    </td>
                  </tr>
                ) : (
                  notifications.map((notif) => (
                    <tr key={notif.id} className="hover:bg-cyan-50/30 transition-colors">
                      {/* Title & Message Preview */}
                      <td className="py-4 px-6">
                        <div className="max-w-md">
                          <p className="font-heading font-bold text-sm text-[#0F172A]">{notif.title}</p>
                          <p className="text-xs text-slate-500 line-clamp-1 mt-0.5">{notif.message}</p>
                          {notif.metadata?.action_url && (
                            <a
                              href={notif.metadata.action_url}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1 text-[10px] text-[#0891B2] font-semibold hover:underline mt-1"
                            >
                              <ExternalLink className="w-2.5 h-2.5" /> Action URL: {notif.metadata.action_url}
                            </a>
                          )}
                        </div>
                      </td>

                      {/* Audience */}
                      <td className="py-4 px-4">{getAudienceBadge(notif.target_role)}</td>

                      {/* Severity */}
                      <td className="py-4 px-4">{getSeverityBadge(notif.severity)}</td>

                      {/* Channel */}
                      <td className="py-4 px-4">
                        <span className="font-mono text-xs font-bold text-slate-600 uppercase">
                          {notif.delivery_channel || "IN_APP"}
                        </span>
                      </td>

                      {/* Date */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-600 font-mono block">
                          {new Date(notif.created_at).toLocaleDateString()}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          {new Date(notif.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => setSelectedNotif(notif)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                            title="Inspect Notification Preview"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(notif.id, notif.title)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 border border-slate-200/80 transition-all cursor-pointer"
                            title="Delete Broadcast"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-slate-100 bg-slate-50/50 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-xs text-slate-500">
              Showing <span className="font-bold text-[#0F172A]">{notifications.length}</span> of{" "}
              <span className="font-bold text-[#0F172A]">{pagination.total}</span> total broadcasts
            </p>

            <div className="flex items-center gap-2">
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchData(pagination.page - 1)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <span className="text-xs font-mono text-slate-600 px-2">
                Page {pagination.page} of {pagination.totalPages || 1}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchData(pagination.page + 1)}
                className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Dispatch Broadcast Modal ─── */}
      {showBroadcastModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-xl rounded-3xl shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
                  <Megaphone className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Dispatch New Broadcast</h3>
                  <p className="text-xs text-slate-500">Publish a platform announcement to users.</p>
                </div>
              </div>
              <button
                onClick={() => setShowBroadcastModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendBroadcast} className="space-y-4">
              {/* Target Audience & Severity */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Target Audience</label>
                  <select
                    value={broadcastForm.target_role}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, target_role: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
                  >
                    <option value="ALL">Entire Platform (All Users)</option>
                    <option value="PATIENT">Patients Only (Vault Users)</option>
                    <option value="DOCTOR">Doctors Only (Verified Clinicians)</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-slate-700">Severity &amp; Style</label>
                  <select
                    value={broadcastForm.severity}
                    onChange={(e) => setBroadcastForm({ ...broadcastForm, severity: e.target.value })}
                    className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-semibold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
                  >
                    <option value="INFO">General Information (Blue)</option>
                    <option value="WARNING">Warning Notice (Yellow)</option>
                    <option value="CRITICAL">Critical Outage / Alert (Red)</option>
                    <option value="SUCCESS">Feature Release / Update (Green)</option>
                  </select>
                </div>
              </div>

              {/* Delivery Channel */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Delivery Channel</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "IN_APP", label: "In-App Popup" },
                    { id: "EMAIL", label: "Email Dispatch" },
                    { id: "ALL_CHANNELS", label: "Omnichannel" },
                  ].map((ch) => (
                    <button
                      type="button"
                      key={ch.id}
                      onClick={() => setBroadcastForm({ ...broadcastForm, delivery_channel: ch.id })}
                      className={`py-2 px-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        broadcastForm.delivery_channel === ch.id
                          ? "bg-cyan-50 border-[#0891B2] text-[#0891B2]"
                          : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {ch.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Title */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Broadcast Title</label>
                <input
                  type="text"
                  placeholder="e.g., Scheduled Database Maintenance Notice"
                  value={broadcastForm.title}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, title: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
                  required
                />
              </div>

              {/* Message Content */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Message Body</label>
                <textarea
                  rows={4}
                  placeholder="Explain the update, maintenance window, or advisory clearly for users..."
                  value={broadcastForm.message}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, message: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
                  required
                />
              </div>

              {/* Action URL */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-slate-700">Action URL (Optional)</label>
                <input
                  type="url"
                  placeholder="https://medivault.health/updates or https://status.medivault.health"
                  value={broadcastForm.action_url}
                  onChange={(e) => setBroadcastForm({ ...broadcastForm, action_url: e.target.value })}
                  className="w-full px-3.5 py-2.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowBroadcastModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSending}
                  className="px-6 py-2 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-cyan-500/20 cursor-pointer disabled:opacity-50 flex items-center gap-2"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSending ? "Dispatching..." : "Dispatch Broadcast"}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── Notification Details Drawer ─── */}
      {selectedNotif && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedNotif(null)}
        >
          <div
            className="bg-white w-full max-w-lg h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
                  <Bell className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Broadcast Details</h3>
                  <p className="text-xs text-slate-500 font-mono">ID: #{selectedNotif.id.slice(0, 8)}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedNotif(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target & Severity */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Audience Target</span>
                <div>{getAudienceBadge(selectedNotif.target_role)}</div>
              </div>
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Severity Level</span>
                <div>{getSeverityBadge(selectedNotif.severity)}</div>
              </div>
            </div>

            {/* Content Preview */}
            <div className="p-5 rounded-3xl bg-slate-900 text-white space-y-3">
              <span className="text-[10px] font-bold text-cyan-400 uppercase tracking-widest font-heading">
                User-Facing Toast Preview
              </span>
              <h4 className="font-heading font-bold text-base text-white">{selectedNotif.title}</h4>
              <p className="text-xs text-slate-300 leading-relaxed">{selectedNotif.message}</p>
              {selectedNotif.metadata?.action_url && (
                <div className="pt-2">
                  <a
                    href={selectedNotif.metadata.action_url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:brightness-110"
                  >
                    Open Action Link <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              )}
            </div>

            {/* Telemetry Metadata */}
            <div className="space-y-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Dispatch Metadata (JSON)
              </span>
              <pre className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 text-[11px] font-mono overflow-x-auto max-h-[200px]">
                {JSON.stringify(selectedNotif, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
