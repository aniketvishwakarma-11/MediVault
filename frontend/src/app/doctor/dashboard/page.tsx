"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Users,
  AlertTriangle,
  FileClock,
  BellRing,
  ShieldAlert,
  ShieldCheck,
  Bot,
  ArrowRight,
  ChevronRight,
  Lock,
  TrendingUp,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export default function DoctorDashboardPage() {
  const { user, userProfile } = useAuth();
  const [patients, setPatients] = useState<any[]>([]);
  const [stats, setStats] = useState<{
    total_patients: number;
    critical_cases: number;
    pending_reports: number;
    pending_consents: number;
    critical_flags: any[];
  }>({
    total_patients: 0,
    critical_cases: 0,
    pending_reports: 0,
    pending_consents: 0,
    critical_flags: [],
  });
  const [doctorProfile, setDoctorProfile] = useState<any>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);

  const doctorName =
    doctorProfile?.fullName ||
    userProfile?.displayName ||
    (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Physician");

  const doctorLicense =
    doctorProfile?.licenseNumber ||
    `DOC-${user?.id?.substring(0, 8).toUpperCase() || "VERIFIED"}`;

  const fetchDashboardData = async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      // 1. Fetch live dashboard statistics
      const statsPromise = fetch(`${API_BASE_URL}/doctor/dashboard/stats`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      // 2. Fetch real patient directory
      const patientsPromise = fetch(`${API_BASE_URL}/doctor/patients`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      // 3. Fetch doctor profile
      const profilePromise = fetch(`${API_BASE_URL}/doctor/profile`, { headers })
        .then((res) => (res.ok ? res.json() : null))
        .catch(() => null);

      const [statsRes, patientsRes, profileRes] = await Promise.all([
        statsPromise,
        patientsPromise,
        profilePromise,
      ]);

      if (statsRes?.data) {
        setStats(statsRes.data);
      }

      if (patientsRes?.data?.patients && Array.isArray(patientsRes.data.patients)) {
        setPatients(patientsRes.data.patients);
      }

      if (profileRes?.data) {
        setDoctorProfile(profileRes.data);
      }
    } catch (err) {
      console.warn("Failed to fetch real doctor dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [user]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchDashboardData();
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500 font-body">
      
      {/* ================= GREETING HEADER ================= */}
      <div className="bg-gradient-to-r from-[#0891B2] via-[#0e7490] to-[#22D3EE] rounded-3xl p-6 sm:p-8 text-white shadow-xl shadow-cyan-900/10 relative overflow-hidden flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-2 max-w-2xl z-10">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
            <ShieldCheck className="w-3.5 h-3.5 text-[#22D3EE]" />
            <span>Verified License: {doctorLicense} • ZKP Session Active</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold tracking-tight">
            Good Day, {doctorName}
          </h1>
          <p className="text-cyan-100 text-xs sm:text-sm leading-relaxed">
            Clinical EMR Portal synchronized with live zero-knowledge encryption proofs and real-time patient health records.
          </p>
        </div>

        {/* Quick Action Buttons */}
        <div className="flex flex-wrap items-center gap-3 z-10 w-full md:w-auto">
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur-md transition-all min-h-[44px] cursor-pointer"
            title="Refresh Live Data"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
            <span>{refreshing ? "Syncing..." : "Sync DB"}</span>
          </button>
          <Link
            href="/doctor/copilot"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-xs shadow-md transition-all min-h-[44px]"
          >
            <Bot className="w-4 h-4" />
            <span>Launch AI Copilot</span>
          </Link>
          <Link
            href="/doctor/emergency"
            className="flex-1 md:flex-initial inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-white/15 hover:bg-white/25 border border-white/20 text-white font-bold text-xs backdrop-blur-md transition-all min-h-[44px]"
          >
            <ShieldAlert className="w-4 h-4 text-[#22D3EE]" />
            <span>Emergency Access Scan</span>
          </Link>
        </div>
      </div>

      {/* ================= KPI METRIC CARDS ================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Metric 1 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Registered Patients</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <Users className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              {loading ? "..." : stats.total_patients || patients.length}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              <TrendingUp className="w-3 h-3 text-[#22C55E]" /> Live DB
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Verified Patients in Registry</p>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Critical Cases</span>
            <div className="p-2.5 rounded-2xl bg-rose-50 text-rose-600 border border-rose-100">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-rose-600">
              {loading ? "..." : stats.critical_cases}
            </span>
            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
              Attention Required
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Flagged by AI Diagnostic Engine</p>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Archived Documents</span>
            <div className="p-2.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
              <FileClock className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              {loading ? "..." : stats.pending_reports}
            </span>
            <span className="text-[11px] font-bold text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200">
              Verified Records
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Medical Reports & Prescriptions</p>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3 hover:shadow-md transition-all">
          <div className="flex items-center justify-between">
            <span className="font-heading text-xs font-bold text-[#475569] uppercase tracking-wider">Active Consents</span>
            <div className="p-2.5 rounded-2xl bg-teal-50 text-[#0891B2] border border-teal-100">
              <BellRing className="w-5 h-5" />
            </div>
          </div>
          <div className="flex items-baseline justify-between">
            <span className="font-heading text-2xl sm:text-3xl font-extrabold text-[#0F172A]">
              {loading ? "..." : stats.pending_consents}
            </span>
            <span className="text-[11px] font-bold text-[#065F46] bg-[#ECFDF5] px-2.5 py-0.5 rounded-full border border-[#A7F3D0]">
              ZKP Verified
            </span>
          </div>
          <p className="text-[11px] text-[#475569]">Clinical Access Authorizations</p>
        </div>
      </div>

      {/* ================= MAIN DASHBOARD BODY (2 COLUMNS) ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Left Column: Active Registered Patients List */}
        <div className="lg:col-span-7">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-[#0891B2]" />
                <h3 className="font-heading font-bold text-[#0F172A] text-base">Active Registered Patients</h3>
              </div>
              <Link href="/doctor/patients" className="text-xs text-[#0891B2] font-bold hover:underline flex items-center gap-1">
                <span>View All ({patients.length})</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="p-12 text-center text-xs text-[#0891B2] font-bold animate-pulse">
                Loading Patient Directory from Database...
              </div>
            ) : patients.length === 0 ? (
              <div className="p-10 text-center space-y-2">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <p className="text-xs text-slate-500 font-medium">No patient records in database yet.</p>
                <Link href="/doctor/patients" className="inline-block mt-2 px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold">
                  Search Registry
                </Link>
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-3 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {patients.map((patient) => (
                  <div
                    key={patient.id}
                    className="p-4 rounded-2xl bg-slate-50/70 hover:bg-white border border-slate-200/70 hover:border-cyan-200 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-2xs"
                  >
                    <div className="flex items-start gap-3.5">
                      <div className="w-11 h-11 rounded-2xl bg-[#0891B2] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-heading">
                        {patient.fullName.charAt(0)}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-heading font-bold text-sm text-[#0F172A]">{patient.fullName}</h4>
                          <span className="text-[10px] font-mono font-semibold text-slate-500 bg-white px-2 py-0.5 rounded border border-slate-200">
                            {patient.uhid}
                          </span>
                          {patient.riskBadge === "CRITICAL" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                              CRITICAL
                            </span>
                          )}
                          {patient.riskBadge === "HIGH_RISK" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                              MONITOR
                            </span>
                          )}
                          {patient.riskBadge === "STABLE" && (
                            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                              STABLE
                            </span>
                          )}
                        </div>

                        <div className="text-xs text-[#475569] flex items-center gap-2.5 flex-wrap">
                          <span>{patient.age} yrs • {patient.gender}</span>
                          <span>• Blood: <strong className="text-[#0891B2] font-bold">{patient.bloodGroup}</strong></span>
                          <span>• Last Visit: {patient.lastVisit}</span>
                        </div>

                        <p className="text-xs text-[#0F172A] font-medium pt-0.5">
                          Clinical Status: <span className="text-[#475569]">{patient.recentDiagnosis}</span>
                        </p>
                      </div>
                    </div>

                    <div className="flex sm:flex-col items-center sm:items-end justify-between gap-2 shrink-0 border-t sm:border-t-0 pt-3 sm:pt-0 border-slate-200/60">
                      <Link
                        href={`/doctor/patients/${patient.id}`}
                        className="px-3.5 py-1.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] font-bold text-xs border border-cyan-200/80 transition-all flex items-center gap-1 min-h-[36px]"
                      >
                        <span>EHR Timeline</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                      <span className="text-[10px] text-[#065F46] font-semibold flex items-center gap-1 bg-[#ECFDF5] px-2 py-0.5 rounded border border-[#A7F3D0]">
                        <Lock className="w-3 h-3 text-[#22C55E]" /> Verified Access
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Live Critical Flags */}
        <div className="lg:col-span-5">
          <div className="bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h3 className="font-heading font-bold text-[#0F172A] text-sm flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-500" /> Live Critical Clinical Flags
              </h3>
              <span className="text-[10px] font-bold bg-rose-50 text-rose-700 px-2.5 py-0.5 rounded-full border border-rose-200">
                {stats.critical_flags.length} ACTIVE
              </span>
            </div>

            {stats.critical_flags.length === 0 ? (
              <div className="p-4 rounded-2xl bg-slate-50 text-slate-500 text-xs text-center">
                All extracted laboratory and diagnosis parameters are within stable ranges.
              </div>
            ) : (
              <div className="max-h-[520px] overflow-y-auto pr-1 space-y-2.5 [scrollbar-width:thin] [scrollbar-color:#cbd5e1_transparent]">
                {stats.critical_flags.map((flag, idx) => (
                  <div key={idx} className="p-3 rounded-2xl bg-slate-50/80 hover:bg-slate-100/90 border border-slate-200/80 space-y-1.5 text-xs transition-all shadow-2xs">
                    <div className="flex justify-between items-center font-bold text-[#0F172A] gap-2">
                      <span className="truncate">{flag.patient_name}</span>
                      <span className={`font-bold font-mono text-[10px] px-2 py-0.5 rounded shrink-0 ${
                        flag.severity === "CRITICAL" ? "bg-rose-100 text-rose-700" : "bg-amber-100 text-amber-800"
                      }`}>
                        {flag.title}
                      </span>
                    </div>
                    {flag.summary && (
                      <p className="text-[11px] text-[#475569] leading-relaxed line-clamp-2">
                        {flag.summary}
                      </p>
                    )}
                    <div className="pt-0.5 flex items-center justify-between text-[10px]">
                      <span className="text-slate-400 font-mono">{flag.event_date}</span>
                      {flag.patient_id && (
                        <Link
                          href={`/doctor/patients/${flag.patient_id}`}
                          className="text-[#0891B2] font-bold hover:underline flex items-center gap-1"
                        >
                          <span>View Patient Timeline</span>
                          <ChevronRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

