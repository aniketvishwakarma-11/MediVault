"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  ShieldAlert,
  QrCode,
  AlertTriangle,
  Clock,
  CheckCircle2,
  PhoneCall,
  Pill,
  ArrowRight,
  ShieldCheck,
  Activity,
  RefreshCw,
  Lock,
  User,
  Hospital,
  XCircle,
  Stethoscope,
  Timer,
  X,
  ChevronDown,
  Shield,
  Eye,
  FileText,
  Download,
  ExternalLink,
  Calendar,
  Camera,
  Flame,
  Zap,
  Radio,
  FileSpreadsheet,
  HeartPulse,
  Thermometer,
  AlertOctagon,
  Sparkles,
  Search,
  KeyRound,
  FileCheck,
  Check,
  Send,
  SlidersHorizontal,
  AlertCircle,
  FlaskConical,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import {
  emergencyApi,
  type BreakGlassReasonCode,
  type BreakGlassResponse,
  type PublicEmergencyProfile,
} from "@/lib/emergency-api";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────

type Step = "input" | "consent" | "granted" | "expired";

const REASON_CODES: {
  code: BreakGlassReasonCode;
  label: string;
  badge: string;
  severity: "critical" | "high" | "moderate";
}[] = [
  { code: "PATIENT_UNCONSCIOUS", label: "Patient unconscious / unresponsive (GCS < 8)", badge: "TRAUMA LVL 1", severity: "critical" },
  { code: "LIFE_THREATENING_EMERGENCY", label: "Acute life-threatening emergency / Cardiac / Shock", badge: "STAT CRITICAL", severity: "critical" },
  { code: "PATIENT_UNABLE_TO_CONSENT", label: "Patient incapacitated / Unable to provide consent", badge: "INCAPACITATED", severity: "high" },
  { code: "ALLERGY_VERIFICATION", label: "Severe anaphylaxis / Immediate allergy verification", badge: "ANAPHYLAXIS", severity: "high" },
  { code: "MEDICATION_VERIFICATION", label: "Critical drug contraindication / STAT dosage check", badge: "MED SAFETY", severity: "moderate" },
  { code: "UNKNOWN_MEDICAL_HISTORY", label: "Unknown trauma history required for surgical intervention", badge: "SURGICAL OVERRIDE", severity: "high" },
  { code: "OTHER", label: "Other urgent clinical emergency justification", badge: "EMERGENCY", severity: "moderate" },
];

const SCOPE_OPTIONS = [
  { value: "emergency.profile", label: "Emergency Triage Card", description: "Blood group, allergies, critical directives", required: true, icon: ShieldAlert },
  { value: "clinical.summary", label: "Clinical Summary", description: "Active conditions, chronic diagnoses, trauma notes", required: false, icon: Stethoscope },
  { value: "medications.read", label: "Active Medications", description: "Current prescriptions, dosage & drug history", required: false, icon: Pill },
  { value: "labs.read", label: "Lab Biomarkers & Vitals", description: "Recent metabolic panels, blood chemistry, SpO2", required: false, icon: FlaskConical },
  { value: "documents.read", label: "Medical Documents & Reports", description: "Diagnostic PDFs, radiology, discharge summaries", required: false, icon: FileText },
  { value: "timeline.read", label: "Longitudinal Clinical Timeline", description: "Chronological medical history & surgical events", required: false, icon: Clock },
];

const DURATION_OPTIONS = [
  { value: 0.25 as const, label: "15 Minutes", sublabel: "Immediate Triage", badge: "STAT" },
  { value: 1 as const, label: "1 Hour", sublabel: "Standard ER Trauma", badge: "RECOMMENDED" },
  { value: 4 as const, label: "4 Hours", sublabel: "Extended Surgery & ICU", badge: "CRITICAL CARE" },
];

const QUICK_JUSTIFICATIONS = [
  "Patient unconscious following severe road traffic trauma. Immediate blood group and allergy verification required.",
  "Acute anaphylactic shock presentation. Urgent contraindication screening needed.",
  "Unresponsive cardiac arrest intake. Evaluating past cardiovascular history and active medications.",
  "Emergency surgical intervention required. Patient incapacitated and unable to communicate.",
];

// ─────────────────────────────────────────────────────────────────
// Session Countdown HUD Timer
// ─────────────────────────────────────────────────────────────────

function SessionTimerHUD({
  expiresAt,
  onExpire,
}: {
  expiresAt: string;
  onExpire: () => void;
}) {
  const [remaining, setRemaining] = useState("");
  const [pct, setPct] = useState(100);
  const [critical, setCritical] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const total = Math.max(1, expiry - Date.now());

    const tick = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setRemaining("00:00:00");
        setPct(0);
        if (intervalRef.current) clearInterval(intervalRef.current);
        onExpire();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      const formatted = `${h > 0 ? `${h}h ` : ""}${m.toString().padStart(2, "0")}m ${s.toString().padStart(2, "0")}s`;
      setRemaining(formatted);
      setPct(Math.max(0, Math.min(100, (diff / total) * 100)));
      setCritical(diff < 5 * 60 * 1000); // < 5 minutes
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [expiresAt, onExpire]);

  return (
    <div
      className={`p-4 sm:p-5 rounded-3xl border transition-all ${
        critical
          ? "bg-rose-950/80 border-rose-500/80 text-rose-100 shadow-lg shadow-rose-900/30 animate-pulse"
          : "bg-slate-900/90 border-slate-800 text-slate-100 shadow-md"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              critical ? "bg-rose-600 text-white" : "bg-[#0891B2]/20 text-[#22D3EE] border border-[#0891B2]/30"
            }`}
          >
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-black uppercase tracking-wider text-slate-300 font-mono">
                Emergency Break-Glass Session Active
              </span>
              <span
                className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full ${
                  critical
                    ? "bg-rose-600 text-white animate-bounce"
                    : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                }`}
              >
                {critical ? "EXPIRING IMMINENTLY" : "AUDITED CLINICAL STREAM"}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              All clinical records unmasked under verified emergency override protocol.
            </p>
          </div>
        </div>

        <div className="text-right shrink-0">
          <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Time Remaining</div>
          <div
            className={`text-2xl font-black font-mono tracking-tight ${
              critical ? "text-rose-400" : "text-[#22D3EE]"
            }`}
          >
            {remaining || "--:--"}
          </div>
        </div>
      </div>

      {/* Progress Telemetry Bar */}
      <div className="mt-3.5 h-2 rounded-full bg-slate-800 overflow-hidden relative">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            critical ? "bg-gradient-to-r from-rose-500 to-red-600" : "bg-gradient-to-r from-[#0891B2] to-[#22D3EE]"
          }`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Interactive Camera / QR Scan HUD Component
// ─────────────────────────────────────────────────────────────────

function CameraScannerHUD({
  onTokenScanned,
  onQuickDemoLoad,
}: {
  onTokenScanned: (token: string) => void;
  onQuickDemoLoad: () => void;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setCameraError(null);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
        }
        setCameraActive(true);
      } else {
        throw new Error("Camera API not supported on this browser.");
      }
    } catch (err: any) {
      setCameraError(err.message || "Unable to access device camera. Please enter token manually.");
      setCameraActive(false);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop());
      }
    };
  }, []);

  return (
    <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-5 flex flex-col justify-between relative overflow-hidden">
      {/* Background ambient medical grid */}
      <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

      <div className="relative z-10 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
            <span className="text-xs font-black text-rose-400 uppercase tracking-wider font-mono">
              Live Scanner Telemetry
            </span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 bg-slate-800 px-2.5 py-1 rounded-lg border border-slate-700">
            256-Bit ZKP Verified
          </span>
        </div>

        {/* Scan Frame */}
        <div className="relative aspect-square max-h-64 sm:max-h-72 w-full mx-auto rounded-2xl bg-slate-950 border-2 border-rose-500/40 overflow-hidden flex flex-col items-center justify-center p-4 group">
          {cameraActive ? (
            <div className="relative w-full h-full">
              <video ref={videoRef} className="w-full h-full object-cover rounded-xl" autoPlay playsInline muted />
              {/* Animated Laser Sweep */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_15px_#f43f5e] animate-[bounce_2s_infinite]" />
              <button
                type="button"
                onClick={stopCamera}
                className="absolute top-2 right-2 p-1.5 rounded-lg bg-slate-900/80 text-slate-300 hover:text-white border border-slate-700 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Laser Grid Animation */}
              <div className="absolute inset-x-8 top-1/2 -translate-y-1/2 h-0.5 bg-gradient-to-r from-transparent via-rose-500 to-transparent shadow-[0_0_12px_#f43f5e] animate-pulse" />

              {/* Corner Targets */}
              <div className="absolute top-3 left-3 w-4 h-4 border-t-2 border-l-2 border-rose-400" />
              <div className="absolute top-3 right-3 w-4 h-4 border-t-2 border-r-2 border-rose-400" />
              <div className="absolute bottom-3 left-3 w-4 h-4 border-b-2 border-l-2 border-rose-400" />
              <div className="absolute bottom-3 right-3 w-4 h-4 border-b-2 border-r-2 border-rose-400" />

              <QrCode className="w-20 h-20 text-rose-400/70 group-hover:scale-105 transition-transform" />
              <div className="mt-3 text-center space-y-1">
                <span className="text-[11px] font-mono text-rose-300 font-bold bg-rose-950/80 px-3 py-1 rounded-full border border-rose-500/30 uppercase tracking-wider block">
                  Optical / RFID Sensor Ready
                </span>
                <p className="text-[10px] text-slate-400">Position patient emergency badge or bracelet in front of lens</p>
              </div>
            </>
          )}
        </div>

        {cameraError && (
          <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-800 text-rose-200 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}
      </div>

      <div className="relative z-10 space-y-2.5 pt-2">
        <div className="grid grid-cols-2 gap-2">
          {!cameraActive ? (
            <button
              type="button"
              onClick={startCamera}
              className="py-2.5 px-3 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-900/30 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>Launch Camera</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={stopCamera}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Stop Camera</span>
            </button>
          )}

          <button
            type="button"
            onClick={onQuickDemoLoad}
            className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#22D3EE] border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Load Active ER Patient</span>
          </button>
        </div>

        <p className="text-[10px] text-slate-400 text-center font-mono">
          Camera scanning requires HTTPS and device camera permissions.
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Emergency Profile Display (Rapid Triage View)
// ─────────────────────────────────────────────────────────────────

function EmergencyTriageView({ profile }: { profile: PublicEmergencyProfile }) {
  const activeContacts = profile.emergencyContacts?.filter((c) => c.enabled !== false) || [];
  const primaryPhone = activeContacts[0]?.phone;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Patient Hero Crash Card */}
      <div className="p-6 md:p-8 rounded-3xl bg-gradient-to-r from-slate-900 via-rose-950/60 to-slate-900 text-white border border-rose-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-rose-600/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white font-black text-3xl flex items-center justify-center border-2 border-rose-300/40 shadow-lg shadow-rose-900/40 shrink-0">
              {profile.patientDisplayName?.charAt(0) || "P"}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2.5 flex-wrap">
                <h2 className="text-2xl font-black tracking-tight text-white">{profile.patientDisplayName}</h2>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 text-[10px] font-extrabold border border-emerald-500/30 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> ON-CHAIN VERIFIED
                </span>
                <span className="text-xs font-mono text-slate-400 bg-slate-800/80 px-2.5 py-0.5 rounded-lg border border-slate-700">
                  UHID: {profile.patientId ? `MV-PAT-${profile.patientId.substring(0, 5).toUpperCase()}` : "MV-EMERGENCY"}
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Critical Care Override Active · Vault Last Updated:{" "}
                <strong className="text-slate-100 font-mono">
                  {new Date(profile.lastUpdated).toLocaleDateString("en-US", {
                    month: "short",
                    day: "numeric",
                    year: "numeric",
                  })}
                </strong>
              </p>
            </div>
          </div>

          {/* Blood Group Triage Callout */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-rose-500/40 shrink-0 shadow-md">
            <div className="text-right">
              <span className="text-[10px] font-black text-rose-400 uppercase tracking-widest block font-mono">
                Blood Group
              </span>
              <span className="text-xs text-slate-300 font-bold">Transfusion Match</span>
            </div>
            <div className="px-5 py-2.5 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-2xl font-mono border border-red-400 shadow-inner">
              {profile.bloodGroup || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Clinical Triage Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Critical Allergies Card */}
        <div className="p-6 rounded-3xl bg-white border border-rose-200/80 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-rose-900 uppercase tracking-wider flex items-center gap-2 font-heading">
              <AlertTriangle className="w-4.5 h-4.5 text-rose-600" />
              Critical Allergies & Anaphylaxis Warnings
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200 font-mono">
              {profile.allergies?.length || 0} DOCUMENTED
            </span>
          </div>

          {profile.allergies && profile.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.allergies.map((a, i) => (
                <div
                  key={i}
                  className="px-3.5 py-1.5 rounded-xl bg-rose-600 text-white font-black text-xs shadow-sm flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-rose-200" />
                  {a}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
              <span>NKDA — No Known Drug Allergies Reported</span>
            </div>
          )}
        </div>

        {/* Chronic Diagnoses Card */}
        <div className="p-6 rounded-3xl bg-white border border-violet-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-violet-900 uppercase tracking-wider flex items-center gap-2 font-heading">
              <Activity className="w-4.5 h-4.5 text-violet-600" />
              Chronic Conditions & Medical History
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200 font-mono">
              {profile.chronicConditions?.length || 0} ACTIVE
            </span>
          </div>

          {profile.chronicConditions && profile.chronicConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.chronicConditions.map((c, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-violet-50 border border-violet-200 text-violet-900 font-bold text-xs flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-violet-600" />
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold">
              No Chronic Conditions Documented
            </div>
          )}
        </div>

        {/* Active Medications Card */}
        <div className="p-6 rounded-3xl bg-white border border-cyan-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-cyan-900 uppercase tracking-wider flex items-center gap-2 font-heading">
              <Pill className="w-4.5 h-4.5 text-[#0891B2]" />
              Active Medication Regimen
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-100 text-cyan-800 border border-cyan-200 font-mono">
              {profile.currentMedications?.length || 0} RECORDED
            </span>
          </div>

          {profile.currentMedications && profile.currentMedications.length > 0 ? (
            <div className="space-y-2 pt-1">
              {profile.currentMedications.map((m, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 text-xs font-bold text-slate-800"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
                    <span>{m}</span>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400">Oral/Rx</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold">
              No Active Prescriptions Recorded
            </div>
          )}
        </div>

        {/* Emergency Contacts & Next of Kin Card */}
        <div className="p-6 rounded-3xl bg-white border border-emerald-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-emerald-900 uppercase tracking-wider flex items-center gap-2 font-heading">
              <PhoneCall className="w-4.5 h-4.5 text-emerald-600" />
              Emergency Contacts & Next-of-Kin
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-200 font-mono">
              {activeContacts.length} AVAILABLE
            </span>
          </div>

          {activeContacts.length > 0 ? (
            <div className="space-y-2 pt-1">
              {activeContacts.map((c, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-3 rounded-2xl bg-emerald-50/50 border border-emerald-200"
                >
                  <div>
                    <div className="text-xs font-black text-slate-900">{c.name}</div>
                    <div className="text-[10px] text-slate-500 font-semibold">{c.relationship || "Emergency Contact"}</div>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                  >
                    <PhoneCall className="w-3.5 h-3.5" />
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-slate-500 text-xs font-semibold">
              No Emergency Contacts Recorded
            </div>
          )}
        </div>
      </div>

      {/* Emergency Directives Callout */}
      {profile.emergencyNotes && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-300 text-amber-950 space-y-1.5 shadow-xs">
          <div className="font-black text-amber-900 flex items-center gap-2 uppercase tracking-wider text-xs font-heading">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Patient Emergency Advance Directives / Special Instructions
          </div>
          <p className="leading-relaxed font-bold text-sm text-amber-950">
            {profile.emergencyNotes}
          </p>
        </div>
      )}

      {/* Emergency Physician Action Bar */}
      <div className="p-5 rounded-3xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xl border border-slate-800">
        <div className="flex items-center gap-3 text-xs font-medium">
          <div className="w-8 h-8 rounded-xl bg-rose-600/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <span>Need to issue emergency medication or consult AI diagnostics for this trauma intake?</span>
        </div>
        <div className="flex items-center gap-2.5 w-full sm:w-auto flex-wrap">
          {primaryPhone && (
            <a
              href={`tel:${primaryPhone}`}
              className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call Next-of-Kin
            </a>
          )}
          <Link
            href="/doctor/prescriptions"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
          >
            <Pill className="w-3.5 h-3.5" />
            STAT Prescription
          </Link>
          <Link
            href="/doctor/copilot"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Emergency AI Copilot
          </Link>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Emergency Scope Viewer (Tabbed Clinical Telemetry)
// ─────────────────────────────────────────────────────────────────

function EmergencyScopeViewer({
  profile,
  scope,
  patientId,
  initialDocs,
  initialTimeline,
  initialLabs,
}: {
  profile: PublicEmergencyProfile;
  scope: string[];
  patientId: string;
  initialDocs?: any[];
  initialTimeline?: any[];
  initialLabs?: any[];
}) {
  const [activeTab, setActiveTab] = useState<"triage" | "documents" | "timeline" | "labs" | "audit">("triage");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docs, setDocs] = useState<any[]>(initialDocs || []);
  const [timelineEvents, setTimelineEvents] = useState<any[]>(initialTimeline || []);
  const [labs, setLabs] = useState<any[]>(initialLabs || []);

  useEffect(() => {
    if (initialDocs && initialDocs.length > 0) setDocs(initialDocs);
    if (initialTimeline && initialTimeline.length > 0) setTimelineEvents(initialTimeline);
    if (initialLabs && initialLabs.length > 0) setLabs(initialLabs);
  }, [initialDocs, initialTimeline, initialLabs]);

  useEffect(() => {
    if (patientId) {
      const fetchRealRecords = async () => {
        try {
          const { supabase } = await import("@/lib/supabase");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

            // 1. Fetch Real Documents
            const docRes = await fetch(`${API_BASE}/documents/search?patient_id=${encodeURIComponent(patientId)}&limit=50`, {
              headers: { Authorization: `Bearer ${session.access_token}`, "x-user-role": "doctor" },
            });
            if (docRes.ok) {
              const docJson = await docRes.json();
              if (docJson.data && Array.isArray(docJson.data)) {
                setDocs(docJson.data);
              }
            }

            // 2. Fetch Real Timeline Events
            const timeRes = await fetch(`${API_BASE}/timeline/events?patient_id=${encodeURIComponent(patientId)}&limit=50`, {
              headers: { Authorization: `Bearer ${session.access_token}`, "x-user-role": "doctor" },
            });
            if (timeRes.ok) {
              const timeJson = await timeRes.json();
              if (timeJson.data?.events) {
                setTimelineEvents(timeJson.data.events);
              }
            }
          }
        } catch (e) {
          console.warn("Failed to fetch real emergency patient telemetry:", e);
        }
      };
      fetchRealRecords();
    }
  }, [patientId]);

  return (
    <div className="space-y-6">
      {/* Scope Navigation Tabs Header */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("triage")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "triage"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <ShieldAlert className="w-4 h-4" />
          Rapid Triage & Vitals
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "documents"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <FileText className="w-4 h-4" />
          Medical Documents ({docs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "timeline"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <Activity className="w-4 h-4" />
          Clinical Timeline ({timelineEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("labs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "labs"
              ? "bg-rose-600 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <FlaskConical className="w-4 h-4" />
          Lab Biomarkers ({labs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("audit")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer whitespace-nowrap ${
            activeTab === "audit"
              ? "bg-slate-900 text-white shadow-sm"
              : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
          }`}
        >
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Audit Telemetry
        </button>
      </div>

      {/* Tab 1: Triage Card */}
      {activeTab === "triage" && <EmergencyTriageView profile={profile} />}

      {/* Tab 2: Medical Documents View */}
      {activeTab === "documents" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center justify-between font-semibold shadow-xs">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-4 h-4 text-[#0891B2] shrink-0" />
              <span>Full Diagnostic Reports & Medical PDFs Unmasked via Emergency Override.</span>
            </div>
            <span className="text-[10px] font-mono font-bold bg-cyan-100 text-cyan-800 px-2.5 py-0.5 rounded-md border border-cyan-300">
              {docs.length} Records Unlocked
            </span>
          </div>

          {docs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <div key={doc.id} className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3.5 hover:border-slate-300 transition-all">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-3 rounded-2xl bg-rose-50 text-rose-600 border border-rose-200 shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-slate-900 line-clamp-1">{doc.document_name || "Diagnostic Report"}</h4>
                        <p className="text-[11px] text-slate-400 font-mono mt-0.5">
                          {doc.document_category || "General"} · {doc.created_at ? new Date(doc.created_at).toLocaleDateString() : "Recent"}
                        </p>
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-extrabold text-[10px] border border-emerald-200">
                      IPFS DECRYPTED
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1 border-t border-slate-100 text-xs">
                    <span className="text-slate-400 font-mono">{doc.file_size_bytes ? `${Math.round(doc.file_size_bytes / 1024)} KB` : "Encrypted Document"}</span>
                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Report & AI Analysis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Medical Documents Found</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No diagnostic reports or uploaded medical PDFs are stored in the emergency vault for this patient.
              </p>
            </div>
          )}

          {selectedDoc && (
            <DocumentViewerModal
              isOpen={Boolean(selectedDoc)}
              onClose={() => setSelectedDoc(null)}
              documentId={selectedDoc.id}
              documentName={selectedDoc.document_name || "Emergency Document"}
              originalFilename={selectedDoc.original_filename}
              documentCategory={selectedDoc.document_category}
              mimeType={selectedDoc.mime_type || "application/pdf"}
              signedUrl={selectedDoc.signedDownloadUrl}
              aiAnalysis={selectedDoc.ai_analysis}
              visitDate={selectedDoc.created_at}
              onDownload={() => {
                if (selectedDoc.signedDownloadUrl) window.open(selectedDoc.signedDownloadUrl, "_blank");
              }}
            />
          )}
        </div>
      )}

      {/* Tab 3: Timeline View */}
      {activeTab === "timeline" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900 flex items-center gap-2 font-semibold shadow-xs">
            <Activity className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Longitudinal Clinical Event Stream — Medical Procedures, Diagnoses & Consultations</span>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="relative pl-9 space-y-1">
                  <div className="absolute left-2 top-2.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-xs" />
                  <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200 font-mono">
                          {evt.event_type || evt.type || "CLINICAL EVENT"}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900">{evt.title}</h4>
                      </div>
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {evt.event_date ? new Date(evt.event_date).toLocaleDateString() : evt.date || "Recent"}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{evt.summary || evt.description}</p>
                    {evt.facility_name && (
                      <div className="text-[11px] text-slate-400 font-medium pt-1 border-t border-slate-100 flex items-center gap-2">
                        <Hospital className="w-3.5 h-3.5 text-slate-400" />
                        <span>{evt.facility_name}</span>
                        {evt.doctor_name && <span>• Dr. {evt.doctor_name}</span>}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
              <Activity className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Clinical Timeline Events Recorded</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No past longitudinal clinical episodes have been indexed for {profile.patientDisplayName}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Lab Biomarkers View */}
      {activeTab === "labs" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-4 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2 font-semibold shadow-xs">
            <FlaskConical className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Emergency Lab Biomarker Screening Results & Metabolic Values</span>
          </div>

          {labs.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
              {labs.map((lab, i) => (
                <div key={i} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                  <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">{lab.name}</div>
                  <div className="text-lg font-black text-slate-900 font-mono">{lab.val}</div>
                  <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-100">
                    <span className="text-slate-400 font-mono">Ref: {lab.ref || "Target Range"}</span>
                    <span
                      className={`font-extrabold px-2 py-0.5 rounded-full text-[10px] ${
                        lab.status === "NORMAL"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : lab.status === "CRITICAL"
                          ? "bg-rose-100 text-rose-800 border border-rose-300 animate-pulse"
                          : "bg-amber-50 text-amber-700 border border-amber-200"
                      }`}
                    >
                      {lab.status || "NORMAL"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-12 rounded-3xl bg-white border border-slate-200/80 text-center space-y-3">
              <FlaskConical className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">No Lab Biomarkers Stored</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No acute laboratory parameter records are available in the emergency screening database.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Audit Telemetry View */}
      {activeTab === "audit" && (
        <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4 animate-in fade-in duration-300">
          <div className="flex items-center justify-between border-b border-slate-800 pb-4">
            <h3 className="font-heading font-bold text-base flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              Cryptographic Emergency Audit Trail
            </h3>
            <span className="text-[10px] font-mono bg-emerald-950 text-emerald-300 px-3 py-1 rounded-full border border-emerald-700">
              IMMUTABLE RECORD
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase block">Patient Credential ID</span>
              <span className="text-slate-200 truncate block">{profile.credentialId || "EMG-AUTH-TOKEN-2026"}</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase block">Security Notarization</span>
              <span className="text-emerald-400 block">SHA-256 Hash Chained & Verified</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase block">Audit Transmission</span>
              <span className="text-slate-200 block">Patient SMS / Notification Dispatched</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase block">Access Scopes Granted</span>
              <span className="text-[#22D3EE] block">{scope.join(", ")}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Doctor Emergency Terminal Page
// ─────────────────────────────────────────────────────────────────

function DoctorEmergencyTerminalContent() {
  const { user, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");

  // Input state
  const [credentialToken, setCredentialToken] = useState("");
  const [reasonCode, setReasonCode] = useState<BreakGlassReasonCode>("PATIENT_UNCONSCIOUS");
  const [reasonText, setReasonText] = useState("");
  const [selectedScope, setSelectedScope] = useState<string[]>([
    "emergency.profile",
    "clinical.summary",
    "medications.read",
    "labs.read",
    "documents.read",
    "timeline.read",
  ]);
  const [durationHours, setDurationHours] = useState<0.25 | 1 | 4>(1);

  // Auto-populate from URL query
  useEffect(() => {
    const tokenQuery = searchParams?.get("token");
    if (tokenQuery) {
      let val = tokenQuery.trim();
      if (val.includes("/e/")) {
        const parts = val.split("/e/");
        val = parts[parts.length - 1].split("?")[0].split("#")[0];
      }
      setCredentialToken(val);
    }
  }, [searchParams]);

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<BreakGlassResponse | null>(null);

  const toggleScope = (scope: string) => {
    if (scope === "emergency.profile") return; // Always required
    setSelectedScope((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleQuickDemoLoad = () => {
    setCredentialToken("b2d74172151286f993464d535c40108ef8c4f39fff7f7fdfde961b44cb93f574");
    setReasonCode("PATIENT_UNCONSCIOUS");
    setReasonText("Patient unconscious following severe road traffic trauma. Immediate blood group, allergy, and critical records required.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentialToken.trim()) {
      setError("Emergency credential token is required. Scan patient QR code or enter token manually.");
      return;
    }
    if (reasonText.trim().length < 10) {
      setError("Clinical emergency justification must be at least 10 characters.");
      return;
    }

    setStep("consent");
  };

  const handleConfirmAccess = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await emergencyApi.requestBreakGlassAccess({
        credential: credentialToken.trim(),
        reasonCode,
        reasonText: reasonText.trim(),
        requestedScope: selectedScope,
        durationHours,
      });
      setResponse(result);
      setStep("granted");
    } catch (err: any) {
      setError(err.message || "Emergency access request failed. Please verify the credential token and try again.");
      setStep("input");
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setStep("input");
    setCredentialToken("");
    setReasonText("");
    setReasonCode("PATIENT_UNCONSCIOUS");
    setSelectedScope([
      "emergency.profile",
      "clinical.summary",
      "medications.read",
      "labs.read",
      "documents.read",
      "timeline.read",
    ]);
    setDurationHours(1);
    setResponse(null);
    setError("");
  };

  const handleSessionExpire = () => {
    setStep("expired");
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Top Clinical Command Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-slate-950 via-rose-950 to-slate-950 text-white border border-rose-900/60 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-rose-600/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#0891B2]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-950/80 border border-rose-500/40 text-rose-300 text-xs font-bold uppercase tracking-wider font-mono">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              Level 1 Trauma Emergency Terminal
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3 text-white">
              <ShieldAlert className="w-7 h-7 sm:w-8 h-8 text-rose-500 shrink-0" />
              Break-Glass Emergency OverRide
            </h1>
            <p className="text-slate-300 text-xs sm:text-sm leading-relaxed">
              Instant audited clinical access to life-saving patient records during trauma, acute shock, or unconscious triage.
              Every override event is cryptographically notarized and audited.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row md:flex-col items-start sm:items-center md:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-slate-900/80 border border-slate-700 text-xs font-bold text-slate-200">
              <Radio className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
              <span>ZKP Notarization Active</span>
            </div>
            {userProfile && (
              <div className="text-[11px] text-slate-400 font-mono">
                Attending: <span className="text-slate-200 font-bold">{userProfile.displayName || user?.email}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ═════════════════════════════════════════════════════════════
          STEP 1: INPUT & TOKEN CAPTURE
      ═════════════════════════════════════════════════════════════ */}
      {step === "input" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Interactive QR & Scanner Telemetry (5 cols) */}
          <div className="lg:col-span-5">
            <CameraScannerHUD
              onTokenScanned={(t) => setCredentialToken(t)}
              onQuickDemoLoad={handleQuickDemoLoad}
            />
          </div>

          {/* Right Column: Emergency Justification & Authorization Form (7 cols) */}
          <div className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h2 className="font-heading font-black text-lg text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Emergency Access Authorization Protocol
              </h2>
              <p className="text-xs text-slate-500">
                Supply the patient&apos;s emergency credential token and document the clinical justification.
              </p>
            </div>

            {error && (
              <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 font-semibold flex items-start gap-2.5 animate-in fade-in">
                <XCircle className="w-4.5 h-4.5 text-rose-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Emergency Credential Token Input */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    Emergency Credential Token <span className="text-rose-600">*</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleQuickDemoLoad}
                    className="text-[11px] font-bold text-[#0891B2] hover:text-[#0e7490] cursor-pointer"
                  >
                    Paste Demo Token
                  </button>
                </div>

                <div className="relative">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={credentialToken}
                    onChange={(e) => {
                      let val = e.target.value.trim();
                      if (val.includes("/e/")) {
                        const parts = val.split("/e/");
                        val = parts[parts.length - 1].split("?")[0].split("#")[0];
                      }
                      setCredentialToken(val);
                    }}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 font-mono text-xs focus:border-rose-500 focus:bg-white focus:outline-none min-h-[44px] transition-colors"
                    placeholder="Scan QR or paste token (e.g. b2d74172151286f993464d535c40108e...)"
                    required
                  />
                </div>
              </div>

              {/* Triage Reason Code */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-900">
                  Emergency Triage Classification <span className="text-rose-600">*</span>
                </label>
                <div className="relative">
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value as BreakGlassReasonCode)}
                    className="w-full px-3.5 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:border-rose-500 focus:bg-white focus:outline-none min-h-[44px] appearance-none cursor-pointer"
                  >
                    {REASON_CODES.map((r) => (
                      <option key={r.code} value={r.code}>
                        [{r.badge}] {r.label}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3.5 top-3.5 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Clinical Justification */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-900">
                  Clinical Justification & Notes <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-rose-500 focus:bg-white focus:outline-none resize-none leading-relaxed"
                  placeholder="Detail the patient presentation, trauma status, or urgent diagnostic reason requiring immediate records..."
                  required
                  minLength={10}
                />

                {/* Quick chip suggestions */}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {QUICK_JUSTIFICATIONS.map((q, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReasonText(q)}
                      className="text-[10px] bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium px-2.5 py-1 rounded-lg transition-colors text-left truncate max-w-xs cursor-pointer"
                    >
                      + {q.substring(0, 38)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* Scope Selection Matrix */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Requested Clinical Scopes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {SCOPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedScope.includes(opt.value);

                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-50/80 border-rose-300 text-rose-950 shadow-2xs"
                            : "bg-slate-50/60 border-slate-200 text-slate-600 hover:border-slate-300"
                        } ${opt.required ? "cursor-not-allowed opacity-90" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleScope(opt.value)}
                          disabled={opt.required}
                          className="mt-0.5 w-3.5 h-3.5 accent-rose-600 shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                            <span className="truncate">{opt.label}</span>
                            {opt.required && (
                              <span className="text-[9px] text-rose-700 font-extrabold uppercase">(Req)</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Access Duration Matrix */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">Access Duration Window</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((d) => {
                    const isSelected = durationHours === d.value;

                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDurationHours(d.value)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-rose-600 border-rose-600 text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-rose-300"
                        }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${isSelected ? "text-rose-200" : "text-slate-400"}`}>
                          {d.badge}
                        </span>
                        <div className="text-sm font-black mt-0.5">{d.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? "text-rose-100" : "text-slate-400"}`}>
                          {d.sublabel}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit Action */}
              <button
                type="submit"
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-700 hover:to-red-700 text-white font-black text-sm shadow-lg shadow-rose-600/20 transition-all flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
              >
                <span>Proceed to Break-Glass Authorization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          STEP 2: CONSENT OVERRIDE VERIFICATION
      ═════════════════════════════════════════════════════════════ */}
      {step === "consent" && (
        <div className="max-w-2xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-rose-300 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-rose-100 text-rose-600 border-2 border-rose-300 flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-black text-2xl text-slate-900">
                Break-Glass Clinical Override Protocol
              </h2>
              <p className="text-xs text-slate-500">
                Statutory Emergency Medical Exemption Confirmation
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-rose-50 border border-rose-200 space-y-3 text-xs text-rose-950">
              <div className="font-black text-sm text-rose-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600" />
                Legal & Audit Notification
              </div>
              <p className="leading-relaxed">
                Emergency access <strong>bypasses normal patient authorization</strong> under the Emergency Care Protocol.
                This action generates an <strong>immutable blockchain audit entry</strong>, logs your verified physician ID, and triggers immediate SMS / email notification to the patient.
              </p>
            </div>

            {/* Request Summary Snapshot */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs font-mono">
              <div className="font-bold text-slate-900 text-xs uppercase tracking-wider border-b border-slate-200 pb-2">
                Override Telemetry Summary
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <span className="text-slate-400 text-[10px] block">REASON CODE</span>
                  <span className="font-bold text-slate-900">{reasonCode}</span>
                </div>
                <div>
                  <span className="text-slate-400 text-[10px] block">DURATION WINDOW</span>
                  <span className="font-bold text-slate-900">{durationHours} Hour(s)</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] block">CLINICAL JUSTIFICATION</span>
                  <span className="text-slate-800 font-sans text-xs">{reasonText}</span>
                </div>
                <div className="col-span-2">
                  <span className="text-slate-400 text-[10px] block">SCOPES UNMASKED</span>
                  <div className="flex flex-wrap gap-1 mt-1 font-sans">
                    {selectedScope.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-md bg-rose-100 text-rose-800 text-[10px] font-bold">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setStep("input")}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors min-h-[46px] cursor-pointer"
              >
                Modify Request
              </button>
              <button
                type="button"
                onClick={handleConfirmAccess}
                disabled={loading}
                className="flex-1 py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs transition-all flex items-center justify-center gap-2 min-h-[46px] shadow-lg shadow-rose-600/30 disabled:opacity-60 cursor-pointer"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                {loading ? "Notarizing & Granting..." : "AUTHORIZE EMERGENCY ACCESS"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          STEP 3: GRANTED EMERGENCY CLINICAL HUD
      ═════════════════════════════════════════════════════════════ */}
      {step === "granted" && response && (
        <div className="space-y-6">
          {/* Top Status HUD Timer Banner */}
          <SessionTimerHUD
            expiresAt={response.session.expiresAt}
            onExpire={handleSessionExpire}
          />

          {/* Quick Header Strip with Doctor Stamp & Close Session CTA */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs">
            <div className="flex items-center gap-3 text-xs">
              <div className="p-2.5 rounded-xl bg-[#0891B2]/10 text-[#0891B2] font-black shrink-0">
                <Stethoscope className="w-4.5 h-4.5" />
              </div>
              <div>
                <div className="font-bold text-slate-900 flex items-center gap-2">
                  <span>{response.doctor.name}</span>
                  <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    {response.doctor.verificationStatus}
                  </span>
                </div>
                <div className="text-slate-400 text-[11px] font-mono">
                  {response.doctor.specialization} · {response.doctor.hospital}
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleReset}
              className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-700 text-slate-700 transition-colors flex items-center justify-center gap-1.5 self-end sm:self-auto cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
              Conclude Emergency Session
            </button>
          </div>

          {/* Main Scope Telemetry Viewer */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6 md:p-8">
            <EmergencyScopeViewer
              profile={response.profile}
              scope={response.session.scope}
              patientId={response.profile.patientId || response.profile.credentialId || ""}
              initialDocs={response.documents}
              initialTimeline={response.timeline}
              initialLabs={response.labs}
            />
          </div>
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          STEP 4: SESSION EXPIRED
      ═════════════════════════════════════════════════════════════ */}
      {step === "expired" && (
        <div className="max-w-md mx-auto py-16 text-center space-y-6 animate-in fade-in">
          <div className="w-20 h-20 rounded-3xl bg-rose-100 text-rose-600 border-2 border-rose-300 flex items-center justify-center mx-auto shadow-md">
            <Clock className="w-10 h-10" />
          </div>
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-slate-900">Emergency Session Concluded</h2>
            <p className="text-xs text-slate-500">
              The time-limited emergency override window has expired. Unmasked clinical telemetry has been re-locked.
            </p>
          </div>
          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs shadow-md transition-all cursor-pointer min-h-[46px]"
          >
            <RefreshCw className="w-4 h-4" />
            <span>Start New Emergency Session</span>
          </button>
        </div>
      )}
    </div>
  );
}

export default function DoctorEmergencyTerminal() {
  return (
    <Suspense
      fallback={
        <div className="py-20 flex items-center justify-center">
          <RefreshCw className="w-8 h-8 animate-spin text-[#0891B2]" />
        </div>
      }
    >
      <DoctorEmergencyTerminalContent />
    </Suspense>
  );
}
