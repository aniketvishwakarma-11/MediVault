"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { emergencyApi, type PublicEmergencyProfile } from "@/lib/emergency-api";
import {
  ShieldAlert,
  Phone,
  AlertTriangle,
  HeartPulse,
  Pill,
  User,
  Droplets,
  Activity,
  Stethoscope,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  ExternalLink,
  Lock,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Emergency Gateway — Public page, no auth required
// Loaded when someone scans a MediVault Emergency QR code
// ─────────────────────────────────────────────────────────────────

type GatewayState =
  | { status: "loading" }
  | { status: "loaded"; credentialId: string; profile: PublicEmergencyProfile }
  | { status: "error"; code: "INVALID" | "EXPIRED" | "REVOKED" | "SUSPENDED" | "NETWORK" | "UNAVAILABLE"; message: string };

const ERROR_MESSAGES = {
  INVALID: {
    title: "Invalid QR Code",
    body: "This emergency credential is not recognized. The QR code may be damaged or the credential does not exist in this system.",
    action: "Ask the patient to show their updated MediVault Emergency Pass.",
  },
  EXPIRED: {
    title: "QR Code Expired",
    body: "This emergency credential has expired and is no longer valid.",
    action: "Ask the patient to generate a new Emergency Pass from their MediVault account.",
  },
  REVOKED: {
    title: "QR Code Revoked",
    body: "This emergency credential has been deactivated by the patient.",
    action: "Ask the patient to generate a new Emergency Pass from their MediVault account.",
  },
  SUSPENDED: {
    title: "Access Suspended",
    body: "This emergency credential has been temporarily suspended.",
    action: "Contact MediVault support or ask the patient to regenerate their Emergency Pass.",
  },
  NETWORK: {
    title: "Connection Error",
    body: "Unable to reach the MediVault emergency system.",
    action: "Check your internet connection and try again. If the problem persists, call emergency services directly.",
  },
  UNAVAILABLE: {
    title: "System Unavailable",
    body: "The emergency profile system is temporarily unavailable.",
    action: "Call emergency services directly. Try again in a few moments.",
  },
};

function BloodGroupBadge({ group }: { group: string }) {
  return (
    <div className="inline-flex items-center gap-1.5 sm:gap-2 px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl sm:rounded-2xl bg-red-600 text-white font-black text-xl sm:text-2xl shadow-lg shadow-red-900/40 border-2 border-red-400 shrink-0">
      <Droplets className="w-5 h-5 sm:w-6 h-6" />
      <span>{group}</span>
    </div>
  );
}

function AllergyBadge({ allergy }: { allergy: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-red-900/60 text-red-200 text-sm font-bold border border-red-700/60">
      <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
      {allergy}
    </span>
  );
}

function Section({
  icon: Icon,
  label,
  color = "text-slate-300",
  children,
  highlight = false,
}: {
  icon: React.ElementType;
  label: string;
  color?: string;
  children: React.ReactNode;
  highlight?: boolean;
}) {
  return (
    <div className={`p-5 rounded-2xl border ${highlight ? "bg-red-950/40 border-red-800/50" : "bg-white/5 border-white/10"}`}>
      <div className={`flex items-center gap-2 mb-3 text-xs font-black uppercase tracking-widest ${color}`}>
        <Icon className="w-4 h-4" />
        {label}
      </div>
      {children}
    </div>
  );
}

export default function EmergencyGatewayPage() {
  const routeParams = useParams();
  const credential = (routeParams?.credential as string) || "";
  const [state, setState] = useState<GatewayState>({ status: "loading" });
  const [showDoctorInfo, setShowDoctorInfo] = useState(false);

  const load = useCallback(async () => {
    if (!credential) return;
    setState({ status: "loading" });
    try {
      const result = await emergencyApi.resolvePublicCredential(credential);
      setState({ status: "loaded", credentialId: result.credentialId, profile: result.profile });
    } catch (err: any) {
      const msg = err.message || "";
      if (msg.includes("expired") || msg.toLowerCase().includes("expired")) {
        setState({ status: "error", code: "EXPIRED", message: msg });
      } else if (msg.includes("revoked") || msg.toLowerCase().includes("revoked")) {
        setState({ status: "error", code: "REVOKED", message: msg });
      } else if (msg.includes("suspended") || msg.toLowerCase().includes("suspended")) {
        setState({ status: "error", code: "SUSPENDED", message: msg });
      } else if (msg.includes("not recognized") || msg.includes("not found") || msg.includes("404")) {
        setState({ status: "error", code: "INVALID", message: msg });
      } else if (msg.includes("unavailable") || msg.includes("503")) {
        setState({ status: "error", code: "UNAVAILABLE", message: msg });
      } else {
        setState({ status: "error", code: "NETWORK", message: msg });
      }
    }
  }, [credential]);

  useEffect(() => { load(); }, [load]);

  // ─── Loading ───
  if (state.status === "loading") {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 rounded-full bg-red-600/20 border-2 border-red-600 flex items-center justify-center mx-auto animate-pulse">
            <ShieldAlert className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-white text-lg font-bold">Validating Emergency Credential...</p>
          <p className="text-slate-400 text-sm">Please wait</p>
        </div>
      </div>
    );
  }

  // ─── Error ───
  if (state.status === "error") {
    const info = ERROR_MESSAGES[state.code];
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6">
          <div className="text-center space-y-3">
            <div className="w-20 h-20 rounded-full bg-slate-800 border-2 border-slate-600 flex items-center justify-center mx-auto">
              <XCircle className="w-10 h-10 text-slate-400" />
            </div>
            <h1 className="text-2xl font-black text-white">{info.title}</h1>
            <p className="text-slate-300 text-sm leading-relaxed">{info.body}</p>
          </div>

          <div className="p-4 rounded-2xl bg-amber-900/30 border border-amber-700/40">
            <p className="text-amber-200 text-sm font-semibold">{info.action}</p>
          </div>

          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 text-center">
            <p className="text-slate-400 text-xs mb-2">In an emergency, call</p>
            <a href="tel:112" className="text-white text-2xl font-black hover:text-red-400 transition-colors">
              112
            </a>
            <span className="text-slate-500 mx-3">/</span>
            <a href="tel:911" className="text-white text-2xl font-black hover:text-red-400 transition-colors">
              911
            </a>
          </div>

          <p className="text-center text-slate-600 text-xs">MediVault Emergency Access System</p>
        </div>
      </div>
    );
  }

  // ─── Loaded ───
  const { profile } = state;
  const hasAllergies = profile.allergies.length > 0;
  const hasMeds = profile.currentMedications.length > 0;
  const hasConditions = profile.chronicConditions.length > 0;
  const hasContacts = profile.emergencyContacts.filter((c) => c.enabled !== false).length > 0;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Critical Header Banner */}
      <div className="bg-red-700 px-4 py-3 text-center">
        <div className="flex items-center justify-center gap-2 text-white font-black text-sm uppercase tracking-widest">
          <ShieldAlert className="w-5 h-5" />
          EMERGENCY MEDICAL INFORMATION
          <ShieldAlert className="w-5 h-5" />
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
        {/* Patient Identity */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white/5 border border-white/15 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3 sm:gap-4">
            <div>
              <div className="text-xs text-slate-400 uppercase tracking-widest font-bold mb-1">Patient</div>
              <h1 className="text-2xl sm:text-3xl font-black text-white">{profile.patientDisplayName}</h1>
              <div className="flex items-center gap-1.5 mt-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-xs text-emerald-400 font-semibold">MediVault Verified Identity</span>
              </div>
            </div>
            {profile.bloodGroup && <BloodGroupBadge group={profile.bloodGroup} />}
          </div>

          {profile.emergencyNotes && (
            <div className="p-3.5 rounded-xl bg-amber-900/40 border border-amber-700/50">
              <p className="text-amber-200 text-sm font-semibold">{profile.emergencyNotes}</p>
            </div>
          )}
        </div>

        {/* CRITICAL ALLERGIES — always shown first */}
        {hasAllergies && (
          <Section icon={AlertTriangle} label="Critical Allergies" color="text-red-400" highlight>
            <div className="flex flex-wrap gap-2">
              {profile.allergies.map((a, i) => (
                <AllergyBadge key={i} allergy={a} />
              ))}
            </div>
          </Section>
        )}

        {/* Custom Critical Alerts */}
        {profile.criticalAlerts.filter((a) => !profile.allergies.some((allergy) => a.includes(allergy))).length > 0 && (
          <Section icon={AlertTriangle} label="Medical Alerts" color="text-amber-400" highlight>
            <div className="space-y-1.5">
              {profile.criticalAlerts
                .filter((a) => !profile.allergies.some((allergy) => a.includes(allergy)))
                .map((alert, i) => (
                  <div key={i} className="flex items-center gap-2 text-amber-200 text-sm font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                    {alert}
                  </div>
                ))}
            </div>
          </Section>
        )}

        {/* Medications */}
        {hasMeds && (
          <Section icon={Pill} label="Current Medications" color="text-sky-400">
            <div className="space-y-2">
              {profile.currentMedications.map((med, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  <span className="text-white text-sm font-medium">{med}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Chronic Conditions */}
        {hasConditions && (
          <Section icon={Activity} label="Chronic Conditions" color="text-violet-400">
            <div className="space-y-2">
              {profile.chronicConditions.map((cond, i) => (
                <div key={i} className="flex items-center gap-2.5 py-1.5">
                  <span className="w-2 h-2 rounded-full bg-violet-500 shrink-0" />
                  <span className="text-white text-sm font-medium">{cond}</span>
                </div>
              ))}
            </div>
          </Section>
        )}

        {/* Emergency Contacts */}
        {hasContacts && (
          <Section icon={Phone} label="Emergency Contacts" color="text-emerald-400">
            <div className="space-y-3">
              {profile.emergencyContacts
                .filter((c) => c.enabled !== false)
                .sort((a, b) => (a.priority || 0) - (b.priority || 0))
                .map((contact, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div>
                      <div className="text-white font-bold text-sm">{contact.name}</div>
                      <div className="text-slate-400 text-xs">{contact.relationship}</div>
                    </div>
                    {contact.phone && (
                      <a
                        href={`tel:${contact.phone}`}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold transition-colors min-h-[40px]"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        {contact.phone}
                      </a>
                    )}
                  </div>
                ))}
            </div>
          </Section>
        )}

        {/* Emergency Services */}
        <div className="grid grid-cols-2 gap-3">
          <a
            href="tel:112"
            className="p-4 rounded-2xl bg-red-700 hover:bg-red-600 text-white font-black text-center text-lg transition-colors min-h-[64px] flex flex-col items-center justify-center gap-1"
          >
            <Phone className="w-5 h-5" />
            112
            <span className="text-xs font-semibold opacity-80">Emergency</span>
          </a>
          <a
            href="tel:108"
            className="p-4 rounded-2xl bg-amber-700 hover:bg-amber-600 text-white font-black text-center text-lg transition-colors min-h-[64px] flex flex-col items-center justify-center gap-1"
          >
            <HeartPulse className="w-5 h-5" />
            108
            <span className="text-xs font-semibold opacity-80">Ambulance</span>
          </a>
        </div>

        {/* Healthcare Professional Access */}
        <div className="rounded-3xl border border-white/10 overflow-hidden">
          <button
            onClick={() => setShowDoctorInfo(!showDoctorInfo)}
            className="w-full p-5 flex items-center justify-between text-left hover:bg-white/5 transition-colors"
            aria-expanded={showDoctorInfo}
          >
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-900/50 border border-sky-700/40">
                <Stethoscope className="w-5 h-5 text-sky-400" />
              </div>
              <div>
                <div className="text-white font-bold text-sm">Healthcare Professional?</div>
                <div className="text-slate-400 text-xs">Request clinical access with break-glass authorization</div>
              </div>
            </div>
            <ChevronRight className={`w-5 h-5 text-slate-400 transition-transform ${showDoctorInfo ? "rotate-90" : ""}`} />
          </button>

          {showDoctorInfo && (
            <div className="px-5 pb-5 space-y-4 border-t border-white/10 pt-4">
              <div className="p-4 rounded-2xl bg-amber-900/30 border border-amber-700/40 text-xs text-amber-200 font-medium leading-relaxed">
                <strong>Break-glass access</strong> bypasses normal patient consent requirements.
                All emergency access is permanently recorded and the patient will be notified immediately.
              </div>

              <div className="p-4 rounded-2xl bg-white/5 border border-white/10 space-y-2">
                <div className="flex items-center gap-2 text-xs text-slate-400">
                  <Lock className="w-3.5 h-3.5" />
                  <span>Doctor authentication required</span>
                </div>
                <p className="text-slate-300 text-xs leading-relaxed">
                  Log in to MediVault with your verified doctor account to access the clinical break-glass terminal.
                </p>
              </div>

              <a
                href={`/doctor/emergency?token=${encodeURIComponent(credential)}`}
                onClick={() => {
                  try {
                    sessionStorage.setItem("medivault_pending_break_glass_token", credential);
                    localStorage.setItem("medivault_pending_break_glass_token", credential);
                  } catch {}
                }}
                className="flex items-center justify-center gap-2 w-full py-3.5 px-4 rounded-2xl bg-sky-700 hover:bg-sky-600 text-white font-bold text-sm transition-colors min-h-[48px]"
              >
                <Stethoscope className="w-4 h-4" />
                Open Clinical Emergency Terminal
                <ExternalLink className="w-3.5 h-3.5 opacity-70" />
              </a>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="text-center space-y-1 pb-4">
          <p className="text-slate-600 text-xs font-mono">
            MediVault Emergency Access System
          </p>
          <p className="text-slate-700 text-[10px]">
            This credential is secured and cryptographically verified.
            Unauthorized access is logged and audited.
          </p>
        </div>
      </div>
    </div>
  );
}
