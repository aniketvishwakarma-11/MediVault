"use client";

import React, { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import {
  ShieldAlert, QrCode, AlertTriangle, Clock, CheckCircle2,
  PhoneCall, Pill, ArrowRight, ShieldCheck, Activity,
  RefreshCw, Lock, User, Hospital, XCircle, Stethoscope,
  Timer, X, ChevronDown, Shield, Eye, FileText, Download,
  ExternalLink, Calendar,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { emergencyApi, type BreakGlassReasonCode, type BreakGlassResponse, type PublicEmergencyProfile } from "@/lib/emergency-api";
import { DEMO_REPORTS, DEMO_TIMELINE } from "@/lib/demoData";
import DocumentViewerModal from "@/app/components/DocumentViewerModal";

// ─────────────────────────────────────────────────────────────────
// Types & Constants
// ─────────────────────────────────────────────────────────────────

type Step = "input" | "consent" | "granted" | "expired";

const REASON_CODES: { code: BreakGlassReasonCode; label: string }[] = [
  { code: "PATIENT_UNCONSCIOUS", label: "Patient unconscious / unresponsive" },
  { code: "LIFE_THREATENING_EMERGENCY", label: "Life-threatening emergency" },
  { code: "PATIENT_UNABLE_TO_CONSENT", label: "Patient unable to provide consent" },
  { code: "UNKNOWN_MEDICAL_HISTORY", label: "Unknown medical history required" },
  { code: "ALLERGY_VERIFICATION", label: "Allergy verification" },
  { code: "MEDICATION_VERIFICATION", label: "Medication verification" },
  { code: "OTHER", label: "Other emergency reason" },
];

const SCOPE_OPTIONS = [
  { value: "emergency.profile", label: "Emergency Profile", description: "Blood group, allergies, medications", required: true },
  { value: "clinical.summary", label: "Clinical Summary", description: "Conditions, diagnoses" },
  { value: "medications.read", label: "Medications", description: "Prescription history" },
  { value: "labs.read", label: "Lab Results", description: "Recent lab test results" },
  { value: "documents.read", label: "Medical Documents", description: "Uploaded documents" },
  { value: "timeline.read", label: "Clinical Timeline", description: "Full medical history" },
];

const DURATION_OPTIONS = [
  { value: 0.25 as const, label: "15 minutes", sublabel: "Quick verification" },
  { value: 1 as const, label: "1 hour", sublabel: "Standard emergency" },
  { value: 4 as const, label: "4 hours", sublabel: "Extended emergency care" },
];

// ─────────────────────────────────────────────────────────────────
// Session Countdown Timer
// ─────────────────────────────────────────────────────────────────

function SessionTimer({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState("");
  const [pct, setPct] = useState(100);
  const [critical, setCritical] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const expiry = new Date(expiresAt).getTime();
    const total = expiry - Date.now();

    const tick = () => {
      const now = Date.now();
      const diff = expiry - now;
      if (diff <= 0) {
        setRemaining("00:00");
        setPct(0);
        clearInterval(intervalRef.current!);
        onExpire();
        return;
      }
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setRemaining(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
      setPct(Math.max(0, (diff / total) * 100));
      setCritical(diff < 5 * 60 * 1000); // < 5 min
    };

    tick();
    intervalRef.current = setInterval(tick, 1000);
    return () => clearInterval(intervalRef.current!);
  }, [expiresAt, onExpire]);

  return (
    <div className={`p-4 rounded-2xl border ${critical ? "bg-red-50 border-red-200" : "bg-amber-50 border-amber-200"}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 text-xs font-bold text-amber-800">
          <Timer className="w-4 h-4" />
          Emergency Session Expires In
        </div>
        <span className={`text-sm font-black ${critical ? "text-red-700" : "text-amber-800"}`}>{remaining}</span>
      </div>
      <div className="h-1.5 bg-amber-200 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${critical ? "bg-red-500" : "bg-amber-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Emergency Profile Display (doctor-view)
// ─────────────────────────────────────────────────────────────────

function EmergencyProfileView({ profile }: { profile: PublicEmergencyProfile }) {
  const activeContacts = profile.emergencyContacts.filter((c) => c.enabled !== false);
  const primaryPhone = activeContacts[0]?.phone;

  return (
    <div className="space-y-5">
      {/* Patient Identity & Emergency Triage Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-gradient-to-r from-slate-50 via-rose-50/30 to-slate-50 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-500 text-white font-black text-2xl flex items-center justify-center border-2 border-rose-300 shadow-sm shrink-0">
            {profile.patientDisplayName.charAt(0)}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-[#0F172A]">{profile.patientDisplayName}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-extrabold border border-emerald-300 flex items-center gap-1">
                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified Record
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Last Medical Profile Sync: {new Date(profile.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
            </p>
          </div>
        </div>

        {/* Blood Group Highlight */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="text-right">
            <span className="text-[10px] font-black text-rose-700 uppercase tracking-widest block">Blood Group</span>
            <span className="text-xs text-slate-500 font-semibold">Triage Critical</span>
          </div>
          <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-br from-red-600 to-rose-700 text-white font-black text-2xl border-2 border-red-400 shadow-md">
            {profile.bloodGroup || 'N/A'}
          </div>
        </div>
      </div>

      {/* Main Clinical Triage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Critical Allergies Card */}
        <div className="p-4 rounded-2xl bg-red-50/70 border border-red-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-red-800 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <AlertTriangle className="w-4 h-4 text-red-600" />
              Critical Allergies
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-red-100 text-red-800 border border-red-200">
              {profile.allergies.length} Recorded
            </span>
          </div>

          {profile.allergies.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {profile.allergies.map((a, i) => (
                <span key={i} className="px-3 py-1 rounded-xl bg-red-600 text-white font-bold text-xs shadow-xs flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-red-200" />
                  {a}
                </span>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>NKDA — No Known Drug Allergies Reported</span>
            </div>
          )}
        </div>

        {/* Chronic Conditions Card */}
        <div className="p-4 rounded-2xl bg-violet-50/70 border border-violet-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-violet-800 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <Activity className="w-4 h-4 text-violet-600" />
              Chronic Conditions & Diagnoses
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-violet-100 text-violet-800 border border-violet-200">
              {profile.chronicConditions.length} Active
            </span>
          </div>

          {profile.chronicConditions.length > 0 ? (
            <div className="space-y-1.5">
              {profile.chronicConditions.map((c, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-violet-100 text-xs font-bold text-[#0F172A]">
                  <span className="w-2 h-2 rounded-full bg-violet-600 shrink-0" />
                  {c}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/80 border border-violet-100 text-slate-500 text-xs font-semibold">
              No Chronic Conditions Recorded
            </div>
          )}
        </div>

        {/* Current Active Medications Card */}
        <div className="p-4 rounded-2xl bg-sky-50/70 border border-sky-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-sky-800 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <Pill className="w-4 h-4 text-sky-600" />
              Current Medications
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-sky-100 text-sky-800 border border-sky-200">
              {profile.currentMedications.length} Prescribed
            </span>
          </div>

          {profile.currentMedications.length > 0 ? (
            <div className="space-y-1.5">
              {profile.currentMedications.map((m, i) => (
                <div key={i} className="flex items-center gap-2 p-2 rounded-xl bg-white border border-sky-100 text-xs font-bold text-[#0F172A]">
                  <span className="w-2 h-2 rounded-full bg-sky-500 shrink-0" />
                  {m}
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/80 border border-sky-100 text-slate-500 text-xs font-semibold">
              No Active Prescriptions Recorded
            </div>
          )}
        </div>

        {/* Emergency Contacts Card */}
        <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 space-y-2.5">
          <div className="flex items-center justify-between">
            <div className="text-xs font-black text-emerald-800 uppercase tracking-wider flex items-center gap-1.5 font-heading">
              <PhoneCall className="w-4 h-4 text-emerald-600" />
              Emergency Contacts & Next-of-Kin
            </div>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200">
              {activeContacts.length} Available
            </span>
          </div>

          {activeContacts.length > 0 ? (
            <div className="space-y-2">
              {activeContacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-emerald-100">
                  <div>
                    <div className="text-xs font-bold text-[#0F172A]">{c.name}</div>
                    <div className="text-[10px] text-slate-500 font-medium">{c.relationship || 'Primary Contact'}</div>
                  </div>
                  <a
                    href={`tel:${c.phone}`}
                    className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-mono font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs"
                  >
                    <PhoneCall className="w-3 h-3" />
                    {c.phone}
                  </a>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-3 rounded-xl bg-white/80 border border-emerald-100 text-slate-500 text-xs font-semibold">
              No Emergency Contacts Provided
            </div>
          )}
        </div>
      </div>

      {/* Patient Emergency Notes & Directives Callout */}
      {profile.emergencyNotes && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-xs text-amber-900 space-y-1 shadow-xs">
          <div className="font-black text-amber-800 flex items-center gap-1.5 uppercase tracking-wider text-[11px] font-heading">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            Patient Emergency Directive / Special Note
          </div>
          <p className="leading-relaxed font-medium text-amber-950 text-sm">
            {profile.emergencyNotes}
          </p>
        </div>
      )}

      {/* Emergency Physician Action Bar */}
      <div className="p-4 rounded-2xl bg-slate-900 text-white flex flex-col sm:flex-row items-center justify-between gap-3 shadow-md">
        <div className="flex items-center gap-2.5 text-xs font-medium">
          <ShieldAlert className="w-5 h-5 text-rose-400 shrink-0" />
          <span>Need to issue emergency medication or consult AI diagnostics for this patient?</span>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          {primaryPhone && (
            <a
              href={`tel:${primaryPhone}`}
              className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[36px]"
            >
              <PhoneCall className="w-3.5 h-3.5" />
              Call Next-of-Kin
            </a>
          )}
          <a
            href="/doctor/prescriptions"
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[36px]"
          >
            <Pill className="w-3.5 h-3.5" />
            Quick Rx
          </a>
          <a
            href="/doctor/copilot"
            className="flex-1 sm:flex-initial px-3.5 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 min-h-[36px]"
          >
            <Activity className="w-3.5 h-3.5" />
            AI Copilot
          </a>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Emergency Scope Viewer (Tabbed Scope Content Render)
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
  const [activeTab, setActiveTab] = useState<"profile" | "documents" | "timeline" | "labs">("profile");
  const [selectedDoc, setSelectedDoc] = useState<any | null>(null);
  const [docs, setDocs] = useState<any[]>(initialDocs || []);
  const [timelineEvents, setTimelineEvents] = useState<any[]>(initialTimeline || []);
  const [labs, setLabs] = useState<any[]>(initialLabs || []);

  const scopeList = Array.isArray(scope)
    ? scope
    : typeof scope === 'string'
    ? (() => { try { return JSON.parse(scope); } catch { return [scope]; } })()
    : [];

  useEffect(() => {
    if (initialDocs && initialDocs.length > 0) setDocs(initialDocs);
    if (initialTimeline && initialTimeline.length > 0) setTimelineEvents(initialTimeline);
    if (initialLabs && initialLabs.length > 0) setLabs(initialLabs);
  }, [initialDocs, initialTimeline, initialLabs]);

  useEffect(() => {
    if (patientId) {
      const fetchRealDocs = async () => {
        try {
          const { supabase } = await import("@/lib/supabase");
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.access_token) {
            const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";
            const res = await fetch(`${API_BASE}/api/documents/patient/${patientId}`, {
              headers: {
                Authorization: `Bearer ${session.access_token}`,
                "x-user-role": "doctor",
              },
            });
            if (res.ok) {
              const json = await res.json();
              if (json.data && Array.isArray(json.data) && json.data.length > 0) {
                setDocs(json.data);
              }
            }
          }
        } catch (e) {}
      };
      fetchRealDocs();
    }
  }, [patientId]);

  return (
    <div className="space-y-5">
      {/* Scope Navigation Tabs Header */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-3 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("profile")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "profile"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <ShieldAlert className="w-3.5 h-3.5" />
          Emergency Triage Card
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("documents")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "documents"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Medical Documents ({docs.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("timeline")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "timeline"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Activity className="w-3.5 h-3.5" />
          Clinical Timeline ({timelineEvents.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("labs")}
          className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "labs"
              ? "bg-rose-600 text-white shadow-xs"
              : "bg-slate-100 text-slate-700 hover:bg-slate-200"
          }`}
        >
          <Pill className="w-3.5 h-3.5" />
          Lab Biomarkers ({labs.length})
        </button>
      </div>

      {/* Tab 1: Profile View */}
      {activeTab === "profile" && <EmergencyProfileView profile={profile} />}

      {/* Tab 2: Medical Documents View */}
      {activeTab === "documents" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-3.5 rounded-2xl bg-cyan-50 border border-cyan-200 text-xs text-cyan-900 flex items-center gap-2 font-semibold shadow-xs">
            <ShieldCheck className="w-4 h-4 text-cyan-600 shrink-0" />
            <span>Emergency Access Granted for Patient Medical Documents & Diagnostic Reports.</span>
          </div>

          {docs.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {docs.map((doc) => (
                <div key={doc.id} className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-[#0F172A] line-clamp-1">{doc.document_name}</h4>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">{doc.original_filename || doc.document_name}</p>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-extrabold text-[10px] uppercase">
                      {doc.document_category || "Medical Record"}
                    </span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11px] text-slate-600 grid grid-cols-2 gap-2">
                    <div>
                      <span className="text-slate-400 font-medium">Facility: </span>
                      <span className="font-bold text-[#0F172A]">{doc.hospital_name || "General Health Center"}</span>
                    </div>
                    <div>
                      <span className="text-slate-400 font-medium">Date: </span>
                      <span className="font-bold text-[#0F172A]">{doc.visit_date || doc.created_at?.split("T")[0] || "Recorded"}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[10px] text-emerald-700 font-mono font-bold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      SHA-256 Notarized
                    </span>

                    <button
                      type="button"
                      onClick={() => setSelectedDoc(doc)}
                      className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors flex items-center gap-1.5 shadow-xs cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Report & AI Analysis
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#0F172A]">No Medical Reports Uploaded Yet for {profile.patientDisplayName}</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No medical documents or PDF lab reports have been stored in the vault for this patient.
              </p>
            </div>
          )}

          {selectedDoc && (
            <DocumentViewerModal
              isOpen={Boolean(selectedDoc)}
              onClose={() => setSelectedDoc(null)}
              documentId={selectedDoc.id}
              documentName={selectedDoc.document_name}
              originalFilename={selectedDoc.original_filename}
              documentCategory={selectedDoc.document_category}
              mimeType={selectedDoc.mime_type}
              signedUrl={selectedDoc.signedDownloadUrl}
              fileSize={selectedDoc.file_size}
              visitDate={selectedDoc.visit_date}
              doctorName={selectedDoc.doctor_name}
              hospitalName={selectedDoc.hospital_name}
              checksumSha256={selectedDoc.checksum_sha256}
            />
          )}
        </div>
      )}

      {/* Tab 3: Timeline View */}
      {activeTab === "timeline" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-3.5 rounded-2xl bg-violet-50 border border-violet-200 text-xs text-violet-900 flex items-center gap-2 font-semibold shadow-xs">
            <Activity className="w-4 h-4 text-violet-600 shrink-0" />
            <span>Longitudinal Clinical Timeline — Medical Visits, Procedures & Diagnoses</span>
          </div>

          {timelineEvents.length > 0 ? (
            <div className="space-y-3 relative before:absolute before:inset-0 before:left-4 before:w-0.5 before:bg-slate-200">
              {timelineEvents.map((evt, idx) => (
                <div key={evt.id || idx} className="relative pl-9 space-y-1">
                  <div className="absolute left-2 top-1.5 w-4 h-4 rounded-full bg-rose-600 border-2 border-white shadow-xs" />
                  <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-black text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200 font-mono">
                        {evt.date || "Date Unspecified"}
                      </span>
                      {evt.facility && <span className="text-[10px] font-bold text-slate-500">{evt.facility}</span>}
                    </div>
                    <h4 className="text-xs font-bold text-[#0F172A]">{evt.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{evt.description}</p>
                    {evt.doctor && (
                      <div className="text-[10px] text-slate-400 font-semibold pt-1 border-t border-slate-100">
                        Physician: {evt.doctor}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <Activity className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#0F172A]">No Clinical Timeline Events Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No past longitudinal clinical episodes recorded in MediVault for {profile.patientDisplayName}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Labs View */}
      {activeTab === "labs" && (
        <div className="space-y-4 animate-in fade-in duration-300">
          <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 text-xs text-sky-900 flex items-center gap-2 font-semibold shadow-xs">
            <Pill className="w-4 h-4 text-sky-600 shrink-0" />
            <span>Emergency Lab Biomarker Screening Results</span>
          </div>

          {labs.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {labs.map((lab, i) => (
                <div key={i} className="p-3.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs space-y-1.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">{lab.name}</div>
                  <div className="text-base font-black text-[#0F172A]">{lab.val}</div>
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-slate-400">Ref: {lab.ref || "Normal Range"}</span>
                    <span
                      className={`font-bold px-1.5 py-0.5 rounded ${
                        lab.status === "NORMAL"
                          ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                          : lab.status === "CRITICAL"
                          ? "bg-red-100 text-red-800 border border-red-300"
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
            <div className="p-8 rounded-2xl bg-slate-50 border border-slate-200 text-center space-y-3">
              <Pill className="w-8 h-8 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-[#0F172A]">No Lab Biomarkers Recorded Yet</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No lab biomarker panel records stored in database for {profile.patientDisplayName}.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

function DoctorEmergencyTerminalContent() {
  const { user, userProfile } = useAuth();
  const searchParams = useSearchParams();
  const [step, setStep] = useState<Step>("input");

  // Input state
  const [credentialToken, setCredentialToken] = useState("");
  const [reasonCode, setReasonCode] = useState<BreakGlassReasonCode>("PATIENT_UNCONSCIOUS");
  const [reasonText, setReasonText] = useState("");
  const [selectedScope, setSelectedScope] = useState<string[]>(["emergency.profile", "clinical.summary", "medications.read"]);
  const [durationHours, setDurationHours] = useState<0.25 | 1 | 4>(4);

  useEffect(() => {
    const tokenQuery = searchParams?.get("token");
    if (tokenQuery) {
      let val = tokenQuery.trim();
      if (val.includes('/e/')) {
        const parts = val.split('/e/');
        val = parts[parts.length - 1].split('?')[0].split('#')[0];
      }
      setCredentialToken(val);
    }
  }, [searchParams]);

  // Result state
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [response, setResponse] = useState<BreakGlassResponse | null>(null);
  const [sessionExpired, setSessionExpired] = useState(false);

  const toggleScope = (scope: string) => {
    if (scope === "emergency.profile") return; // Always required
    setSelectedScope((prev) =>
      prev.includes(scope) ? prev.filter((s) => s !== scope) : [...prev, scope]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!credentialToken.trim()) {
      setError("Emergency credential token is required. Scan the patient's QR or enter the token manually.");
      return;
    }
    if (reasonText.trim().length < 10) {
      setError("Emergency justification must be at least 10 characters.");
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
      setError(err.message || "Emergency access request failed. Please verify the credential and try again.");
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
    setSelectedScope(["emergency.profile", "clinical.summary", "medications.read"]);
    setDurationHours(4);
    setResponse(null);
    setError("");
    setSessionExpired(false);
  };

  const handleSessionExpire = () => {
    setSessionExpired(true);
    setStep("expired");
  };

  return (
    <div className="space-y-6 font-body pb-12 animate-in fade-in duration-500">
      {/* Header Banner */}
      <div className="p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-rose-600 via-rose-700 to-rose-800 text-white shadow-xl shadow-rose-900/10 relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-56 h-56 rounded-full bg-white/5 pointer-events-none" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/15 backdrop-blur-md text-white text-xs font-bold uppercase tracking-wider border border-white/20">
              <ShieldAlert className="w-3.5 h-3.5" />
              Emergency Clinical Override
            </div>
            <h1 className="font-heading font-extrabold text-2xl sm:text-3xl tracking-tight">
              Break-Glass Emergency Terminal
            </h1>
            <p className="text-rose-100 text-xs sm:text-sm leading-relaxed">
              Emergency access bypasses normal consent requirements.
              Every access event is permanently recorded, audited, and the patient is notified immediately.
            </p>
          </div>

          {step === "granted" && response && (
            <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-white/15 border border-white/20 text-white text-xs font-bold">
              <ShieldCheck className="w-4 h-4 text-emerald-300" />
              {response.doctor.name}
              <span className="opacity-70">•</span>
              {response.doctor.verificationStatus}
            </div>
          )}
        </div>
      </div>

      {/* ═══════ STEP: INPUT ═══════ */}
      {step === "input" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* QR Scanner Placeholder */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6 flex flex-col items-center justify-center text-center">
            <div className="w-48 h-48 rounded-2xl bg-rose-50/50 border-2 border-dashed border-rose-300 flex flex-col items-center justify-center relative group p-4">
              <QrCode className="w-24 h-24 text-rose-400" />
              <span className="text-[10px] font-mono text-rose-700 font-bold mt-2 bg-rose-100 px-2 py-0.5 rounded-md border border-rose-200 uppercase">
                Scan QR Code
              </span>
            </div>
            <div className="space-y-1">
              <h3 className="font-heading font-bold text-base text-[#0F172A]">Scan Patient Emergency QR</h3>
              <p className="text-xs text-[#475569]">
                Position patient&apos;s MediVault Emergency Pass QR badge in front of camera, or enter the token manually below.
              </p>
            </div>
          </div>

          {/* Manual Form */}
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-5">
            <div className="space-y-1 border-b border-slate-100 pb-4">
              <h3 className="font-heading font-bold text-base text-[#0F172A] flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-600" />
                Emergency Access Request
              </h3>
              <p className="text-xs text-[#475569]">Enter the emergency credential token from the patient&apos;s QR code</p>
            </div>

            {error && (
              <div className="p-3.5 rounded-xl bg-red-50 border border-red-200 text-xs text-red-800 font-medium flex items-start gap-2">
                <XCircle className="w-4 h-4 text-red-500 shrink-0 mt-0.5" />
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Token input */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Emergency Credential Token
                </label>
                <input
                  type="text"
                  value={credentialToken}
                  onChange={(e) => {
                    let val = e.target.value.trim();
                    if (val.includes('/e/')) {
                      const parts = val.split('/e/');
                      val = parts[parts.length - 1].split('?')[0].split('#')[0];
                    }
                    setCredentialToken(val);
                  }}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] font-mono text-sm focus:border-rose-500 focus:bg-white focus:outline-none min-h-[42px] transition-colors"
                  placeholder="Paste token or full QR URL (e.g. http://localhost:3000/e/<token>)..."
                  required
                />
                <p className="text-[10px] text-slate-400 mt-1">Paste the full QR URL (http://localhost:3000/e/&lt;token&gt;) or just the raw token.</p>
              </div>

              {/* Reason code */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Emergency Reason</label>
                <div className="relative">
                  <select
                    value={reasonCode}
                    onChange={(e) => setReasonCode(e.target.value as BreakGlassReasonCode)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-rose-500 focus:bg-white focus:outline-none min-h-[42px] appearance-none cursor-pointer"
                  >
                    {REASON_CODES.map((r) => (
                      <option key={r.code} value={r.code}>{r.label}</option>
                    ))}
                  </select>
                  <ChevronDown className="w-4 h-4 absolute right-3 top-3 text-slate-400 pointer-events-none" />
                </div>
              </div>

              {/* Justification */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">
                  Clinical Justification <span className="text-rose-600">*</span>
                </label>
                <textarea
                  rows={3}
                  value={reasonText}
                  onChange={(e) => setReasonText(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:border-rose-500 focus:bg-white focus:outline-none resize-none"
                  placeholder="Describe the clinical emergency requiring immediate access to patient records..."
                  required
                  minLength={10}
                />
              </div>

              {/* Scope selection */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Access Scope</label>
                <div className="space-y-1.5">
                  {SCOPE_OPTIONS.map((opt) => (
                    <label
                      key={opt.value}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border cursor-pointer transition-colors ${
                        selectedScope.includes(opt.value)
                          ? "bg-rose-50 border-rose-200 text-rose-900"
                          : "bg-slate-50 border-slate-200 text-slate-700"
                      } ${opt.required ? "cursor-not-allowed opacity-80" : ""}`}
                    >
                      <input
                        type="checkbox"
                        checked={selectedScope.includes(opt.value)}
                        onChange={() => toggleScope(opt.value)}
                        disabled={opt.required}
                        className="w-3.5 h-3.5 accent-rose-600"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold flex items-center gap-1.5">
                          {opt.label}
                          {opt.required && <span className="text-[10px] text-rose-600 font-semibold">(Required)</span>}
                        </div>
                        <div className="text-[10px] opacity-60">{opt.description}</div>
                      </div>
                    </label>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <label className="block text-xs font-bold text-[#0F172A] mb-1.5">Access Duration</label>
                <div className="grid grid-cols-3 gap-2">
                  {DURATION_OPTIONS.map((d) => (
                    <button
                      key={d.value}
                      type="button"
                      onClick={() => setDurationHours(d.value)}
                      className={`p-2.5 rounded-xl border text-center transition-colors ${
                        durationHours === d.value
                          ? "bg-rose-600 border-rose-600 text-white"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:border-rose-300"
                      }`}
                    >
                      <div className="text-xs font-black">{d.label}</div>
                      <div className={`text-[10px] mt-0.5 ${durationHours === d.value ? "text-rose-100" : "text-slate-400"}`}>{d.sublabel}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Doctor identity preview */}
              {userProfile && (
                <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-600 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#0891B2]/10 text-[#0891B2] font-black text-sm flex items-center justify-center shrink-0">
                    {userProfile.displayName?.charAt(0) || "D"}
                  </div>
                  <div>
                    <div className="font-bold text-[#0F172A]">{userProfile.displayName}</div>
                    <div className="text-[10px] text-slate-400">Accessing as verified doctor</div>
                  </div>
                  <ShieldCheck className="w-4 h-4 text-emerald-500 ml-auto shrink-0" />
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3.5 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs shadow-xs transition-all flex items-center justify-center gap-2 min-h-[48px]"
              >
                Continue to Break-Glass Authorization
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ═══════ STEP: CONSENT ═══════ */}
      {step === "consent" && (
        <div className="max-w-2xl mx-auto">
          <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-xs space-y-6">
            <div className="text-center space-y-2">
              <div className="w-16 h-16 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto">
                <Lock className="w-8 h-8 text-amber-600" />
              </div>
              <h2 className="font-heading font-black text-xl text-[#0F172A]">Break-Glass Authorization</h2>
            </div>

            <div className="p-5 rounded-2xl bg-amber-50 border border-amber-200 space-y-3 text-sm text-amber-900">
              <div className="font-black text-base text-amber-800 flex items-center gap-2">
                <AlertTriangle className="w-5 h-5" />
                Consent Override Notice
              </div>
              <p className="leading-relaxed">
                Emergency access <strong>bypasses normal patient consent requirements</strong>.
                This action will be <strong>permanently recorded</strong> in the audit log and the patient will be
                notified immediately via the MediVault notification system.
              </p>
              <p>
                By proceeding, you confirm that this is a genuine emergency and that you are a verified healthcare professional.
              </p>
            </div>

            {/* Summary of request */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3 text-xs">
              <div className="font-bold text-[#0F172A] text-sm border-b border-slate-200 pb-2">Access Request Summary</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-slate-400 uppercase tracking-wider font-bold mb-0.5">Reason</div>
                  <div className="font-semibold text-[#0F172A]">{REASON_CODES.find((r) => r.code === reasonCode)?.label}</div>
                </div>
                <div>
                  <div className="text-slate-400 uppercase tracking-wider font-bold mb-0.5">Duration</div>
                  <div className="font-semibold text-[#0F172A]">{DURATION_OPTIONS.find((d) => d.value === durationHours)?.label}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-400 uppercase tracking-wider font-bold mb-0.5">Justification</div>
                  <div className="font-semibold text-[#0F172A]">{reasonText}</div>
                </div>
                <div className="col-span-2">
                  <div className="text-slate-400 uppercase tracking-wider font-bold mb-0.5">Access Scope</div>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedScope.map((s) => (
                      <span key={s} className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 font-semibold text-[10px] border border-rose-200">{s}</span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => setStep("input")}
                className="flex-1 py-3 px-4 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors min-h-[44px]"
              >
                Back
              </button>
              <button
                onClick={handleConfirmAccess}
                disabled={loading}
                className="flex-1 py-3 px-4 rounded-2xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 min-h-[44px] shadow-md shadow-rose-600/20 disabled:opacity-60"
              >
                {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Shield className="w-4 h-4" />}
                {loading ? "Verifying & Granting Access..." : "Confirm Emergency Access"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ═══════ STEP: GRANTED ═══════ */}
      {step === "granted" && response && (
        <div className="space-y-5">
          {/* Access granted banner */}
          <div className="p-4 rounded-2xl bg-[#ECFDF5] border border-[#A7F3D0] text-[#065F46] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs font-bold">
              <CheckCircle2 className="w-5 h-5 text-[#22C55E]" />
              <span>
                <strong>EMERGENCY ACCESS GRANTED</strong> — Audited, time-limited clinical session active
              </span>
            </div>
            <button
              onClick={handleReset}
              className="text-[10px] font-bold px-3 py-1.5 rounded-xl bg-white border border-emerald-200 text-emerald-700 hover:bg-emerald-50 transition-colors flex items-center gap-1 min-h-[32px]"
            >
              <X className="w-3 h-3" />
              Close Session
            </button>
          </div>

          {/* Doctor info bar */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 flex flex-wrap items-center gap-4 text-xs">
            <div className="flex items-center gap-2">
              <div className="p-2 rounded-xl bg-[#0891B2]/10 text-[#0891B2]">
                <Stethoscope className="w-4 h-4" />
              </div>
              <div>
                <div className="font-bold text-[#0F172A]">{response.doctor.name}</div>
                <div className="text-slate-500">{response.doctor.specialization} • {response.doctor.hospital}</div>
              </div>
            </div>
            {response.doctor.verificationStatus === "VERIFIED" && (
              <span className="flex items-center gap-1 px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 font-bold text-[10px] border border-emerald-200 ml-auto">
                <ShieldCheck className="w-3 h-3" />
                Verified
              </span>
            )}
          </div>

          {/* Session timer */}
          <SessionTimer expiresAt={response.session.expiresAt} onExpire={handleSessionExpire} />

          {/* Profile */}
          <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs p-6">
            <h3 className="font-heading font-bold text-base text-[#0F172A] mb-5 flex items-center gap-2">
              <Eye className="w-4 h-4 text-rose-500" />
              Emergency Medical Profile
              <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold border border-rose-200">
                Scope: {response.session.scope.length} areas
              </span>
            </h3>
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

      {/* ═══════ STEP: EXPIRED ═══════ */}
      {step === "expired" && (
        <div className="max-w-md mx-auto py-12 text-center space-y-5">
          <div className="w-20 h-20 rounded-full bg-amber-100 border-2 border-amber-300 flex items-center justify-center mx-auto">
            <Clock className="w-10 h-10 text-amber-600" />
          </div>
          <div>
            <h2 className="text-xl font-black text-[#0F172A]">Emergency Session Expired</h2>
            <p className="text-sm text-slate-500 mt-2">
              The temporary emergency access session has expired. Clinical data is no longer accessible.
            </p>
          </div>
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-sm shadow-md transition-all mx-auto min-h-[48px]"
          >
            <RefreshCw className="w-4 h-4" />
            Start New Emergency Access
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
        <div className="py-16 flex items-center justify-center">
          <RefreshCw className="w-6 h-6 animate-spin text-[#0891B2]" />
        </div>
      }
    >
      <DoctorEmergencyTerminalContent />
    </Suspense>
  );
}
