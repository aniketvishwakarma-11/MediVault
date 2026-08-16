"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import {
  Search,
  Filter,
  Users,
  ShieldCheck,
  Lock,
  Clock,
  ArrowRight,
  ShieldAlert,
  CheckCircle2,
  X,
  Send,
  AlertCircle,
  XCircle,
  RefreshCw,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI, getConsentStatusLabel } from "@/lib/consent-api";
import type { PatientSearchResult, ConsentScope } from "@/types/consent";
import { mockDoctorPatients, DoctorDemoPatient } from "@/lib/doctorDemoData";

// ── Demo adapter: map DoctorDemoPatient → PatientSearchResult ───────────────
function demoToSearchResult(p: DoctorDemoPatient): PatientSearchResult {
  return {
    id: p.id,
    uhid: p.uhid,
    fullName: p.fullName,
    age: p.age,
    gender: p.gender,
    bloodGroup: p.bloodGroup,
    consentStatus: p.accessStatus === "APPROVED"
      ? "APPROVED"
      : p.accessStatus === "PENDING"
      ? "PENDING"
      : p.accessStatus === "DENIED"
      ? "DENIED"
      : "NONE",
  };
}

// ── Modal state type ─────────────────────────────────────────────────────────
interface AccessModalState {
  patient: PatientSearchResult;
  purpose: string;
  scope: ConsentScope;
  durationDays: string;
}

// ── Debounce hook ────────────────────────────────────────────────────────────
function useDebounce<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function DoctorPatientSearchPage() {
  const { userProfile, isDemo } = useAuth();

  // ── Search state ──────────────────────────────────────────────────────────
  const [patients, setPatients] = useState<PatientSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [bloodFilter, setBloodFilter] = useState("ALL");
  const [genderFilter, setGenderFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const debouncedQuery = useDebounce(searchQuery, 350);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [modal, setModal] = useState<AccessModalState | null>(null);
  const [requestSent, setRequestSent] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const currentDocName =
    userProfile?.displayName ||
    (userProfile?.email ? `Dr. ${userProfile.email.split("@")[0]}` : "Doctor");

  // ── Load patients ─────────────────────────────────────────────────────────
  const loadPatients = useCallback(async () => {
    // ── Demo mode: uses mock data when explicitly in demo mode ──────────────
    if (isDemo) {
      const q = debouncedQuery.toLowerCase();
      let list = mockDoctorPatients.map(demoToSearchResult);
      if (q) {
        list = list.filter(
          (p) =>
            p.fullName.toLowerCase().includes(q) ||
            p.uhid.toLowerCase().includes(q) ||
            p.bloodGroup.toLowerCase().includes(q) ||
            p.gender.toLowerCase().includes(q)
        );
      }
      if (bloodFilter !== "ALL") list = list.filter((p) => p.bloodGroup === bloodFilter);
      if (genderFilter !== "ALL") list = list.filter((p) => p.gender === genderFilter);
      setPatients(list);
      setTotalPages(1);
      return;
    }

    setIsLoading(true);
    setError(null);
    try {
      const { patients: results, pagination } = await ConsentAPI.searchPatients(
        debouncedQuery,
        {
          bloodGroup: bloodFilter !== "ALL" ? bloodFilter : undefined,
          gender: genderFilter !== "ALL" ? genderFilter : undefined,
        },
        page
      );

      setPatients(results || []);
      setTotalPages(pagination?.totalPages ?? 1);
    } catch {
      setError("Failed to search patients. Please check your connection.");
      setPatients([]);
    } finally {
      setIsLoading(false);
    }
  }, [isDemo, debouncedQuery, bloodFilter, genderFilter, page]);



  useEffect(() => {
    setPage(1);
  }, [debouncedQuery, bloodFilter, genderFilter]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  // ── Submit access request ──────────────────────────────────────────────────
  const handleSendConsentRequest = async () => {
    if (!modal) return;
    setSubmitting(true);
    setRequestError(null);

    if (isDemo) {
      // Demo mode: local state update
      setPatients((prev) =>
        prev.map((p) =>
          p.id === modal.patient.id ? { ...p, consentStatus: "PENDING" as const } : p
        )
      );
      setRequestSent(true);
      setTimeout(() => {
        setRequestSent(false);
        setModal(null);
      }, 2000);
      setSubmitting(false);
      return;
    }

    const { data, error: apiError } = await ConsentAPI.requestAccess(modal.patient.id, {
      purpose: modal.purpose.trim(),
      scope: modal.scope,
      durationDays: parseInt(modal.durationDays, 10),
    });

    setSubmitting(false);

    if (apiError || !data) {
      setRequestError(apiError || "Failed to send access request. Please try again.");
      return;
    }

    // Update local patient consent status to PENDING
    setPatients((prev) =>
      prev.map((p) =>
        p.id === modal.patient.id
          ? { ...p, consentStatus: "PENDING", consentId: data.id }
          : p
      )
    );
    setRequestSent(true);
    setTimeout(() => {
      setRequestSent(false);
      setModal(null);
    }, 2500);
  };

  // ── Status badge helper ───────────────────────────────────────────────────
  const ConsentBadge = ({ status }: { status: string }) => {
    if (status === "APPROVED" || status === "EMERGENCY_GRANTED") {
      return (
        <span className="text-xs text-[#065F46] font-semibold flex items-center gap-1.5 bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
          <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Consent Verified
        </span>
      );
    }
    if (status === "PENDING") {
      return (
        <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
          <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Request Pending
        </span>
      );
    }
    if (status === "DENIED") {
      return (
        <span className="text-xs text-rose-700 font-semibold flex items-center gap-1.5 bg-rose-50 px-2.5 py-1 rounded-full border border-rose-200">
          <XCircle className="w-3.5 h-3.5 text-rose-600" /> Access Denied
        </span>
      );
    }
    if (status === "REVOKED") {
      return (
        <span className="text-xs text-slate-600 font-semibold flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full border border-slate-200">
          <XCircle className="w-3.5 h-3.5 text-slate-500" /> Consent Revoked
        </span>
      );
    }
    if (status === "EXPIRED") {
      return (
        <span className="text-xs text-orange-700 font-semibold flex items-center gap-1.5 bg-orange-50 px-2.5 py-1 rounded-full border border-orange-200">
          <AlertCircle className="w-3.5 h-3.5 text-orange-600" /> Consent Expired
        </span>
      );
    }
    return (
      <span className="text-xs text-[#475569] flex items-center gap-1.5">
        <Lock className="w-3.5 h-3.5 text-slate-400" /> Records Locked
      </span>
    );
  };

  const canRequestAccess = (status: string) =>
    status === "NONE" || status === "DENIED" || status === "REVOKED" || status === "EXPIRED";
  const hasAccess = (status: string) => status === "APPROVED" || status === "EMERGENCY_GRANTED";
  const isPending = (status: string) => status === "PENDING";

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200/80 pb-4">
        <div>
          <h1 className="font-heading font-black text-2xl text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-[#0891B2]" /> Patient Search &amp; Consent Directory
          </h1>
          <p className="text-xs text-[#475569] mt-1">
            Search patient health profiles, inspect consent status, or send cryptographic access requests.
          </p>
        </div>

        <Link
          href="/doctor/emergency"
          className="self-start md:self-auto px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all shadow-xs flex items-center gap-2 min-h-[44px]"
        >
          <ShieldAlert className="w-4 h-4 text-rose-600" />
          <span>Bypass via Emergency QR Terminal</span>
        </Link>
      </div>

      {/* Search Bar & Filter Controls */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-center gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            {isLoading && (
              <RefreshCw className="w-3.5 h-3.5 text-[#0891B2] animate-spin absolute right-3.5 top-3.5" />
            )}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Patient Name, Health ID (MV-PAT-...), Email, Blood Group..."
              className="w-full pl-10 pr-10 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-sm focus:border-[#0891B2] focus:bg-white focus:ring-2 focus:ring-[#0891B2]/20 focus:outline-none placeholder:text-slate-400 transition-all min-h-[42px]"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-100 text-xs">
          <span className="text-[#475569] font-bold flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
            <Filter className="w-3.5 h-3.5 text-[#0891B2]" /> Filters:
          </span>

          <select
            value={bloodFilter}
            onChange={(e) => setBloodFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Blood Groups</option>
            {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bg) => (
              <option key={bg} value={bg}>{bg}</option>
            ))}
          </select>

          <select
            value={genderFilter}
            onChange={(e) => setGenderFilter(e.target.value)}
            className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-medium focus:border-[#0891B2] focus:outline-none min-h-[38px]"
          >
            <option value="ALL">All Genders</option>
            <option value="Male">Male</option>
            <option value="Female">Female</option>
            <option value="Other">Other</option>
          </select>

          {(searchQuery || bloodFilter !== "ALL" || genderFilter !== "ALL") && (
            <button
              onClick={() => { setSearchQuery(""); setBloodFilter("ALL"); setGenderFilter("ALL"); }}
              className="text-xs font-bold text-[#0891B2] hover:underline ml-auto"
            >
              Reset Filters
            </button>
          )}
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{error}</span>
          <button onClick={loadPatients} className="ml-auto font-bold underline">Retry</button>
        </div>
      )}

      {/* Empty State */}
      {!isLoading && !error && patients.length === 0 && (
        <div className="py-16 text-center space-y-3">
          <Users className="w-12 h-12 text-slate-200 mx-auto" />
          <h3 className="font-heading font-bold text-base text-[#0F172A]">No Patients Found</h3>
          <p className="text-xs text-[#475569] max-w-sm mx-auto">
            {searchQuery
              ? `No patients match "${searchQuery}". Try a different name or Health ID.`
              : "No patients are registered in the system yet."}
          </p>
        </div>
      )}

      {/* Patient Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {patients.map((patient) => (
          <div
            key={patient.id}
            className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs hover:shadow-md transition-all flex flex-col justify-between gap-4"
          >
            <div className="space-y-3.5">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-3">
                  {/* Avatar placeholder */}
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#0891B2]/20 to-teal-500/20 border border-[#0891B2]/20 shrink-0 flex items-center justify-center">
                    <span className="text-[#0891B2] font-bold text-lg">
                      {patient.fullName.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-heading font-bold text-base text-[#0F172A]">{patient.fullName}</h3>
                    <p className="text-xs text-slate-500 font-mono">{patient.uhid}</p>
                  </div>
                </div>

                {/* Consent status indicator */}
                <ConsentBadge status={patient.consentStatus} />
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50/80 p-3.5 rounded-2xl border border-slate-200/70 text-[#0F172A]">
                <div>
                  <span className="text-[#475569] block text-[10px] font-semibold">Age / Gender</span>
                  <strong className="text-[#0F172A]">
                    {patient.age > 0 ? `${patient.age} yrs` : "—"} • {patient.gender}
                  </strong>
                </div>
                <div>
                  <span className="text-[#475569] block text-[10px] font-semibold">Blood Group</span>
                  <strong className="text-rose-600 font-bold">{patient.bloodGroup}</strong>
                </div>
              </div>

              {/* Consent status explainer */}
              {patient.consentStatus !== "NONE" && patient.consentStatus !== "APPROVED" && (
                <div className="text-[11px] text-[#475569] px-1">
                  {getConsentStatusLabel(patient.consentStatus)}
                </div>
              )}
            </div>

            {/* Action footer */}
            <div className="pt-3.5 border-t border-slate-100 flex items-center justify-between">
              {hasAccess(patient.consentStatus) ? (
                <>
                  <span className="text-xs text-[#065F46] font-semibold flex items-center gap-1.5 bg-[#ECFDF5] px-2.5 py-1 rounded-full border border-[#A7F3D0]">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> Access Granted
                  </span>
                  <Link
                    href={`/doctor/patients/${patient.id}`}
                    className="px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs transition-all flex items-center gap-1.5 min-h-[38px]"
                  >
                    <span>Open EMR Profile</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </>
              ) : isPending(patient.consentStatus) ? (
                <>
                  <span className="text-xs text-amber-800 font-semibold flex items-center gap-1.5 bg-amber-50 px-2.5 py-1 rounded-full border border-amber-200">
                    <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" /> Awaiting Patient
                  </span>
                  <button
                    disabled
                    className="px-3.5 py-2 rounded-xl bg-slate-100 text-slate-400 text-xs font-semibold cursor-not-allowed min-h-[38px]"
                  >
                    Pending Response
                  </button>
                </>
              ) : (
                <>
                  <span className="text-xs text-[#475569] flex items-center gap-1.5">
                    <Lock className="w-3.5 h-3.5 text-slate-400" /> Records Locked
                  </span>
                  <button
                    onClick={() =>
                      setModal({
                        patient,
                        purpose: "Routine Clinical Consultation & Medical History Review",
                        scope: "Full Vault",
                        durationDays: "30",
                      })
                    }
                    className="px-4 py-2 rounded-xl bg-cyan-50 hover:bg-cyan-100 border border-cyan-200/80 text-[#0891B2] font-bold text-xs transition-all min-h-[38px]"
                  >
                    {canRequestAccess(patient.consentStatus) &&
                    patient.consentStatus !== "NONE"
                      ? "Re-request Access"
                      : "Request Patient Access"}
                  </button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3 pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-[#475569] font-medium">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Modal: Request Access */}
      {modal && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5 relative animate-in zoom-in-95 duration-200">
            <button
              onClick={() => { setModal(null); setRequestError(null); setRequestSent(false); }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1"
            >
              <X className="w-5 h-5" />
            </button>

            {requestSent ? (
              <div className="text-center py-6 space-y-3">
                <div className="w-12 h-12 rounded-full bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8 text-[#22C55E]" />
                </div>
                <h3 className="font-heading font-bold text-lg text-[#0F172A]">Request Dispatched!</h3>
                <p className="text-xs text-[#475569]">
                  Notification sent to{" "}
                  <strong className="text-[#0891B2]">{modal.patient.fullName}</strong>. You will be
                  notified as soon as they grant access.
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-1">
                  <h3 className="font-heading font-bold text-lg text-[#0F172A] flex items-center gap-2">
                    <Lock className="w-5 h-5 text-[#0891B2]" /> Request Record Access
                  </h3>
                  <p className="text-xs text-[#475569]">
                    Send a consent request to access{" "}
                    <strong className="text-[#0F172A]">{modal.patient.fullName}</strong>'s EHR records.
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5 text-[#0F172A]">
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Patient UHID:</span>
                    <span className="font-mono font-bold text-[#0891B2]">{modal.patient.uhid}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#475569]">Requested By:</span>
                    <span className="font-bold">{currentDocName}</span>
                  </div>
                </div>

                {requestError && (
                  <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{requestError}</span>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Access Scope
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    {(["Full Vault", "Lab Reports Only", "Timeline Only", "Emergency Only"] as ConsentScope[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setModal((m) => m ? { ...m, scope: s } : m)}
                        className={`p-2.5 rounded-xl border font-bold transition-all ${
                          modal.scope === s
                            ? "bg-cyan-50 border-[#0891B2] text-[#0891B2]"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                        }`}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Duration
                  </label>
                  <select
                    value={modal.durationDays}
                    onChange={(e) => setModal((m) => m ? { ...m, durationDays: e.target.value } : m)}
                    className="w-full px-3 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:outline-none"
                  >
                    <option value="1">24 Hours</option>
                    <option value="7">7 Days</option>
                    <option value="30">30 Days</option>
                    <option value="90">90 Days</option>
                    <option value="365">1 Year</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                    Clinical Purpose / Medical Justification
                  </label>
                  <textarea
                    rows={3}
                    value={modal.purpose}
                    onChange={(e) => setModal((m) => m ? { ...m, purpose: e.target.value } : m)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none placeholder:text-slate-400 transition-all"
                    placeholder="Enter reason for requesting patient records..."
                  />
                </div>

                <div className="flex items-center justify-end gap-3 pt-2">
                  <button
                    onClick={() => { setModal(null); setRequestError(null); }}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold min-h-[38px]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSendConsentRequest}
                    disabled={submitting || !modal.purpose.trim()}
                    className="px-5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[38px] disabled:opacity-60 disabled:cursor-not-allowed transition-all"
                  >
                    {submitting ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Send className="w-3.5 h-3.5" />
                    )}
                    <span>{submitting ? "Sending..." : "Broadcast Consent Request"}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
