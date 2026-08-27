"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import {
  Stethoscope,
  CheckCircle2,
  XCircle,
  Clock,
  Building2,
  ShieldCheck,
  ShieldAlert,
  Search,
  RefreshCw,
  X,
  AlertTriangle,
  ChevronRight,
  ArrowLeft,
  FileCheck,
  Award,
  Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface DoctorRecord {
  doctor_id: string;
  user_id: string;
  license_number: string;
  specialization: string;
  hospital_name?: string;
  registration_council?: string;
  experience_years?: number;
  verification_status: string;
  created_at: string;
  full_name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
}

export default function DoctorVerificationPage() {
  const { user } = useAuth();
  const [doctors, setDoctors] = useState<DoctorRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);

  // Reject modal state
  const [rejectingDoctor, setRejectingDoctor] = useState<DoctorRecord | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [actionMessage, setActionMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const fetchPendingDoctors = useCallback(async () => {
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/doctors/pending`, { headers });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json?.data?.doctors) {
        setDoctors(json.data.doctors);
      }
    } catch (err) {
      console.warn("[DoctorVerification] Failed to fetch pending doctors:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchPendingDoctors();
  }, [fetchPendingDoctors]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchPendingDoctors();
  };

  const handleVerify = async (doctorId: string, doctorName: string) => {
    setProcessingId(doctorId);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/doctors/${doctorId}/verify`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ status: "VERIFIED" }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setActionMessage({
        type: "success",
        text: `Doctor credentials for Dr. ${doctorName} have been verified & approved!`,
      });
      setTimeout(() => setActionMessage(null), 5000);

      // Remove from pending list
      setDoctors((prev) => prev.filter((d) => d.doctor_id !== doctorId && d.user_id !== doctorId));
    } catch (err: any) {
      setActionMessage({ type: "error", text: `Verification failed: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectingDoctor) return;
    setProcessingId(rejectingDoctor.doctor_id);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/doctors/${rejectingDoctor.doctor_id}/verify`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({
          status: "REJECTED",
          rejection_reason: rejectionReason.trim() || "Incomplete credentials or license verification failed.",
        }),
      });

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      setActionMessage({
        type: "success",
        text: `Credentials for Dr. ${rejectingDoctor.full_name} have been marked as REJECTED.`,
      });
      setTimeout(() => setActionMessage(null), 5000);

      setDoctors((prev) =>
        prev.filter(
          (d) => d.doctor_id !== rejectingDoctor.doctor_id && d.user_id !== rejectingDoctor.doctor_id
        )
      );
      setRejectingDoctor(null);
      setRejectionReason("");
    } catch (err: any) {
      setActionMessage({ type: "error", text: `Rejection failed: ${err.message}` });
    } finally {
      setProcessingId(null);
    }
  };

  return (
    <div className="space-y-7 animate-in fade-in duration-500 font-body">

      {/* ─── Breadcrumb & Header ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <Link
            href="/admin/users"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-[#0891B2] font-semibold transition-colors mb-1"
          >
            <ArrowLeft className="w-3.5 h-3.5" /> Back to User Directory
          </Link>
          <h1 className="font-heading font-extrabold text-2xl sm:text-3xl text-[#0F172A] tracking-tight flex items-center gap-3">
            Physician Credential Verification
            <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
              {doctors.length} Pending
            </span>
          </h1>
          <p className="text-sm text-slate-500">
            Review submitted medical licenses, medical council registrations, and clinical credentials.
          </p>
        </div>

        <button
          onClick={handleRefresh}
          disabled={refreshing}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs shadow-xs transition-all min-h-[40px] cursor-pointer"
        >
          <RefreshCw className={`w-4 h-4 text-[#0891B2] ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? "Syncing..." : "Refresh Queue"}
        </button>
      </div>

      {/* ─── Action Alert Toast ─── */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border flex items-center justify-between animate-in fade-in ${
            actionMessage.type === "success"
              ? "bg-emerald-50 border-emerald-200 text-emerald-800"
              : "bg-rose-50 border-rose-200 text-rose-800"
          }`}
        >
          <div className="flex items-center gap-2.5 text-xs font-bold">
            {actionMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="opacity-70 hover:opacity-100 cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ─── Doctors Review Queue Cards ─── */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-slate-100" />
                <div className="space-y-1.5 flex-1">
                  <div className="h-4 bg-slate-100 rounded w-1/2" />
                  <div className="h-3 bg-slate-100 rounded w-1/3" />
                </div>
              </div>
              <div className="h-20 bg-slate-50 rounded-2xl" />
              <div className="h-10 bg-slate-100 rounded-xl" />
            </div>
          ))}
        </div>
      ) : doctors.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 border border-slate-200/80 shadow-xs text-center space-y-3">
          <div className="w-16 h-16 rounded-3xl bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="font-heading font-bold text-lg text-[#0F172A]">
            Verification Queue Clear
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            All submitted doctor applications and medical licenses have been reviewed and processed.
          </p>
          <div className="pt-2">
            <Link
              href="/admin/users?role=doctor"
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-50 text-[#0891B2] font-bold text-xs hover:bg-cyan-100 transition-colors"
            >
              View Verified Doctors Directory <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {doctors.map((doc) => {
            const initials = doc.full_name
              ? doc.full_name
                  .split(" ")
                  .map((n) => n[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()
              : "MD";
            const isProcessing = processingId === doc.doctor_id || processingId === doc.user_id;

            return (
              <div
                key={doc.doctor_id || doc.user_id}
                className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs hover:shadow-md transition-all space-y-5 flex flex-col justify-between"
              >
                <div className="space-y-4">
                  {/* Top info */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#22D3EE] text-white font-bold flex items-center justify-center text-sm shadow-xs shrink-0 font-heading">
                        {initials}
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-heading font-bold text-base text-[#0F172A] truncate">
                          Dr. {doc.full_name}
                        </h3>
                        <p className="text-xs text-slate-500 font-mono truncate">{doc.email}</p>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      PENDING REVIEW
                    </span>
                  </div>

                  {/* Credential Attributes */}
                  <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-200/70 space-y-2.5 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Award className="w-3.5 h-3.5 text-[#0891B2]" /> Medical License Number
                      </span>
                      <span className="font-bold font-mono text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {doc.license_number || "Not Provided"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Stethoscope className="w-3.5 h-3.5 text-[#0891B2]" /> Specialization
                      </span>
                      <span className="font-semibold text-slate-800">
                        {doc.specialization || "General Practice"}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-slate-500 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-[#0891B2]" /> Hospital Affiliation
                      </span>
                      <span className="font-semibold text-slate-800">
                        {doc.hospital_name || "Independent Practitioner"}
                      </span>
                    </div>

                    {doc.experience_years !== undefined && doc.experience_years > 0 && (
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500 flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-[#0891B2]" /> Clinical Experience
                        </span>
                        <span className="font-semibold text-slate-800">
                          {doc.experience_years} Years
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Review Decision Buttons */}
                <div className="pt-2 flex items-center gap-3 border-t border-slate-100">
                  <button
                    onClick={() => setRejectingDoctor(doc)}
                    disabled={isProcessing}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-rose-200 text-rose-700 hover:bg-rose-50 text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
                  >
                    <XCircle className="w-4 h-4" /> Reject
                  </button>
                  <button
                    onClick={() => handleVerify(doc.doctor_id || doc.user_id, doc.full_name)}
                    disabled={isProcessing}
                    className="flex-1 inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-md transition-all cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" /> Approve &amp; Verify
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ─── Rejection Reason Modal ─── */}
      {rejectingDoctor && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-rose-50 text-rose-600">
                  <XCircle className="w-4 h-4" />
                </div>
                <h3 className="font-heading font-bold text-[#0F172A] text-base">
                  Reject Application
                </h3>
              </div>
              <button
                onClick={() => setRejectingDoctor(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              You are rejecting the physician credentials for{" "}
              <span className="font-bold text-[#0F172A]">Dr. {rejectingDoctor.full_name}</span>. Please specify a reason for the record.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-slate-700">Rejection Reason</label>
              <textarea
                rows={3}
                placeholder="e.g. License number unverified with state medical council, illegible document..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] placeholder-slate-400 focus:outline-none focus:border-rose-400 focus:bg-white transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setRejectingDoctor(null)}
                className="px-4 py-2.5 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleReject}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-md transition-all cursor-pointer"
              >
                Confirm Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
