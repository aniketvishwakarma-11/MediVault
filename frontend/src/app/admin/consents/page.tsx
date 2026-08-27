"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldCheck,
  ShieldAlert,
  Search,
  CheckCircle2,
  XCircle,
  Clock,
  User,
  Stethoscope,
  RefreshCw,
  Eye,
  X,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Lock,
  Calendar,
  Layers,
  Sparkles,
  ArrowRight,
  FileText,
  Ban,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface ConsentRecord {
  id: string;
  patient_id: string;
  grantee_id: string;
  grantee_role: string;
  status: string;
  purpose?: string;
  scope?: string;
  doctor_name?: string;
  consent_hash?: string;
  blockchain_tx_hash?: string;
  expires_at?: string;
  created_at: string;
  updated_at: string;
  patient_user_id: string;
  patient_name: string;
  patient_email: string;
  grantee_name?: string;
  grantee_email?: string;
  doctor_license?: string;
  doctor_specialization?: string;
  doctor_hospital?: string;
}

interface ConsentSummary {
  total: number;
  active: number;
  pending: number;
  revoked: number;
  expired: number;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: any }> = {
  APPROVED: { label: "Approved & Active", color: "bg-emerald-50 text-emerald-700 border-emerald-200", icon: CheckCircle2 },
  PENDING: { label: "Pending Approval", color: "bg-amber-50 text-amber-700 border-amber-200", icon: Clock },
  REVOKED: { label: "Revoked", color: "bg-rose-50 text-rose-700 border-rose-200", icon: XCircle },
  EXPIRED: { label: "Expired", color: "bg-slate-50 text-slate-600 border-slate-200", icon: Calendar },
  DENIED: { label: "Denied", color: "bg-rose-50 text-rose-700 border-rose-200", icon: Ban },
};

export default function AdminConsentsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();
  const [consents, setConsents] = useState<ConsentRecord[]>([]);
  const [summary, setSummary] = useState<ConsentSummary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1,
    limit: 15,
    total: 0,
    totalPages: 1,
  });
  const [search, setSearch] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("all");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Drawer & Revoke Modal state
  const [selectedConsent, setSelectedConsent] = useState<any | null>(null);
  const [drawerLoading, setDrawerLoading] = useState(false);
  const [revokingConsent, setRevokingConsent] = useState<ConsentRecord | null>(null);
  const [revokeReason, setRevokeReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchConsents = useCallback(async (pageToLoad = 1) => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({
        page: pageToLoad.toString(),
        limit: "15",
        search: search.trim(),
        status: selectedStatus,
      });

      const res = await fetch(`${API_BASE_URL}/admin/consents?${queryParams}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.consents) setConsents(json.data.consents);
      if (json?.data?.summary) setSummary(json.data.summary);
      if (json?.data?.pagination) setPagination(json.data.pagination);
    } catch (err) {
      console.warn("[AdminConsents] Failed to fetch consents:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [search, selectedStatus]);

  useEffect(() => {
    fetchConsents(1);
  }, [fetchConsents]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchConsents(pagination.page);
  };

  const handleViewDetails = async (consentId: string) => {
    setDrawerLoading(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/consents/${consentId}`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data) {
        setSelectedConsent(json.data);
      }
    } catch (err) {
      console.warn("[AdminConsents] Failed to fetch consent details:", err);
    } finally {
      setDrawerLoading(false);
    }
  };

  const handleRevokeConsent = async () => {
    if (!revokingConsent) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/consents/${revokingConsent.id}/revoke`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ reason: revokeReason.trim() || "Administrative revocation" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setActionSuccess(`Consent grant for ${revokingConsent.patient_name} has been REVOKED.`);
      setTimeout(() => setActionSuccess(null), 5000);

      setRevokingConsent(null);
      setRevokeReason("");
      fetchConsents(pagination.page);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Page Title & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 text-[#0891B2] text-xs font-bold uppercase tracking-wider border border-cyan-200 mb-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            Patient Consent &amp; Access Governance
          </div>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight">
            Consent Registry
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Cryptographic patient-directed consent contracts, access scope controls, and emergency break-glass sessions.
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
          <Link
            href="/admin/consents/emergency"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all min-h-[40px]"
          >
            <ShieldAlert className="w-4 h-4" />
            Emergency Break-Glass
          </Link>
        </div>
      </div>

      {/* ─── Success Toast Banner ─── */}
      {actionSuccess && (
        <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button onClick={() => setActionSuccess(null)} className="text-emerald-600 hover:text-emerald-900">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Summary Metric Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: "Total Consent Grants",
            value: summary?.total ?? "—",
            sub: "Issued across platform",
            icon: ShieldCheck,
            color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
          },
          {
            label: "Active Approved Grants",
            value: summary?.active ?? "—",
            sub: "Currently granting doctor access",
            icon: CheckCircle2,
            color: "bg-emerald-50 text-emerald-600 border border-emerald-200/80",
          },
          {
            label: "Pending Patient Review",
            value: summary?.pending ?? "—",
            sub: "Awaiting patient authorization",
            icon: Clock,
            color: "bg-amber-50 text-amber-600 border border-amber-200/80",
          },
          {
            label: "Revoked by Patient/Admin",
            value: summary?.revoked ?? "—",
            sub: "Access immediately disabled",
            icon: XCircle,
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

      {/* ─── Search & Status Filters Bar ─── */}
      <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row items-center gap-4">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by patient name, doctor name, clinical purpose, or hospital..."
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

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 [scrollbar-width:none]">
            {[
              { key: "all", label: "All Consents" },
              { key: "approved", label: "Active", icon: CheckCircle2 },
              { key: "pending", label: "Pending", icon: Clock },
              { key: "revoked", label: "Revoked", icon: XCircle },
              { key: "expired", label: "Expired", icon: Calendar },
            ].map((tab) => {
              const isSelected = selectedStatus === tab.key;
              return (
                <button
                  key={tab.key}
                  onClick={() => setSelectedStatus(tab.key)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? "bg-[#0891B2] text-white shadow-xs"
                      : "bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200/80"
                  }`}
                >
                  {tab.icon && <tab.icon className="w-3.5 h-3.5" />}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── Consents Data Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Patient Vault Owner</th>
                <th className="py-3.5 px-4">Authorized Grantee (Doctor)</th>
                <th className="py-3.5 px-4">Access Scope</th>
                <th className="py-3.5 px-4">Purpose / Intent</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Expiration / Created</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
              {loading ? (
                [...Array(6)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-10 w-40 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-24 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-32 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-16 bg-slate-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : consents.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 space-y-2">
                    <ShieldCheck className="w-8 h-8 mx-auto text-slate-300" />
                    <p className="font-semibold text-sm text-slate-600">No consent contracts found</p>
                    <p className="text-xs text-slate-400">Try adjusting your filters or search keywords</p>
                  </td>
                </tr>
              ) : (
                consents.map((cg) => {
                  const statusConf = STATUS_CONFIG[cg.status?.toUpperCase()] || STATUS_CONFIG.PENDING;
                  const StatusIcon = statusConf.icon;
                  const isApproved = cg.status?.toUpperCase() === "APPROVED";

                  return (
                    <tr
                      key={cg.id}
                      className="hover:bg-cyan-50/30 transition-colors group"
                    >
                      {/* Patient */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-cyan-100 text-[#0891B2] font-bold flex items-center justify-center text-xs shrink-0 font-heading">
                            {cg.patient_name ? cg.patient_name.slice(0, 2).toUpperCase() : "PT"}
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-sm text-[#0F172A] truncate">
                              {cg.patient_name || "Unknown Patient"}
                            </p>
                            <p className="text-[11px] text-slate-400 font-mono truncate">
                              {cg.patient_email}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Doctor / Grantee */}
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <Stethoscope className="w-4 h-4 text-teal-600 shrink-0" />
                          <div className="min-w-0">
                            <p className="font-bold text-xs text-[#0F172A] truncate">
                              {cg.doctor_name || cg.grantee_name || "Physician"}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">
                              {cg.doctor_specialization || cg.doctor_hospital || "Medical Doctor"}
                            </p>
                          </div>
                        </div>
                      </td>

                      {/* Scope */}
                      <td className="py-4 px-4">
                        <span className="inline-block px-2.5 py-1 rounded-xl bg-slate-100 border border-slate-200 text-[11px] font-semibold text-slate-700">
                          {cg.scope || "Full Vault"}
                        </span>
                      </td>

                      {/* Purpose */}
                      <td className="py-4 px-4">
                        <p className="text-xs text-slate-600 truncate max-w-[200px]" title={cg.purpose}>
                          {cg.purpose || "Clinical Consultation"}
                        </p>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold border ${statusConf.color}`}
                        >
                          <StatusIcon className="w-3 h-3" />
                          {statusConf.label}
                        </span>
                      </td>

                      {/* Expiration / Created */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 text-[11px]">
                          <p className="text-slate-700 font-mono">
                            {cg.expires_at ? `Exp: ${new Date(cg.expires_at).toLocaleDateString()}` : "No Expiry"}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {new Date(cg.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-4 px-6 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => handleViewDetails(cg.id)}
                            className="p-2 rounded-xl bg-slate-50 hover:bg-cyan-50 text-slate-600 hover:text-[#0891B2] border border-slate-200/80 transition-all cursor-pointer"
                            title="Inspect Scope & Audit Trail"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          {isApproved && (
                            <button
                              onClick={() => setRevokingConsent(cg)}
                              className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 border border-rose-200 transition-all cursor-pointer"
                              title="Emergency Revoke Consent Grant"
                            >
                              <Ban className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
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
            Showing <span className="font-bold text-[#0F172A]">{consents.length}</span> of{" "}
            <span className="font-bold text-[#0F172A]">{pagination.total}</span> consent contracts
          </p>

          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchConsents(pagination.page - 1)}
              disabled={pagination.page <= 1 || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              <ChevronLeft className="w-4 h-4" /> Previous
            </button>
            <span className="text-xs font-bold text-slate-600 px-2 font-mono">
              Page {pagination.page} of {pagination.totalPages || 1}
            </span>
            <button
              onClick={() => fetchConsents(pagination.page + 1)}
              disabled={pagination.page >= pagination.totalPages || loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition-all"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* ─── Consent Detail & Audit Trail Drawer ─── */}
      {selectedConsent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex justify-end animate-in fade-in"
          onClick={() => setSelectedConsent(null)}
        >
          <div
            className="bg-white w-full max-w-xl h-full shadow-2xl border-l border-slate-200 p-6 sm:p-8 overflow-y-auto space-y-6 animate-in slide-in-from-right duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-700 border border-emerald-200">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">
                    Consent Contract Details
                  </h3>
                  <p className="text-xs text-slate-500 font-mono">{selectedConsent.id}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedConsent(null)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scope & Contract Specs */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Contract Specifications
              </h4>
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Contract Status</p>
                  <p className="text-sm font-bold text-emerald-700 mt-0.5 uppercase">
                    {selectedConsent.status}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Access Scope</p>
                  <p className="text-sm font-bold text-[#0891B2] mt-0.5">
                    {selectedConsent.scope || "Full Vault"}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Granted On</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono">
                    {new Date(selectedConsent.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
                  <p className="text-[10px] text-slate-400 font-bold uppercase">Expires On</p>
                  <p className="text-xs font-bold text-slate-700 mt-0.5 font-mono">
                    {selectedConsent.expires_at ? new Date(selectedConsent.expires_at).toLocaleString() : "Never (Manual Revoke)"}
                  </p>
                </div>
              </div>

              {/* Purpose */}
              {selectedConsent.purpose && (
                <div className="p-3.5 rounded-2xl bg-cyan-50/50 border border-cyan-200/80 text-xs space-y-1">
                  <p className="font-bold text-[#0891B2]">Authorized Clinical Purpose</p>
                  <p className="text-slate-700 leading-relaxed">{selectedConsent.purpose}</p>
                </div>
              )}
            </div>

            {/* Parties Involved */}
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-400">Patient Vault</p>
                <p className="font-bold text-sm text-[#0F172A]">{selectedConsent.patient_name}</p>
                <p className="text-slate-500 font-mono text-[11px] truncate">{selectedConsent.patient_email}</p>
              </div>
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                <p className="text-[10px] font-bold uppercase text-slate-400">Authorized Physician</p>
                <p className="font-bold text-sm text-[#0F172A]">{selectedConsent.doctor_name || selectedConsent.grantee_name}</p>
                <p className="text-slate-500 text-[11px]">{selectedConsent.doctor_specialization || "Physician"}</p>
              </div>
            </div>

            {/* Access Audit Trail */}
            <div className="space-y-2.5 pt-2">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest font-heading">
                Associated Audit Access Trail
              </h4>
              {!selectedConsent.access_audit_trail?.length ? (
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-center text-slate-400 text-xs">
                  No individual record accesses recorded under this contract yet.
                </div>
              ) : (
                <div className="space-y-1.5">
                  {selectedConsent.access_audit_trail.map((log: any) => (
                    <div
                      key={log.id}
                      className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 rounded bg-cyan-100 text-[#0891B2]">
                          {log.action}
                        </span>
                        <span className="text-slate-600 truncate text-[11px]">
                          {log.ip_address || "Internal Session"}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono shrink-0">
                        {new Date(log.created_at).toLocaleString()}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── Emergency Revoke Confirmation Modal ─── */}
      {revokingConsent && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setRevokingConsent(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <AlertTriangle className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">
                  Emergency Revocation
                </h3>
              </div>
              <button
                onClick={() => setRevokingConsent(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are terminating doctor access for{" "}
              <span className="font-bold text-[#0F172A]">{revokingConsent.patient_name}</span>. This will immediately revoke all reading permissions granted to{" "}
              <span className="font-bold text-[#0F172A]">{revokingConsent.doctor_name || revokingConsent.grantee_name}</span>.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Revocation Justification / Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. Patient requested administrative cancellation, potential unauthorized access..."
                value={revokeReason}
                onChange={(e) => setRevokeReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRevokingConsent(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleRevokeConsent}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Revoking..." : "Confirm Revocation"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
