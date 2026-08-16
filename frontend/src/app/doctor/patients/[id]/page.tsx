"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  User,
  Activity,
  Sparkles,
  Bot,
  FileText,
  Clock,
  Pill,
  ShieldCheck,
  AlertTriangle,
  ChevronRight,
  TrendingUp,
  FileSpreadsheet,
  Calendar,
  Lock,
  RefreshCw,
  ShieldAlert,
  AlertCircle,
  XCircle,
  Send,
  X,
  CheckCircle2,
} from "lucide-react";
import {
  mockDoctorPatients,
  mockDoctorTimelineEvents,
  mockDoctorConsultations,
  mockDoctorPrescriptions,
} from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import type { ConsentStatusResult, PatientMinimalProfile, ConsentScope } from "@/types/consent";

// ── Consent gate — blocks access without approval ───────────────────────────

function ConsentGate({
  patient,
  onRequestAccess,
  consentStatus,
}: {
  patient: { id: string; fullName: string; uhid: string };
  onRequestAccess: () => void;
  consentStatus: ConsentStatusResult;
}) {
  const isExpired = consentStatus.status === "EXPIRED";
  const isDenied  = consentStatus.status === "DENIED";
  const isPending = consentStatus.status === "PENDING";
  const isRevoked = consentStatus.status === "REVOKED";

  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-5 text-center max-w-md mx-auto">
      <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 flex items-center justify-center">
        <Lock className="w-8 h-8 text-amber-600" />
      </div>
      <div>
        <h2 className="font-heading font-bold text-xl text-[#0F172A]">
          {isPending  ? "Request Pending" :
           isDenied   ? "Access Denied" :
           isRevoked  ? "Consent Revoked" :
           isExpired  ? "Consent Expired" :
                        "Access Restricted"}
        </h2>
        <p className="text-sm text-[#475569] mt-2 max-w-sm mx-auto">
          {isPending
            ? `Your access request is awaiting approval from ${patient.fullName}.`
            : isDenied
            ? `${patient.fullName} has denied your access request. You may send a new request with a different justification.`
            : isRevoked
            ? "The patient has revoked your access. You may submit a new request."
            : isExpired
            ? "Your consent authorization has expired. Please request a new access period."
            : `You need patient consent before accessing ${patient.fullName}'s medical records.`}
        </p>
        <p className="text-xs font-mono text-slate-400 mt-1">{patient.uhid}</p>
      </div>

      <div className="flex items-center gap-3 flex-wrap justify-center pt-2">
        <Link
          href="/doctor/patients"
          className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all min-h-[40px]"
        >
          ← Back to Search
        </Link>
        {!isPending && (
          <button
            onClick={onRequestAccess}
            className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[40px] transition-all"
          >
            <Send className="w-3.5 h-3.5" />
            {isDenied || isRevoked || isExpired ? "Re-request Access" : "Request Patient Access"}
          </button>
        )}
        <Link
          href="/doctor/emergency"
          className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px]"
        >
          <ShieldAlert className="w-3.5 h-3.5" /> Emergency Access
        </Link>
      </div>
    </div>
  );
}

// ── Request access modal ─────────────────────────────────────────────────────
function AccessRequestModal({
  patientId,
  patientName,
  onClose,
  onSuccess,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const [purpose, setPurpose] = useState("Routine Clinical Consultation & Medical History Review");
  const [scope, setScope] = useState<ConsentScope>("Full Vault");
  const [durationDays, setDurationDays] = useState("30");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async () => {
    if (!purpose.trim()) return;
    setSubmitting(true);
    setError(null);
    const { data, error: apiError } = await ConsentAPI.requestAccess(patientId, {
      purpose: purpose.trim(),
      scope,
      durationDays: parseInt(durationDays, 10),
    });
    setSubmitting(false);
    if (apiError || !data) {
      setError(apiError || "Failed to send request. Please try again.");
      return;
    }
    setSent(true);
    setTimeout(onSuccess, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="max-w-md w-full p-6 rounded-3xl bg-white border border-slate-200 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200 relative">
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1">
          <X className="w-5 h-5" />
        </button>

        {sent ? (
          <div className="text-center py-6 space-y-3">
            <CheckCircle2 className="w-10 h-10 text-[#22C55E] mx-auto" />
            <h3 className="font-heading font-bold text-lg text-[#0F172A]">Request Dispatched!</h3>
            <p className="text-xs text-[#475569]">
              Notification sent to <strong className="text-[#0891B2]">{patientName}</strong>.
            </p>
          </div>
        ) : (
          <>
            <h3 className="font-heading font-bold text-lg text-[#0F172A] flex items-center gap-2">
              <Lock className="w-5 h-5 text-[#0891B2]" /> Request Record Access
            </h3>

            {error && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Access Scope</label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(["Full Vault", "Lab Reports Only", "Timeline Only", "Emergency Only"] as ConsentScope[]).map((s) => (
                  <button
                    key={s} type="button" onClick={() => setScope(s)}
                    className={`p-2.5 rounded-xl border font-bold transition-all ${
                      scope === s
                        ? "bg-cyan-50 border-[#0891B2] text-[#0891B2]"
                        : "bg-slate-50 border-slate-200 text-slate-600"
                    }`}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Duration</label>
              <select
                value={durationDays}
                onChange={(e) => setDurationDays(e.target.value)}
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
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Clinical Justification</label>
              <textarea
                rows={3}
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-[#0891B2] focus:outline-none"
              />
            </div>

            <div className="flex items-center justify-end gap-3">
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold min-h-[38px]">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !purpose.trim()}
                className="px-5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[38px] disabled:opacity-60 transition-all"
              >
                {submitting ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                {submitting ? "Sending..." : "Send Consent Request"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DoctorPatientOverviewPage() {
  const params = useParams();
  const patientId = (params?.id as string) || "pat-1001";
  const { user, userProfile, isDemo } = useAuth();
  const currentDocName =
    userProfile?.displayName ||
    (user?.email ? `Dr. ${user.email.split("@")[0]}` : "Dr. Authenticated Doctor");

  const [patient, setPatient] = useState<any>(null);
  const [consentStatus, setConsentStatus] = useState<ConsentStatusResult | null>(null);
  const [loading, setLoading]   = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"brief" | "overview" | "timeline">("brief");

  const loadData = useCallback(async () => {
    setLoading(true);

    if (isDemo) {
      // Demo mode: use mock data with hardcoded approved status
      const demoPatient =
        mockDoctorPatients.find((p) => p.id === patientId) || mockDoctorPatients[0];
      setPatient(demoPatient);
      setConsentStatus({
        patientId: demoPatient.id,
        granteeId: "demo-doctor",
        hasAccess: demoPatient.accessStatus === "APPROVED" || demoPatient.accessStatus === "EMERGENCY_GRANTED",
        status: (demoPatient.accessStatus as any) === "EMERGENCY_GRANTED" ? "APPROVED"
          : (demoPatient.accessStatus as any) === "PENDING" ? "PENDING"
          : (demoPatient.accessStatus as any) === "DENIED" ? "DENIED"
          : demoPatient.accessStatus === "APPROVED" ? "APPROVED"
          : "NONE",
      });
      setLoading(false);
      return;
    }

    // Real mode: fetch consent status + minimal profile in parallel
    const [consentRes, profileRes] = await Promise.all([
      ConsentAPI.getConsentStatus(patientId),
      ConsentAPI.getPatientProfile(patientId),
    ]);

    setConsentStatus(consentRes.data);

    if (profileRes.data) {
      const p = profileRes.data;
      setPatient({
        id: p.id,
        uhid: p.uhid,
        fullName: p.fullName,
        age: p.age,
        gender: p.gender,
        bloodGroup: p.bloodGroup,
        avatarUrl: p.avatarUrl,
        phone: p.phone || "Not shared",
        email: p.email || "Not shared",
        allergies: p.allergies || ["Not available without consent"],
        chronicConditions: p.chronicConditions || ["Not available without consent"],
        emergencyContact: p.emergencyContact || "Not available",
        bmi: p.bmi,
        riskBadge: "STABLE",
        recentDiagnosis: "Requires consent to view",
        currentMedications: [],
        lastVisit: "—",
        accessStatus: consentRes.data?.status ?? "NONE",
        primaryDoctor: currentDocName,
      });
    }

    setLoading(false);
  }, [isDemo, patientId, currentDocName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-[#0891B2] animate-spin mx-auto" />
        <p className="text-xs text-[#475569] mt-3 font-mono animate-pulse">
          Verifying patient access authorization...
        </p>
      </div>
    );
  }

  // Build a minimal stub for the consent gate even if profile failed to load
  const patientStub = patient ?? {
    id: patientId,
    fullName: "Patient",
    uhid: `MV-PAT-${patientId.substring(0, 5).toUpperCase()}`,
  };

  // ── Consent gate: block unauthorized access ─────────────────────────────
  const resolvedConsent = consentStatus ?? {
    patientId,
    granteeId: "unknown",
    hasAccess: false,
    status: "NONE" as const,
  };

  if (!isDemo && !resolvedConsent.hasAccess) {
    return (
      <>
        <ConsentGate
          patient={patientStub}
          consentStatus={resolvedConsent}
          onRequestAccess={() => setShowModal(true)}
        />
        {showModal && (
          <AccessRequestModal
            patientId={patientId}
            patientName={patientStub.fullName}
            onClose={() => setShowModal(false)}
            onSuccess={() => { setShowModal(false); loadData(); }}
          />
        )}
      </>
    );
  }

  const activeConsent = resolvedConsent.hasAccess;
  const timelineEvents = isDemo
    ? mockDoctorTimelineEvents.filter((e) => e.patientId === patient.id)
    : [];
  const consultations = isDemo
    ? mockDoctorConsultations.filter((c) => c.patientId === patient.id)
    : [];
  const prescriptions = isDemo
    ? mockDoctorPrescriptions.filter((p) => p.patientId === patient.id)
    : [];

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Patient Header */}
      <div className="p-6 md:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs relative overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            {patient.avatarUrl ? (
              <div className="w-16 h-16 rounded-2xl bg-slate-200 border border-slate-300/80 overflow-hidden shrink-0 shadow-xs">
                <img src={patient.avatarUrl} alt={patient.fullName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#0891B2]/20 to-teal-500/20 border border-[#0891B2]/20 flex items-center justify-center shrink-0">
                <span className="font-bold text-2xl text-[#0891B2]">
                  {patient.fullName.charAt(0).toUpperCase()}
                </span>
              </div>
            )}
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="font-heading font-extrabold text-2xl text-[#0F172A] tracking-tight">
                  {patient.fullName}
                </h1>
                <span className="text-xs text-slate-500 font-mono bg-slate-50 px-2 py-0.5 rounded-md border border-slate-200">
                  {patient.uhid}
                </span>
                {activeConsent && (
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0] flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5 text-[#22C55E]" /> CONSENT ACTIVE
                    {resolvedConsent.consentHash && (
                      <span className="text-[#065F46]/60 font-mono ml-1">
                        #{resolvedConsent.consentHash.substring(0, 6)}
                      </span>
                    )}
                  </span>
                )}
              </div>
              <p className="text-xs text-[#475569]">
                {patient.age} yrs · {patient.gender} · Blood Group:{" "}
                <strong className="text-rose-600">{patient.bloodGroup}</strong>
              </p>
              <p className="text-xs text-slate-400 font-mono">
                BMI: {patient.bmi ?? "—"} · Emergency:{" "}
                <span className="text-rose-500">{patient.emergencyContact}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/doctor/patients/${patient.id}/consultation`}
              className="px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 transition-all min-h-[40px]"
            >
              <Activity className="w-3.5 h-3.5" /> New Consultation
            </Link>
            <Link
              href={`/doctor/patients/${patient.id}/prescription`}
              className="px-4 py-2.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 text-emerald-700 font-bold text-xs flex items-center gap-1.5 transition-all min-h-[40px]"
            >
              <Pill className="w-3.5 h-3.5" /> Prescribe
            </Link>
            <Link
              href="/doctor/patients"
              className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-all min-h-[40px]"
            >
              ← Patient Directory
            </Link>
          </div>
        </div>
      </div>

      {/* Consent hash verification info */}
      {activeConsent && resolvedConsent.blockchainTxHash && (
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-mono flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>
            Consent verified on-chain · TX: {resolvedConsent.blockchainTxHash.substring(0, 20)}...
            {resolvedConsent.expiresAt && (
              <span className="text-slate-400 ml-2">
                · Expires: {new Date(resolvedConsent.expiresAt).toLocaleDateString()}
              </span>
            )}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit">
        {(["brief", "overview", "timeline"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all capitalize ${
              activeTab === tab
                ? "bg-[#0891B2] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab === "brief" ? "AI Brief" : tab === "overview" ? "Clinical Data" : "Timeline"}
          </button>
        ))}
      </div>

      {/* ── Tab: AI Brief ─────────────────────────────────────────────────── */}
      {activeTab === "brief" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
          <h2 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
            <Bot className="w-5 h-5 text-violet-600" /> AI Clinical Brief
          </h2>

          {isDemo ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900 space-y-2">
                <p className="font-bold text-sm">
                  {patient.recentDiagnosis || "Type 2 Diabetes & Mild Iron Anemia"}
                </p>
                <p className="text-violet-700">
                  Patient presents with chronic conditions. Current medication regimen is stable. Monitoring required
                  for HbA1c and hemoglobin levels. Last consultation noted controlled glycemic profile.
                </p>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                  <Pill className="w-3.5 h-3.5 text-[#0891B2]" /> Current Medications
                </h3>
                <div className="space-y-1.5">
                  {(patient.currentMedications || []).map((med: string) => (
                    <div key={med} className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                      <div className="w-2 h-2 rounded-full bg-[#0891B2]" />
                      <span className="font-medium text-[#0F172A]">{med}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Allergies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(patient.allergies || []).map((a: string) => (
                    <span key={a} className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
                      {a}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="text-xs font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-rose-500" /> Chronic Conditions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {(patient.chronicConditions || []).map((c: string) => (
                    <span key={c} className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-full">
                      {c}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {patient.allergies && patient.allergies[0] !== "Not available without consent" && (
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                    <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Allergies
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.allergies.map((a: string) => (
                      <span key={a} className="px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-full">
                        {a}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {patient.chronicConditions && patient.chronicConditions[0] !== "Not available without consent" && (
                <div>
                  <h3 className="text-xs font-bold text-[#0F172A] mb-2 flex items-center gap-1.5">
                    <Activity className="w-3.5 h-3.5 text-rose-500" /> Chronic Conditions
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {patient.chronicConditions.map((c: string) => (
                      <span key={c} className="px-2.5 py-1 bg-rose-50 border border-rose-200 text-rose-800 text-xs font-bold rounded-full">
                        {c}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-700">
                <p className="font-bold mb-1">Full AI Brief Available</p>
                <p>The complete AI health summary, diagnoses, medications, and clinical intelligence is accessible through the patient's documents section.</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Clinical Data ────────────────────────────────────────────── */}
      {activeTab === "overview" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {consultations.length > 0 ? (
            consultations.map((c) => (
              <div key={c.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-heading font-bold text-sm text-[#0F172A]">{c.diagnosis}</h3>
                  <span className="text-xs text-slate-400 font-mono">{c.date}</span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[#475569]">BP</span>
                    <strong className="block text-[#0F172A]">{c.vitals.bloodPressure}</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[#475569]">HR</span>
                    <strong className="block text-[#0F172A]">{c.vitals.heartRate} bpm</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[#475569]">SpO2</span>
                    <strong className="block text-[#0F172A]">{c.vitals.spO2}%</strong>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-xl">
                    <span className="text-[#475569]">Temp</span>
                    <strong className="block text-[#0F172A]">{c.vitals.temperature}°F</strong>
                  </div>
                </div>
                <p className="text-xs text-[#475569] line-clamp-2">{c.treatmentPlan}</p>
                <p className="text-xs text-amber-700 bg-amber-50 px-3 py-1.5 rounded-xl border border-amber-200">
                  Follow-up: {c.followUpDate}
                </p>
              </div>
            ))
          ) : (
            <div className="col-span-2 py-10 text-center text-xs text-[#475569]">
              <FileText className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No consultation records available.
            </div>
          )}
        </div>
      )}

      {/* ── Tab: Timeline ─────────────────────────────────────────────────── */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs">
          <h2 className="font-heading font-bold text-base text-[#0F172A] mb-5 flex items-center gap-2">
            <Clock className="w-5 h-5 text-[#0891B2]" /> Clinical Timeline
          </h2>
          {timelineEvents.length > 0 ? (
            <div className="space-y-4">
              {timelineEvents.map((event) => (
                <div key={event.id} className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#0891B2] mt-1 shrink-0" />
                    <div className="w-px flex-1 bg-slate-200 mt-1" />
                  </div>
                  <div className="pb-4 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-sm text-[#0F172A]">{event.title}</h4>
                      <span className="text-xs text-slate-400 font-mono shrink-0">{event.date}</span>
                    </div>
                    <p className="text-xs text-[#475569] mt-1">{event.summary}</p>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {event.doctorName} · {event.hospital}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-[#475569]">
              <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No timeline events available.
            </div>
          )}
        </div>
      )}

      {/* Request access modal */}
      {showModal && (
        <AccessRequestModal
          patientId={patientId}
          patientName={patientStub.fullName}
          onClose={() => setShowModal(false)}
          onSuccess={() => { setShowModal(false); loadData(); }}
        />
      )}
    </div>
  );
}
