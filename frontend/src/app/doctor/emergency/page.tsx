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
  Upload,
  Flame,
  Zap,
  Radio,
  FileSpreadsheet,
  HeartPulse,
  Thermometer,
  AlertOctagon,
  Bot,
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
import jsQR from "jsqr";
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
          ? "bg-slate-900 border-cyan-500/80 text-white shadow-lg shadow-cyan-900/20 animate-pulse"
          : "bg-slate-900/90 border-slate-800 text-slate-100 shadow-md"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
              critical ? "bg-[#0891B2] text-white" : "bg-[#0891B2]/20 text-[#22D3EE] border border-[#0891B2]/30"
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
                    ? "bg-[#0891B2] text-white animate-bounce"
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
              critical ? "text-[#22D3EE]" : "text-[#22D3EE]"
            }`}
          >
            {remaining || "--:--"}
          </div>
        </div>
      </div>

      {/* Progress Telemetry Bar */}
      <div className="mt-3.5 h-2 rounded-full bg-slate-800 overflow-hidden relative">
        <div
          className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-[#0891B2] to-[#22D3EE]"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Helper: Extract clean emergency token from QR text or URL
// ─────────────────────────────────────────────────────────────────

function extractEmergencyToken(raw: string): string {
  let cleaned = raw.trim();
  if (cleaned.includes("/e/")) {
    const parts = cleaned.split("/e/");
    cleaned = parts[parts.length - 1].split("?")[0].split("#")[0];
  } else if (cleaned.includes("token=")) {
    const match = cleaned.match(/token=([a-zA-Z0-9_-]+)/);
    if (match) cleaned = match[1];
  }
  return cleaned;
}

// ─────────────────────────────────────────────────────────────────
// Interactive Live Camera & QR Scanning Modal
// ─────────────────────────────────────────────────────────────────

function LiveScannerModal({
  isOpen,
  onClose,
  onTokenScanned,
}: {
  isOpen: boolean;
  onClose: () => void;
  onTokenScanned: (token: string) => void;
}) {
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scannedSuccess, setScannedSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const modalFileInputRef = useRef<HTMLInputElement | null>(null);

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  const startCamera = async () => {
    setCameraError(null);
    setScannedSuccess(false);
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment", width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.setAttribute("playsinline", "true");
          await videoRef.current.play();
        }
        setCameraActive(true);
        startScanningLoop();
      } else {
        throw new Error("Camera API not supported on this browser.");
      }
    } catch (err: any) {
      setCameraError(err.message || "Unable to access camera. Please allow camera permissions or upload an image.");
      setCameraActive(false);
    }
  };

  const startScanningLoop = () => {
    const scan = () => {
      if (videoRef.current && videoRef.current.readyState === videoRef.current.HAVE_ENOUGH_DATA) {
        const video = videoRef.current;
        if (!canvasRef.current) {
          canvasRef.current = document.createElement("canvas");
        }
        const canvas = canvasRef.current;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height, {
            inversionAttempts: "dontInvert",
          });

          if (code && code.data) {
            const token = extractEmergencyToken(code.data);
            if (token) {
              setScannedSuccess(true);
              stopCamera();
              onTokenScanned(token);
              setTimeout(() => {
                onClose();
              }, 600);
              return;
            }
          }
        }
      }
      animFrameRef.current = requestAnimationFrame(scan);
    };

    animFrameRef.current = requestAnimationFrame(scan);
  };

  const handleModalImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const token = extractEmergencyToken(code.data);
            setScannedSuccess(true);
            stopCamera();
            onTokenScanned(token);
            setTimeout(() => {
              onClose();
            }, 600);
          } else {
            setCameraError("No QR code detected in the selected image. Please try another image.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  useEffect(() => {
    if (isOpen) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => {
      stopCamera();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="max-w-md w-full rounded-3xl bg-slate-900 border border-slate-800 text-white shadow-2xl p-6 space-y-4 relative overflow-hidden">
        <div className="absolute inset-0 bg-[radial-gradient(#1E293B_1px,transparent_1px)] [background-size:16px_16px] opacity-40 pointer-events-none" />

        <div className="relative z-10 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-[#0891B2] animate-ping" />
            <span className="text-xs font-black text-[#22D3EE] uppercase tracking-wider font-mono">
              Live Scanner Telemetry
            </span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Scan Viewport */}
        <div className="relative aspect-square max-h-72 w-full mx-auto rounded-2xl bg-slate-950 border-2 border-cyan-500/40 overflow-hidden flex flex-col items-center justify-center p-4 group">
          {cameraActive ? (
            <div className="relative w-full h-full">
              <video ref={videoRef} className="w-full h-full object-cover rounded-xl" autoPlay playsInline muted />
              
              {/* Corner Targets */}
              <div className="absolute top-2 left-2 w-6 h-6 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute top-2 right-2 w-6 h-6 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 left-2 w-6 h-6 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
              <div className="absolute bottom-2 right-2 w-6 h-6 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

              {/* Laser Sweep */}
              <div className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-[#22D3EE] to-transparent shadow-[0_0_15px_#22d3ee] animate-[bounce_2s_infinite] pointer-events-none" />

              {scannedSuccess && (
                <div className="absolute inset-0 bg-emerald-950/80 backdrop-blur-xs rounded-xl flex flex-col items-center justify-center space-y-2 animate-in zoom-in-95">
                  <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                  <span className="text-sm font-black text-emerald-200">QR CODE RECOGNIZED</span>
                  <span className="text-xs text-emerald-300 font-mono">Attaching emergency token...</span>
                </div>
              )}
            </div>
          ) : (
            <>
              <QrCode className="w-20 h-20 text-cyan-400/70 group-hover:scale-105 transition-transform" />
              <div className="mt-3 text-center space-y-1">
                <span className="text-[11px] font-mono text-cyan-300 font-bold bg-cyan-950/80 px-3 py-1 rounded-full border border-cyan-500/30 uppercase tracking-wider block">
                  Optical Scanner Standby
                </span>
                <p className="text-[10px] text-slate-400">Position emergency QR code inside frame</p>
              </div>
            </>
          )}
        </div>

        {cameraError && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-700 text-slate-300 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-[#22D3EE] shrink-0" />
            <span>{cameraError}</span>
          </div>
        )}

        <div className="relative z-10 space-y-2 pt-1">
          <input
            type="file"
            ref={modalFileInputRef}
            accept="image/*"
            className="hidden"
            onChange={handleModalImageUpload}
          />
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                if (cameraActive) stopCamera();
                else startCamera();
              }}
              className="py-2.5 px-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Camera className="w-4 h-4" />
              <span>{cameraActive ? "Restart Lens" : "Start Camera"}</span>
            </button>

            <button
              type="button"
              onClick={() => modalFileInputRef.current?.click()}
              className="py-2.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#22D3EE] border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Upload className="w-4 h-4 text-[#22D3EE]" />
              <span>Upload QR File</span>
            </button>
          </div>

          <p className="text-[10px] text-slate-400 text-center font-mono pt-1">
            Real-time automated QR detection via camera or uploaded image file.
          </p>
        </div>
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
      <div className="p-6 md:p-8 rounded-3xl bg-slate-900 text-white border border-cyan-500/30 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-[#0891B2]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[#0891B2] text-white font-black text-3xl flex items-center justify-center border-2 border-cyan-300/40 shadow-lg shadow-cyan-900/40 shrink-0">
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
          <div className="flex items-center gap-3 bg-slate-950/80 p-3.5 rounded-2xl border border-cyan-500/40 shrink-0 shadow-md">
            <div className="text-right">
              <span className="text-[10px] font-black text-[#22D3EE] uppercase tracking-widest block font-mono">
                Blood Group
              </span>
              <span className="text-xs text-slate-300 font-bold">Transfusion Match</span>
            </div>
            <div className="px-5 py-2.5 rounded-xl bg-[#0891B2] text-white font-black text-2xl font-mono border border-cyan-400 shadow-inner">
              {profile.bloodGroup || "N/A"}
            </div>
          </div>
        </div>
      </div>

      {/* Main Clinical Triage Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Critical Allergies Card */}
        <div className="p-6 rounded-3xl bg-white border border-cyan-200/80 shadow-xs space-y-3 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 font-heading">
              <AlertTriangle className="w-4.5 h-4.5 text-[#0891B2]" />
              Critical Allergies & Anaphylaxis Warnings
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-cyan-100 text-[#0891B2] border border-cyan-200 font-mono">
              {profile.allergies?.length || 0} DOCUMENTED
            </span>
          </div>

          {profile.allergies && profile.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.allergies.map((a, i) => (
                <div
                  key={i}
                  className="px-3.5 py-1.5 rounded-xl bg-[#0891B2] text-white font-black text-xs shadow-sm flex items-center gap-1.5"
                >
                  <AlertOctagon className="w-3.5 h-3.5 text-cyan-200" />
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
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-[#0F172A] uppercase tracking-wider flex items-center gap-2 font-heading">
              <Activity className="w-4.5 h-4.5 text-[#0891B2]" />
              Chronic Conditions & Medical History
            </div>
            <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200 font-mono">
              {profile.chronicConditions?.length || 0} ACTIVE
            </span>
          </div>

          {profile.chronicConditions && profile.chronicConditions.length > 0 ? (
            <div className="flex flex-wrap gap-2 pt-1">
              {profile.chronicConditions.map((c, i) => (
                <div
                  key={i}
                  className="px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-bold text-xs flex items-center gap-1.5"
                >
                  <span className="w-2 h-2 rounded-full bg-[#0891B2]" />
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
          <div className="w-8 h-8 rounded-xl bg-cyan-600/20 text-[#22D3EE] flex items-center justify-center shrink-0 border border-cyan-500/30">
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
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
          >
            <Pill className="w-3.5 h-3.5" />
            STAT Prescription
          </Link>
          <Link
            href="/doctor/copilot"
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-[#22D3EE] border border-slate-700 font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-sm min-h-[38px]"
          >
            <Bot className="w-3.5 h-3.5" />
            AI Diagnostic Copilot
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
              ? "bg-[#0891B2] text-white shadow-sm"
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
              ? "bg-[#0891B2] text-white shadow-sm"
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
              ? "bg-[#0891B2] text-white shadow-sm"
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
              ? "bg-[#0891B2] text-white shadow-sm"
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
                      <div className="p-3 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-200 shrink-0">
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
                      className="px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-sm cursor-pointer"
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
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-[#0F172A] flex items-center gap-2 font-semibold shadow-xs">
            <Activity className="w-4 h-4 text-[#0891B2] shrink-0" />
            <span>Longitudinal Clinical Event Stream — Medical Procedures, Diagnoses & Consultations</span>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="relative pl-9 space-y-1">
                  <div className="absolute left-2 top-2.5 w-4 h-4 rounded-full bg-[#0891B2] border-2 border-white shadow-xs" />
                  <div className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-[#0891B2] bg-cyan-50 px-2.5 py-0.5 rounded-full border border-cyan-200 font-mono">
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
          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center gap-2 font-semibold shadow-xs">
            <FlaskConical className="w-4 h-4 text-[#0891B2] shrink-0" />
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
                          ? "bg-slate-200 text-slate-900 border border-slate-300"
                          : "bg-cyan-50 text-[#0891B2] border border-cyan-200"
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

  // Scanner Modal & QR Upload State
  const [isScannerModalOpen, setIsScannerModalOpen] = useState(false);
  const [qrSuccessNotice, setQrSuccessNotice] = useState<string | null>(null);
  const qrFileInputRef = useRef<HTMLInputElement | null>(null);

  // Auto-populate from URL query or storage bridge
  useEffect(() => {
    const tokenQuery = searchParams?.get("token") || searchParams?.get("credential");
    let fallbackToken: string | null = null;
    if (typeof window !== "undefined") {
      try {
        fallbackToken =
          sessionStorage.getItem("medivault_pending_break_glass_token") ||
          localStorage.getItem("medivault_pending_break_glass_token");
      } catch {}
    }

    const rawToken = tokenQuery || fallbackToken;
    if (rawToken) {
      const cleanToken = extractEmergencyToken(rawToken);
      if (cleanToken) {
        setCredentialToken(cleanToken);
        setQrSuccessNotice("Patient emergency credential token auto-attached from emergency scan.");
      }
      if (typeof window !== "undefined") {
        try {
          sessionStorage.removeItem("medivault_pending_break_glass_token");
          localStorage.removeItem("medivault_pending_break_glass_token");
        } catch {}
      }
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
    setQrSuccessNotice("Active ER demo patient credentials loaded.");
    setTimeout(() => setQrSuccessNotice(null), 4000);
  };

  const handleMainQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError("");

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(imageData.data, imageData.width, imageData.height);
          if (code && code.data) {
            const token = extractEmergencyToken(code.data);
            setCredentialToken(token);
            setQrSuccessNotice("QR image recognized! Patient emergency token attached.");
            setTimeout(() => setQrSuccessNotice(null), 5000);
          } else {
            setError("No valid QR code found in the selected image. Please try another image or scan via camera.");
          }
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
    // Reset file input value so same file can be re-selected if needed
    e.target.value = "";
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentialToken.trim()) {
      setError("Emergency credential token is required. Scan patient QR code, upload QR image, or paste token.");
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
    setQrSuccessNotice(null);
  };

  const handleSessionExpire = () => {
    setStep("expired");
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Top Clinical Command Header */}
      <div className="p-6 sm:p-8 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-[#0891B2]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-[#0891B2]/15 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-800/80 border border-cyan-500/40 text-[#22D3EE] text-xs font-bold uppercase tracking-wider font-mono">
              <span className="w-2 h-2 rounded-full bg-[#0891B2] animate-ping" />
              Level 1 Trauma Emergency Terminal
            </div>
            <h1 className="font-heading font-black text-2xl sm:text-3xl tracking-tight flex items-center gap-3 text-white">
              <ShieldAlert className="w-7 h-7 sm:w-8 h-8 text-[#22D3EE] shrink-0" />
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
          STEP 1: FULL-WIDTH BREAK-GLASS INPUT & PROTOCOL SIDEBAR
      ═════════════════════════════════════════════════════════════ */}
      {step === "input" && (
        <div className="w-full grid grid-cols-1 xl:grid-cols-12 gap-6 items-start animate-in zoom-in-95 duration-200">
          {/* Main Left Column: Emergency Authorization Form (8 cols) */}
          <div className="xl:col-span-8 p-6 sm:p-9 rounded-3xl bg-white border border-slate-200 shadow-sm space-y-7">
            <div className="space-y-1.5 border-b border-slate-100 pb-4">
              <h2 className="font-heading font-black text-xl text-slate-900 flex items-center gap-2.5">
                <AlertTriangle className="w-5 h-5 text-[#0891B2]" />
                Emergency Access Authorization Protocol
              </h2>
              <p className="text-xs text-slate-500">
                Supply the patient&apos;s emergency credential token or scan the QR code to proceed with statutory emergency override.
              </p>
            </div>

            {/* Error Notification */}
            {error && (
              <div className="p-4 rounded-2xl bg-slate-100 border border-slate-200 text-xs text-slate-800 font-semibold flex items-start gap-2.5 animate-in fade-in">
                <XCircle className="w-4.5 h-4.5 text-slate-600 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Success QR Notification */}
            {qrSuccessNotice && (
              <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-[#0891B2] font-bold flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4.5 h-4.5 text-[#0891B2] shrink-0" />
                <span>{qrSuccessNotice}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* SECTION 1: Patient Emergency Credential Token & QR */}
              <div className="space-y-2.5 p-5 rounded-2xl bg-slate-50/80 border border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div>
                    <label className="block text-xs font-bold text-slate-900">
                      Emergency Credential Token or QR <span className="text-[#0891B2]">*</span>
                    </label>
                    <span className="text-[11px] text-slate-400">Scan bracelet/badge, upload QR image, or enter token</span>
                  </div>

                  {/* Action Buttons Row */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => setIsScannerModalOpen(true)}
                      className="px-3.5 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Scan with Camera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => qrFileInputRef.current?.click()}
                      className="px-3.5 py-2 rounded-xl bg-white hover:bg-cyan-50 text-[#0891B2] border border-cyan-200 text-xs font-bold transition-all flex items-center gap-1.5 shadow-2xs cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Upload QR Image</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleQuickDemoLoad}
                      className="px-3 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-600 border border-slate-200 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                    >
                      <Zap className="w-3.5 h-3.5 text-[#0891B2]" />
                      <span>Demo Token</span>
                    </button>

                    {/* Hidden QR File Input */}
                    <input
                      type="file"
                      ref={qrFileInputRef}
                      accept="image/*"
                      className="hidden"
                      onChange={handleMainQrUpload}
                    />
                  </div>
                </div>

                {/* Main Token Input Field */}
                <div className="relative mt-2">
                  <KeyRound className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
                  <input
                    type="text"
                    value={credentialToken}
                    onChange={(e) => {
                      setCredentialToken(extractEmergencyToken(e.target.value));
                    }}
                    className="w-full pl-10 pr-10 py-3 rounded-xl bg-white border border-slate-200 text-slate-900 font-mono text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[44px] transition-colors shadow-2xs"
                    placeholder="Scan QR, upload image, or paste 64-char hex hash..."
                    required
                  />
                  {credentialToken && (
                    <button
                      type="button"
                      onClick={() => setCredentialToken("")}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>

                {credentialToken && (
                  <div className="pt-1 flex items-center justify-between text-[11px] font-mono text-slate-500">
                    <span className="flex items-center gap-1 text-[#0891B2] font-bold">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Attached Token
                    </span>
                    <span className="truncate max-w-xs">{credentialToken.substring(0, 24)}...{credentialToken.substring(credentialToken.length - 8)}</span>
                  </div>
                )}
              </div>

              {/* SECTION 2: Triage Classification */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Emergency Triage Classification <span className="text-[#0891B2]">*</span>
                </label>
                <div className="relative">
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value as BreakGlassReasonCode)}
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs font-bold focus:border-[#0891B2] focus:bg-white focus:outline-none min-h-[44px] appearance-none cursor-pointer"
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

              {/* SECTION 3: Clinical Justification */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900">
                    Clinical Justification & Medical Notes <span className="text-[#0891B2]">*</span>
                  </label>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {reasonText.length} chars (min 10)
                  </span>
                </div>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-900 text-xs focus:border-[#0891B2] focus:bg-white focus:outline-none resize-none leading-relaxed"
                  placeholder="Detail the trauma presentation, unconscious state, or urgent diagnostic justification requiring emergency override..."
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
                      className="text-[10px] bg-slate-100 hover:bg-cyan-50 hover:text-[#0891B2] hover:border-cyan-200 border border-transparent text-slate-700 font-medium px-2.5 py-1 rounded-lg transition-colors text-left truncate max-w-xs cursor-pointer"
                    >
                      + {q.substring(0, 38)}...
                    </button>
                  ))}
                </div>
              </div>

              {/* SECTION 4: Scope Selection Matrix */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">
                  Requested Clinical Scopes
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {SCOPE_OPTIONS.map((opt) => {
                    const Icon = opt.icon;
                    const isSelected = selectedScope.includes(opt.value);

                    return (
                      <label
                        key={opt.value}
                        className={`flex items-start gap-2.5 p-3 rounded-2xl border transition-all cursor-pointer ${
                          isSelected
                            ? "bg-cyan-50/80 border-cyan-300 text-[#0F172A] shadow-2xs"
                            : "bg-slate-50/60 border-slate-200 text-slate-600 hover:border-slate-300"
                        } ${opt.required ? "cursor-not-allowed opacity-90" : ""}`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleScope(opt.value)}
                          disabled={opt.required}
                          className="mt-0.5 w-3.5 h-3.5 accent-[#0891B2] shrink-0"
                        />
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-bold flex items-center gap-1.5">
                            <Icon className="w-3.5 h-3.5 text-[#0891B2] shrink-0" />
                            <span className="truncate">{opt.label}</span>
                            {opt.required && (
                              <span className="text-[9px] text-[#0891B2] font-extrabold uppercase">(Req)</span>
                            )}
                          </div>
                          <p className="text-[10px] text-slate-500 mt-0.5 line-clamp-1">{opt.description}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* SECTION 5: Access Duration Window */}
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-900">Access Duration Window</label>
                <div className="grid grid-cols-3 gap-2.5">
                  {DURATION_OPTIONS.map((d) => {
                    const isSelected = durationHours === d.value;

                    return (
                      <button
                        key={d.value}
                        type="button"
                        onClick={() => setDurationHours(d.value)}
                        className={`p-3 rounded-2xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#0891B2] border-[#0891B2] text-white shadow-sm"
                            : "bg-slate-50 border-slate-200 text-slate-700 hover:border-cyan-300"
                        }`}
                      >
                        <span className={`text-[9px] font-black uppercase tracking-wider block ${isSelected ? "text-cyan-200" : "text-slate-400"}`}>
                          {d.badge}
                        </span>
                        <div className="text-sm font-black mt-0.5">{d.label}</div>
                        <div className={`text-[10px] mt-0.5 ${isSelected ? "text-cyan-100" : "text-slate-400"}`}>
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
                className="w-full py-4 px-6 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-black text-sm shadow-lg shadow-cyan-600/20 transition-all flex items-center justify-center gap-2 min-h-[50px] cursor-pointer"
              >
                <Lock className="w-4 h-4" />
                <span>Proceed to Break-Glass Authorization</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>

          {/* Right Column: Statutory Protocol & Safeguards Sidebar (4 cols) */}
          <div className="xl:col-span-4 space-y-5">
            {/* Card 1: Attending Physician Clearance */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200 shadow-xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Attending Physician
                </span>
                <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                  VERIFIED CLINICIAN
                </span>
              </div>

              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-2xl bg-[#0891B2]/10 text-[#0891B2] flex items-center justify-center font-black shrink-0">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h4 className="text-sm font-bold text-slate-900 truncate">
                    {userProfile?.displayName || user?.email || "Dr. Attending Physician"}
                  </h4>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Emergency Medicine · Trauma ICU
                  </p>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[11px] font-mono text-slate-500">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase">License Status</span>
                  <span className="font-bold text-slate-900">Active / Good Standing</span>
                </div>
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-400 block uppercase">Hospital Station</span>
                  <span className="font-bold text-slate-900">General Trauma ER</span>
                </div>
              </div>
            </div>

            {/* Card 2: Statutory Safeguards & Legal Protocol */}
            <div className="p-6 rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl space-y-4 relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#0891B2]/15 blur-2xl pointer-events-none" />

              <div className="relative z-10 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-[#22D3EE]" />
                <h3 className="font-heading font-black text-sm text-white">
                  Statutory Protocol Safeguards
                </h3>
              </div>

              <div className="relative z-10 space-y-3 text-xs text-slate-300">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Cryptographic Audit Chaining</span>
                    <span className="text-slate-400 text-[11px]">Every unmasking event is logged to the SHA-256 ledger.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Instant Patient Dispatch</span>
                    <span className="text-slate-400 text-[11px]">Real-time SMS & email dispatched to the patient or proxy.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">Time-Bound Key Purge</span>
                    <span className="text-slate-400 text-[11px]">Temporary decryption keys self-destruct upon session expiry.</span>
                  </div>
                </div>

                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold text-white block">HIPAA / GDPR Compliant</span>
                    <span className="text-slate-400 text-[11px]">Operates under Section 164.512(j) emergency care exemption.</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Card 3: Quick Optical Scanner Launcher */}
            <div className="p-6 rounded-3xl bg-cyan-50/70 border border-cyan-200 space-y-3.5">
              <div className="flex items-center gap-2">
                <QrCode className="w-5 h-5 text-[#0891B2]" />
                <h4 className="font-bold text-xs text-slate-900 uppercase tracking-wider">
                  Optical Lens Quick Scanner
                </h4>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Scan patient wristbands or emergency badges directly with device camera for instantaneous token ingestion.
              </p>
              <button
                type="button"
                onClick={() => setIsScannerModalOpen(true)}
                className="w-full py-2.5 px-4 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs transition-all flex items-center justify-center gap-2 shadow-xs cursor-pointer"
              >
                <Camera className="w-4 h-4" />
                <span>Launch Camera Scanner</span>
              </button>
            </div>
          </div>

          {/* Live Camera Scanner Modal Triggered on Click */}
          <LiveScannerModal
            isOpen={isScannerModalOpen}
            onClose={() => setIsScannerModalOpen(false)}
            onTokenScanned={(token) => {
              setCredentialToken(token);
              setQrSuccessNotice("QR code scanned & emergency token attached!");
              setTimeout(() => setQrSuccessNotice(null), 5000);
            }}
          />
        </div>
      )}

      {/* ═════════════════════════════════════════════════════════════
          STEP 2: CONSENT OVERRIDE VERIFICATION
      ═════════════════════════════════════════════════════════════ */}
      {step === "consent" && (
        <div className="max-w-4xl mx-auto animate-in zoom-in-95 duration-200">
          <div className="p-8 sm:p-10 rounded-3xl bg-white border border-cyan-300 shadow-2xl space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-3xl bg-cyan-100 text-[#0891B2] border-2 border-cyan-300 flex items-center justify-center mx-auto shadow-md">
                <Lock className="w-8 h-8" />
              </div>
              <h2 className="font-heading font-black text-2xl text-slate-900">
                Break-Glass Clinical Override Protocol
              </h2>
              <p className="text-xs text-slate-500">
                Statutory Emergency Medical Exemption Confirmation
              </p>
            </div>

            <div className="p-5 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-3 text-xs text-slate-800">
              <div className="font-black text-sm text-[#0891B2] flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-[#0891B2]" />
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
                      <span key={s} className="px-2 py-0.5 rounded-md bg-cyan-100 text-[#0891B2] text-[10px] font-bold">
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
                className="flex-1 py-3.5 px-4 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-black text-xs transition-all flex items-center justify-center gap-2 min-h-[46px] shadow-lg shadow-cyan-600/30 disabled:opacity-60 cursor-pointer"
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
              className="text-xs font-bold px-4 py-2 rounded-xl bg-slate-100 hover:bg-cyan-50 hover:text-[#0891B2] text-slate-700 transition-colors flex items-center justify-center gap-1.5 self-end sm:self-auto cursor-pointer"
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
          <div className="w-20 h-20 rounded-3xl bg-slate-100 text-[#0891B2] border-2 border-slate-300 flex items-center justify-center mx-auto shadow-md">
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
