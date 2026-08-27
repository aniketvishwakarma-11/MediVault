"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  ShieldAlert,
  AlertTriangle,
  Clock,
  CheckCircle2,
  XCircle,
  Stethoscope,
  User,
  RefreshCw,
  X,
  ArrowLeft,
  Ban,
  Activity,
  HeartPulse,
  Flame,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface EmergencySession {
  id: string;
  credential_id: string;
  patient_id: string;
  actor_id: string;
  actor_type: string;
  access_level: string;
  scope: string[];
  reason_code: string;
  reason_text: string;
  issued_at: string;
  expires_at: string;
  revoked_at?: string;
  created_at: string;
  patient_name: string;
  patient_email: string;
  blood_group?: string;
  doctor_name: string;
  doctor_email: string;
  doctor_license?: string;
  doctor_specialization?: string;
  doctor_hospital?: string;
  session_status: "ACTIVE" | "EXPIRED" | "TERMINATED";
}

interface SessionSummary {
  total: number;
  active: number;
  expired: number;
  terminated: number;
}

export default function AdminEmergencySessionsPage() {
  const { user } = useAuth();
  const { error: showError } = useToast();
  const [sessions, setSessions] = useState<EmergencySession[]>([]);
  const [summary, setSummary] = useState<SessionSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Termination modal state
  const [terminatingSession, setTerminatingSession] = useState<EmergencySession | null>(null);
  const [terminationReason, setTerminationReason] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const fetchEmergencySessions = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/emergency/sessions`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.sessions) setSessions(json.data.sessions);
      if (json?.data?.summary) setSummary(json.data.summary);
    } catch (err) {
      console.warn("[AdminEmergency] Failed to fetch emergency sessions:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchEmergencySessions();
  }, [fetchEmergencySessions]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchEmergencySessions();
  };

  const handleTerminate = async () => {
    if (!terminatingSession) return;
    setIsProcessing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/emergency/sessions/${terminatingSession.id}/revoke`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ reason: terminationReason.trim() || "Administrative security termination" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setActionSuccess(`Emergency session #${terminatingSession.id.slice(0, 8)} has been TERMINATED immediately.`);
      setTimeout(() => setActionSuccess(null), 5000);

      setTerminatingSession(null);
      setTerminationReason("");
      fetchEmergencySessions();
    } catch (err: any) {
      showError("Termination Failed", err.message || "Please try again.");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Breadcrumb & Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/consents"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0891B2] font-semibold transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to Consent Registry
          </Link>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight flex items-center gap-3">
            Emergency Break-Glass Oversight
            {summary?.active && summary.active > 0 ? (
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse flex items-center gap-1">
                <Flame className="w-3.5 h-3.5 text-rose-600" />
                {summary.active} Active Now
              </span>
            ) : null}
          </h1>
          <p className="text-sm text-slate-500">
            Real-time telemetry and immediate administrative kill-switch for emergency break-glass medical access.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing..." : "Refresh Status"}
        </button>
      </div>

      {/* ─── Action Alert Toast ─── */}
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
            label: "Total Break-Glass Invocations",
            value: summary?.total ?? 0,
            sub: "Cumulative emergency scans",
            icon: ShieldAlert,
            color: "bg-cyan-50 text-[#0891B2] border border-cyan-200/80",
          },
          {
            label: "Live Active Sessions",
            value: summary?.active ?? 0,
            sub: "Currently reading patient records",
            icon: Flame,
            color: "bg-rose-50 text-rose-600 border border-rose-200/80",
          },
          {
            label: "Expired Sessions",
            value: summary?.expired ?? 0,
            sub: "Safely lapsed by timer",
            icon: Clock,
            color: "bg-slate-50 text-slate-600 border border-slate-200/80",
          },
          {
            label: "Admin Terminated",
            value: summary?.terminated ?? 0,
            sub: "Intervened by Super Admin",
            icon: Ban,
            color: "bg-amber-50 text-amber-600 border border-amber-200/80",
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
                    <span className="inline-block w-12 h-7 bg-slate-100 rounded animate-pulse" />
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

      {/* ─── Emergency Sessions Table ─── */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-heading font-bold text-[#0F172A] text-base">
                Emergency Break-Glass Log
              </h3>
              <p className="text-xs text-slate-500">
                Audit trail of doctor identity, patient accessed, and stated medical emergency justification.
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/70 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-6">Emergency Doctor</th>
                <th className="py-3.5 px-4">Patient Accessed</th>
                <th className="py-3.5 px-4">Justification &amp; Stated Reason</th>
                <th className="py-3.5 px-4">Status</th>
                <th className="py-3.5 px-4">Session Issued</th>
                <th className="py-3.5 px-4">Expires At</th>
                <th className="py-3.5 px-6 text-right">Kill Switch</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs text-[#0F172A]">
              {loading ? (
                [...Array(3)].map((_, i) => (
                  <tr key={i} className="animate-pulse">
                    <td className="py-4 px-6"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-10 w-36 bg-slate-100 rounded-xl" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-44 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-4"><div className="h-6 w-20 bg-slate-100 rounded-lg" /></td>
                    <td className="py-4 px-6 text-right"><div className="h-8 w-20 bg-slate-100 rounded-lg ml-auto" /></td>
                  </tr>
                ))
              ) : sessions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center text-slate-400 space-y-2">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
                    <p className="font-semibold text-sm text-slate-700">No Emergency Break-Glass Sessions</p>
                    <p className="text-xs text-slate-400">No doctors have initiated emergency break-glass access yet.</p>
                  </td>
                </tr>
              ) : (
                sessions.map((sess) => {
                  const isActive = sess.session_status === "ACTIVE";

                  return (
                    <tr
                      key={sess.id}
                      className={`hover:bg-cyan-50/30 transition-colors ${
                        isActive ? "bg-rose-50/20" : ""
                      }`}
                    >
                      {/* Doctor */}
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-teal-100 text-[#0D9488] font-bold flex items-center justify-center text-xs shrink-0 font-heading">
                            DR
                          </div>
                          <div className="min-w-0">
                            <p className="font-heading font-bold text-xs text-[#0F172A] truncate">
                              Dr. {sess.doctor_name}
                            </p>
                            <p className="text-[10px] text-slate-400 font-mono truncate">{sess.doctor_email}</p>
                          </div>
                        </div>
                      </td>

                      {/* Patient */}
                      <td className="py-4 px-4">
                        <div className="min-w-0">
                          <p className="font-bold text-xs text-[#0F172A] truncate">{sess.patient_name}</p>
                          <p className="text-[10px] text-slate-400 font-mono truncate">{sess.patient_email}</p>
                        </div>
                      </td>

                      {/* Reason */}
                      <td className="py-4 px-4">
                        <div className="space-y-0.5 max-w-xs">
                          <span className="inline-block font-mono text-[9px] font-bold px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 border border-slate-200">
                            {sess.reason_code}
                          </span>
                          <p className="text-xs text-slate-600 truncate" title={sess.reason_text}>
                            {sess.reason_text || "Emergency clinical intervention"}
                          </p>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-4 px-4">
                        {isActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                            <Flame className="w-3 h-3 text-rose-600" /> ACTIVE
                          </span>
                        ) : sess.session_status === "TERMINATED" ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Ban className="w-3 h-3 text-amber-600" /> TERMINATED
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            <Clock className="w-3 h-3 text-slate-400" /> EXPIRED
                          </span>
                        )}
                      </td>

                      {/* Issued */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-500 font-mono">
                          {new Date(sess.issued_at).toLocaleString()}
                        </span>
                      </td>

                      {/* Expires */}
                      <td className="py-4 px-4">
                        <span className="text-xs text-slate-700 font-mono font-semibold">
                          {new Date(sess.expires_at).toLocaleString()}
                        </span>
                      </td>

                      {/* Kill Switch */}
                      <td className="py-4 px-6 text-right">
                        {isActive ? (
                          <button
                            onClick={() => setTerminatingSession(sess)}
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all cursor-pointer"
                            title="Immediate Kill Switch"
                          >
                            <Ban className="w-3.5 h-3.5" />
                            <span>Kill Session</span>
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ─── Terminate Confirmation Modal ─── */}
      {terminatingSession && (
        <div
          className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setTerminatingSession(null)}
        >
          <div
            className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <Flame className="w-5 h-5" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">
                  Kill Emergency Session
                </h3>
              </div>
              <button
                onClick={() => setTerminatingSession(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              You are terminating live break-glass access for{" "}
              <span className="font-bold text-[#0F172A]">Dr. {terminatingSession.doctor_name}</span> to{" "}
              <span className="font-bold text-[#0F172A]">{terminatingSession.patient_name}</span>'s records immediately.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Termination Justification</label>
              <textarea
                rows={3}
                placeholder="e.g. Session duration excessive, potential security anomaly, verified patient is stable..."
                value={terminationReason}
                onChange={(e) => setTerminationReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setTerminatingSession(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleTerminate}
                disabled={isProcessing}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
              >
                {isProcessing ? "Terminating..." : "Terminate Immediately"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
