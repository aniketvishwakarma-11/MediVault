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
  Download,
  Eye,
  Stethoscope,
  Building2,
  FlaskConical,
  Flame,
  ExternalLink,
} from "lucide-react";
import {
  mockDoctorPatients,
  mockDoctorTimelineEvents,
  mockDoctorPrescriptions,
} from "@/lib/doctorDemoData";
import { useAuth } from "@/context/AuthContext";
import { ConsentAPI } from "@/lib/consent-api";
import { TimelineAPI } from "@/lib/timeline-api";
import { supabase } from "@/lib/supabase";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";
import type { ConsentStatusResult, PatientMinimalProfile, ConsentScope } from "@/types/consent";
import type { ClinicalEvent } from "@/types/timeline";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ── Calculate BMI Helper ────────────────────────────────────────────────────
function computeBmiDisplay(
  bmi?: string | number | null,
  height?: string | null,
  weight?: string | null
): string {
  if (bmi && String(bmi).trim() !== "" && String(bmi).trim() !== "—") {
    const bmiStr = String(bmi).trim();
    if (bmiStr.includes("(")) return bmiStr;
    const num = parseFloat(bmiStr);
    if (!isNaN(num) && num > 0) {
      let status = "Healthy";
      if (num < 18.5) status = "Underweight";
      else if (num >= 25 && num <= 29.9) status = "Overweight";
      else if (num >= 30) status = "Obese";
      return `${num.toFixed(1)} (${status})`;
    }
    return bmiStr;
  }

  if (!height || !weight) return "—";
  const cleanH = String(height).trim();
  const cleanW = String(weight).trim();
  const hMatch = cleanH.match(/([0-9.]+)/);
  const wMatch = cleanW.match(/([0-9.]+)/);
  if (!hMatch || !wMatch) return "—";
  const h = parseFloat(hMatch[1]);
  const w = parseFloat(wMatch[1]);
  if (isNaN(h) || isNaN(w) || h <= 0 || w <= 0) return "—";

  let hMeters = h;
  if (cleanH.toLowerCase().includes("cm")) hMeters = h / 100;
  else if (cleanH.toLowerCase().includes("ft")) hMeters = h * 0.3048;
  else if (h > 3) hMeters = h / 100;

  let wKg = w;
  if (cleanW.toLowerCase().includes("lbs")) wKg = w * 0.453592;

  const num = wKg / (hMeters * hMeters);
  if (isNaN(num) || !isFinite(num)) return "—";

  let status = "Healthy";
  if (num < 18.5) status = "Underweight";
  else if (num >= 25 && num <= 29.9) status = "Overweight";
  else if (num >= 30) status = "Obese";

  return `${num.toFixed(1)} (${status})`;
}

// ── Format Bytes ────────────────────────────────────────────────────────────
function formatBytes(bytes?: number): string {
  if (!bytes || bytes === 0) return "Unknown size";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
}

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
            className="px-5 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[40px] transition-all cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            {isDenied || isRevoked || isExpired ? "Re-request Access" : "Request Patient Access"}
          </button>
        )}
        <Link
          href="/doctor/emergency"
          className="px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] border border-cyan-200 text-xs font-bold transition-all flex items-center gap-1.5 min-h-[40px]"
        >
          <ShieldAlert className="w-3.5 h-3.5 text-[#0891B2]" /> Emergency Access
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
        <button onClick={onClose} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 p-1 cursor-pointer">
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
              <div className="p-3 rounded-xl bg-slate-100 border border-slate-200 text-slate-800 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-slate-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Access Scope</label>
              <div className="grid grid-cols-2 gap-2 text-[11px]">
                {(["Full Vault", "Lab Reports Only", "Timeline Only", "Emergency Only"] as ConsentScope[]).map((s) => (
                  <button
                    key={s} type="button" onClick={() => setScope(s)}
                    className={`p-2.5 rounded-xl border font-bold transition-all cursor-pointer ${
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
              <button onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold min-h-[38px] cursor-pointer">
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !purpose.trim()}
                className="px-5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-xs flex items-center gap-1.5 min-h-[38px] disabled:opacity-60 transition-all cursor-pointer"
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
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [activeTab, setActiveTab] = useState<"brief" | "documents" | "timeline">("brief");

  // Real Data states
  const [timelineEvents, setTimelineEvents] = useState<ClinicalEvent[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [prescriptions, setPrescriptions] = useState<any[]>([]);

  // Document Viewer Modal State
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerDocId, setViewerDocId] = useState<string | undefined>(undefined);
  const [viewerDocName, setViewerDocName] = useState<string>("Medical Document");
  const [viewerDocCategory, setViewerDocCategory] = useState<string | undefined>(undefined);
  const [viewerMimeType, setViewerMimeType] = useState<string>("application/pdf");
  const [viewerSignedUrl, setViewerSignedUrl] = useState<string | null>(null);
  const [viewerAiAnalysis, setViewerAiAnalysis] = useState<any>(null);
  const [viewerLoading, setViewerLoading] = useState(false);
  const [viewerError, setViewerError] = useState<string | null>(null);
  const [viewerDoctorName, setViewerDoctorName] = useState<string | undefined>(undefined);
  const [viewerHospitalName, setViewerHospitalName] = useState<string | undefined>(undefined);
  const [viewerVisitDate, setViewerVisitDate] = useState<string | undefined>(undefined);

  // Open Document Viewer Helper
  const openDocumentViewer = useCallback(async (doc: any) => {
    const docId = doc.id || doc.document_id;
    const docName = doc.document_name || doc.title || "Medical Document";
    const category = doc.document_category || doc.category || "General";
    const mime = doc.mime_type || "application/pdf";

    setViewerDocId(docId);
    setViewerDocName(docName);
    setViewerDocCategory(category);
    setViewerMimeType(mime);
    setViewerDoctorName(doc.doctor_name || doc.doctorName || undefined);
    setViewerHospitalName(doc.facility_name || doc.hospital || undefined);
    setViewerVisitDate(doc.event_date || doc.created_at || undefined);
    setViewerSignedUrl(doc.signedDownloadUrl || null);
    setViewerAiAnalysis(doc.ai_analysis || null);
    setViewerLoading(true);
    setViewerError(null);
    setIsViewerOpen(true);

    if (docId) {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData?.session?.access_token;
        const headers: Record<string, string> = {};
        if (token) headers["Authorization"] = `Bearer ${token}`;

        const res = await fetch(`${API_BASE_URL}/documents/${docId}`, { headers });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.data) {
            if (data.data.signedDownloadUrl) setViewerSignedUrl(data.data.signedDownloadUrl);
            if (data.data.ai_analysis) setViewerAiAnalysis(data.data.ai_analysis);
          }
        }
      } catch (err) {
        console.warn("Failed to fetch full document details:", err);
      } finally {
        setViewerLoading(false);
      }
    } else {
      setViewerLoading(false);
    }
  }, []);

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
      setTimelineEvents(mockDoctorTimelineEvents.filter((e) => e.patientId === demoPatient.id) as any);
      setPrescriptions(mockDoctorPrescriptions.filter((p) => p.patientId === demoPatient.id));
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
        height: p.height,
        weight: p.weight,
        bmi: p.bmi,
        riskBadge: "STABLE",
        recentDiagnosis: "Requires consent to view",
        currentMedications: [],
        lastVisit: "—",
        accessStatus: consentRes.data?.status ?? "NONE",
        primaryDoctor: currentDocName,
      });

      // If consent is approved, fetch real clinical events & medical documents
      if (consentRes.data?.hasAccess) {
        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          const headers: Record<string, string> = {};
          if (token) headers["Authorization"] = `Bearer ${token}`;

          // 1. Fetch Timeline Events
          const eventsData = await TimelineAPI.getEvents("ALL", 1, 50, patientId);
          if (eventsData?.events) {
            setTimelineEvents(eventsData.events);
          }

          // 2. Fetch Medical Documents
          const docRes = await fetch(`${API_BASE_URL}/documents/search?patient_id=${encodeURIComponent(patientId)}&limit=50`, { headers });
          if (docRes.ok) {
            const docJson = await docRes.json();
            setDocuments(docJson.data || []);
          }
        } catch (err) {
          console.warn("Failed to fetch patient records:", err);
        }
      }
    }

    setLoading(false);
  }, [isDemo, patientId, currentDocName]);

  useEffect(() => { loadData(); }, [loadData]);

  if (loading) {
    return (
      <div className="p-12 text-center">
        <RefreshCw className="w-8 h-8 text-[#0891B2] animate-spin mx-auto" />
        <p className="text-xs text-[#475569] mt-3 font-mono animate-pulse">
          Verifying patient access authorization & loading health vault...
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
  const computedBmi = computeBmiDisplay(patient.bmi, patient.height, patient.weight);

  // Extract diagnoses & abnormal lab tests from clinical events
  const extractedDiagnoses: string[] = [];
  const extractedLabs: any[] = [];
  timelineEvents.forEach((ev) => {
    if (ev.structured_data?.diagnoses && Array.isArray(ev.structured_data.diagnoses)) {
      ev.structured_data.diagnoses.forEach((d: string) => {
        if (!extractedDiagnoses.includes(d)) extractedDiagnoses.push(d);
      });
    }
    if (ev.structured_data?.lab_results && Array.isArray(ev.structured_data.lab_results)) {
      ev.structured_data.lab_results.forEach((l: any) => {
        extractedLabs.push({ ...l, eventDate: ev.event_date, docName: ev.document_name || ev.title });
      });
    }
  });

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
                <strong className="text-[#0891B2] font-bold">{patient.bloodGroup}</strong>
                {patient.height && <span> · Height: <strong className="text-slate-800">{patient.height}</strong></span>}
                {patient.weight && <span> · Weight: <strong className="text-slate-800">{patient.weight}</strong></span>}
              </p>
              <p className="text-xs text-slate-500 font-mono">
                BMI: <strong className="text-[#0891B2] font-bold">{computedBmi}</strong> · Emergency:{" "}
                <span className="text-slate-700 font-medium">{patient.emergencyContact || "Not recorded"}</span>
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <Link
              href={`/doctor/prescriptions?patientId=${patient.id}&patientName=${encodeURIComponent(patient.fullName)}`}
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
        <div className="p-4 rounded-2xl bg-slate-900 border border-slate-700 text-xs text-emerald-400 font-mono flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Consent Verified On-Chain · TX: {resolvedConsent.blockchainTxHash.substring(0, 24)}...
              {resolvedConsent.expiresAt && (
                <span className="text-slate-400 ml-2">
                  · Expires: {new Date(resolvedConsent.expiresAt).toLocaleDateString()}
                </span>
              )}
            </span>
          </div>
          <span className="text-[11px] bg-emerald-950/80 text-emerald-300 border border-emerald-800 px-2.5 py-0.5 rounded-md font-bold">
            Scope: {resolvedConsent.scope || "Full Vault"}
          </span>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="flex gap-2 bg-white p-1.5 rounded-2xl border border-slate-200/80 shadow-xs w-fit flex-wrap">
        {[
          { id: "brief", label: "AI Brief" },
          { id: "documents", label: `Medical Documents (${documents.length})` },
          { id: "timeline", label: `Clinical Timeline (${timelineEvents.length})` },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
              activeTab === tab.id
                ? "bg-[#0891B2] text-white shadow-xs"
                : "text-slate-600 hover:bg-slate-50"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 1: AI BRIEF
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "brief" && (
        <div className="space-y-6">
          <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <Bot className="w-5 h-5 text-violet-600" /> AI Clinical Intelligence Brief
              </h2>
              <span className="text-[11px] font-bold bg-violet-50 text-violet-700 border border-violet-200 px-3 py-1 rounded-full">
                Gemini 1.5 Flash Verified
              </span>
            </div>

            {/* AI Summary Highlight */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-violet-50/80 to-cyan-50/80 border border-violet-100 text-xs text-violet-950 space-y-2">
              <p className="font-bold text-sm text-[#0F172A]">
                Clinical Summary for {patient.fullName} ({patient.uhid})
              </p>
              <p className="leading-relaxed text-slate-700">
                {extractedDiagnoses.length > 0
                  ? `Patient has documented diagnoses: ${extractedDiagnoses.join(", ")}. Longitudinal health tracking is active with ${documents.length} verified medical reports on file.`
                  : patient.recentDiagnosis && patient.recentDiagnosis !== "Requires consent to view"
                  ? patient.recentDiagnosis
                  : "All encrypted medical records and longitudinal biomarkers have been indexed. Detailed parameter deviations and condition threads are listed below."}
              </p>
            </div>

            {/* Diagnoses Section */}
            <div>
              <h3 className="text-xs font-bold text-[#0F172A] mb-2.5 flex items-center gap-1.5">
                <Stethoscope className="w-4 h-4 text-[#0891B2]" /> Documented Diagnoses & Clinical Conditions
              </h3>
              {extractedDiagnoses.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {extractedDiagnoses.map((diag, i) => (
                    <span
                      key={i}
                      className="px-3 py-1.5 rounded-xl bg-cyan-50 border border-cyan-200 text-[#0891B2] font-bold text-xs flex items-center gap-1.5"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      {diag}
                    </span>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 italic">No specific diagnosis tags extracted yet.</p>
              )}
            </div>

            {/* Extracted Abnormal Lab Tests Grid */}
            {extractedLabs.length > 0 && (
              <div>
                <h3 className="text-xs font-bold text-[#0F172A] mb-2.5 flex items-center gap-1.5">
                  <FlaskConical className="w-4 h-4 text-amber-600" /> Extracted Lab Biomarkers & Vitals ({extractedLabs.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {extractedLabs.map((lab, i) => (
                    <div
                      key={i}
                      className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{lab.test_name}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            lab.status === "CRITICAL"
                              ? "bg-slate-200 text-slate-900 border border-slate-300"
                              : lab.status === "HIGH"
                              ? "bg-cyan-100 text-[#0891B2] border border-cyan-300"
                              : lab.status === "LOW"
                              ? "bg-sky-100 text-sky-800 border border-sky-300"
                              : "bg-emerald-100 text-emerald-800 border border-emerald-300"
                          }`}
                        >
                          {lab.status}
                        </span>
                      </div>
                      <div className="text-sm font-extrabold text-slate-900 font-mono">
                        {lab.value} <span className="text-xs font-normal text-slate-500">{lab.unit}</span>
                      </div>
                      {lab.reference_range && (
                        <p className="text-[11px] text-slate-400 font-mono">Ref: {lab.reference_range}</p>
                      )}
                      {lab.clinical_meaning && (
                        <p className="text-[11px] text-slate-600 bg-white p-2 rounded-lg border border-slate-200/60 leading-snug">
                          {lab.clinical_meaning}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Allergies & Chronic Conditions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-2xl bg-cyan-50/50 border border-cyan-200/80 space-y-2">
                <h3 className="text-xs font-bold text-[#0891B2] flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-[#0891B2]" /> Allergies
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient.allergies && patient.allergies.length > 0 ? (
                    patient.allergies.map((a: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-cyan-200 text-[#0891B2] text-xs font-bold rounded-lg shadow-2xs"
                      >
                        {a}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None documented</span>
                  )}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                <h3 className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-[#0891B2]" /> Chronic Conditions
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {patient.chronicConditions && patient.chronicConditions.length > 0 ? (
                    patient.chronicConditions.map((c: string, idx: number) => (
                      <span
                        key={idx}
                        className="px-2.5 py-1 bg-white border border-slate-200 text-[#0F172A] text-xs font-bold rounded-lg shadow-2xs"
                      >
                        {c}
                      </span>
                    ))
                  ) : (
                    <span className="text-xs text-slate-400">None documented</span>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 2: MEDICAL DOCUMENTS
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "documents" && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
              <FileText className="w-5 h-5 text-[#0891B2]" /> Patient Medical Records & Reports ({documents.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">End-to-End Encrypted</span>
          </div>

          {documents.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {documents.map((doc) => (
                <div
                  key={doc.id}
                  className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-4 hover:border-slate-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#0891B2] shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h3 className="font-heading font-bold text-sm text-[#0F172A]">{doc.document_name || "Medical Document"}</h3>
                        <p className="text-xs text-slate-400 font-mono mt-0.5">
                          {doc.document_category || "General"} · {new Date(doc.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>

                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-[#ECFDF5] text-[#065F46] border border-[#A7F3D0]">
                      IPFS SECURED
                    </span>
                  </div>

                  <div className="flex items-center justify-between text-xs text-slate-500 pt-1 border-t border-slate-100">
                    <span className="font-mono">{formatBytes(doc.file_size_bytes)}</span>
                    <button
                      onClick={() => openDocumentViewer(doc)}
                      className="px-3.5 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs flex items-center gap-1.5 shadow-2xs transition-all cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" /> View Report & AI
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200/80 space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="font-bold text-sm text-slate-700">No Medical Documents Found</h3>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                The patient has not uploaded any medical records yet or no documents are within the approved consent scope.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════════════
          TAB 3: CLINICAL TIMELINE
      ═════════════════════════════════════════════════════════════════════ */}
      {activeTab === "timeline" && (
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#0891B2]" /> Longitudinal Clinical Timeline ({timelineEvents.length})
            </h2>
            <span className="text-xs text-slate-400 font-mono">Automated Chronology</span>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-4 relative">
              {timelineEvents.map((event, idx) => {
                const sev = String(event.severity || "").toUpperCase();
                const isCritical = sev === "CRITICAL";
                const isMonitor = sev === "MONITOR" || sev === "HIGH";

                return (
                  <div key={event.id || idx} className="flex gap-4 group">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-3 h-3 rounded-full mt-1.5 shrink-0 shadow-xs ${
                          isCritical
                            ? "bg-[#0891B2] ring-4 ring-cyan-100"
                            : isMonitor
                            ? "bg-slate-400 ring-4 ring-slate-100"
                            : "bg-[#0891B2] ring-4 ring-cyan-100"
                        }`}
                      />
                      {idx < timelineEvents.length - 1 && (
                        <div className="w-px flex-1 bg-slate-200 mt-1" />
                      )}
                    </div>

                    <div className="pb-6 flex-1 bg-slate-50/60 p-4 rounded-2xl border border-slate-200/70 space-y-2">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h4 className="font-bold text-sm text-[#0F172A]">{event.title}</h4>
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isCritical
                                  ? "bg-cyan-100 text-[#0891B2]"
                                  : isMonitor
                                  ? "bg-slate-200 text-slate-700"
                                  : "bg-cyan-100 text-[#0891B2]"
                              }`}
                            >
                              {event.event_type || event.severity || "EVENT"}
                            </span>
                            {/* Provenance badge for external patient-uploaded prescriptions */}
                            {(event.structured_data?.source_type === "PATIENT_UPLOADED" ||
                              event.title?.toLowerCase().includes("external prescription") ||
                              event.summary?.toLowerCase().includes("external prescription") ||
                              event.summary?.toLowerCase().includes("patient uploaded")) && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200 flex items-center gap-1">
                                <Pill className="w-3 h-3 text-violet-600" /> EXTERNAL (PATIENT UPLOADED)
                              </span>
                            )}
                            {event.is_milestone && (
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-50 text-[#0891B2] border border-cyan-200">
                                MILESTONE
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-500 mt-0.5">{event.summary}</p>
                        </div>

                        <span className="text-xs text-slate-400 font-mono shrink-0">
                          {event.event_date ? new Date(event.event_date).toLocaleDateString() : "Recent"}
                        </span>
                      </div>

                      {/* Facility & Doctor */}
                      <div className="flex items-center gap-4 text-[11px] text-slate-400 flex-wrap">
                        {event.facility_name && (
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-slate-400" />
                            {event.facility_name}
                          </span>
                        )}
                        {event.doctor_name && (
                          <span className="flex items-center gap-1">
                            <Stethoscope className="w-3 h-3 text-slate-400" />
                            {event.doctor_name}
                          </span>
                        )}
                      </div>

                      {/* Structured Lab Results */}
                      {event.structured_data?.lab_results && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                          {event.structured_data.lab_results.map((l: any, i: number) => (
                            <div key={i} className="p-2 rounded-xl bg-white border border-slate-200/80 text-xs flex justify-between items-center">
                              <span className="text-slate-700 font-medium">{l.test_name}</span>
                              <span className="font-bold text-[#0891B2] font-mono">
                                {l.value} {l.unit} ({l.status})
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Document link button */}
                      {event.document_id && (
                        <div className="pt-1">
                          <button
                            onClick={() => openDocumentViewer({ id: event.document_id, title: event.document_name || event.title })}
                            className="text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] flex items-center gap-1 cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5" /> Inspect Linked Document Evidence →
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-10 text-center text-xs text-[#475569]">
              <Clock className="w-8 h-8 text-slate-200 mx-auto mb-2" />
              No timeline events available for this patient.
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

      {/* Document Viewer Modal */}
      {isViewerOpen && (
        <DocumentViewerModal
          isOpen={isViewerOpen}
          onClose={() => setIsViewerOpen(false)}
          documentId={viewerDocId}
          documentName={viewerDocName}
          documentCategory={viewerDocCategory}
          mimeType={viewerMimeType}
          signedUrl={viewerSignedUrl}
          doctorName={viewerDoctorName}
          hospitalName={viewerHospitalName}
          visitDate={viewerVisitDate}
          aiAnalysis={viewerAiAnalysis}
          isLoading={viewerLoading}
          error={viewerError}
          onDownload={() => {
            if (viewerSignedUrl) window.open(viewerSignedUrl, "_blank");
          }}
        />
      )}
    </div>
  );
}
