"use client";

import React, { useState, useEffect, useCallback } from "react";
import { QRCodeSVG } from "qrcode.react";
import {
  ShieldAlert, QrCode, RefreshCw, ShieldOff, Printer,
  Share2, History, Settings, Phone, Edit3, Plus, Trash2,
  CheckCircle2, XCircle, Clock, AlertTriangle, Eye, EyeOff,
  ChevronRight, Download, Lock, Globe, ShieldCheck, Activity,
  Droplets, Pill, Heart, User, WifiOff,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/lib/supabase";
import { useToast } from "@/context/ToastContext";
import EmergencyCardPass from "@/app/components/EmergencyCardPass";
import { OfflineEmergencyVault } from "@/lib/offline-emergency-vault";
import { normalizeEmergencyQrUrl, cleanLocalStorageQrUrls } from "@/lib/qr-url-helper";
import {
  emergencyApi,
  type EmergencyCredential,
  type EmergencyProfileSettings,
  type EmergencyAccessHistoryItem,
  type EmergencyContactItem,
} from "@/lib/emergency-api";
import { GovernmentAPI } from "@/lib/government-api";
import { AbhaProfileData } from "@/types/government";

// ─────────────────────────────────────────────────────────────────
// Types & Helpers
// ─────────────────────────────────────────────────────────────────

type Tab = "qr" | "profile" | "history" | "contacts";

function StatusBadge({ status }: { status: string }) {
  const config = {
    ACTIVE: { cls: "bg-emerald-100 text-emerald-800 border-emerald-200", icon: CheckCircle2, label: "Active" },
    REVOKED: { cls: "bg-red-100 text-red-800 border-red-200", icon: XCircle, label: "Revoked" },
    EXPIRED: { cls: "bg-amber-100 text-amber-800 border-amber-200", icon: Clock, label: "Expired" },
    SUSPENDED: { cls: "bg-slate-100 text-slate-700 border-slate-200", icon: AlertTriangle, label: "Suspended" },
  }[status] || { cls: "bg-slate-100 text-slate-700 border-slate-200", icon: AlertTriangle, label: status };

  const Icon = config.icon;
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border ${config.cls}`}>
      <Icon className="w-3 h-3" />
      {config.label}
    </span>
  );
}

function ActionCard({ icon: Icon, label, sublabel, onClick, variant = "default", disabled = false }: {
  icon: React.ElementType; label: string; sublabel: string;
  onClick: () => void; variant?: "default" | "danger" | "primary"; disabled?: boolean;
}) {
  const colors = {
    default: "bg-white hover:bg-slate-50 border-slate-200 text-slate-900",
    primary: "bg-[#0891B2] hover:bg-[#0e7490] border-[#0891B2] text-white",
    danger: "bg-white hover:bg-red-50 border-slate-200 hover:border-red-200 text-slate-900 hover:text-red-700",
  }[variant];
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`flex items-center gap-3.5 w-full p-4 rounded-2xl border transition-all text-left disabled:opacity-50 disabled:cursor-not-allowed ${colors}`}
    >
      <div className={`p-2.5 rounded-xl ${variant === "primary" ? "bg-white/20" : "bg-slate-100"}`}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-xs font-bold">{label}</div>
        <div className={`text-[11px] mt-0.5 ${variant === "primary" ? "text-white/70" : "text-slate-500"}`}>{sublabel}</div>
      </div>
      <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />
    </button>
  );
}

function ToggleRow({ label, description, value, onChange }: {
  label: string; description: string; value: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex items-center justify-between py-4 border-b border-slate-100 last:border-0">
      <div className="flex-1 min-w-0 pr-4">
        <div className="text-xs font-bold text-[#0F172A]">{label}</div>
        <div className="text-[11px] text-slate-500 mt-0.5">{description}</div>
      </div>
      <button
        type="button"
        onClick={() => onChange(!value)}
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] focus-visible:ring-offset-2 ${
          value ? "bg-[#0891B2]" : "bg-slate-300"
        }`}
        role="switch"
        aria-checked={value}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            value ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </button>
    </div>
  );
}

function AccessHistoryCard({ item }: { item: EmergencyAccessHistoryItem }) {
  const actionLabel: Record<string, string> = {
    EMERGENCY_PROFILE_VIEWED: "Viewed Emergency Profile",
    ACCESS_GRANTED: "Clinical Access Granted",
    BREAK_GLASS_INITIATED: "Break-Glass Initiated",
    DOCUMENT_VIEWED: "Document Accessed",
    TIMELINE_VIEWED: "Timeline Accessed",
    SESSION_REVOKED: "Session Revoked",
    SESSION_EXPIRED: "Session Expired",
  };

  const isDoctor = item.actorType === "DOCTOR";

  return (
    <div className="p-5 rounded-2xl bg-white border border-slate-200/80 space-y-3 shadow-xs">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`p-2.5 rounded-xl ${isDoctor ? "bg-rose-50 text-rose-600" : "bg-slate-100 text-slate-500"}`}>
            {isDoctor ? <Stethoscope className="w-4 h-4" /> : <Globe className="w-4 h-4" />}
          </div>
          <div>
            <div className="text-xs font-bold text-[#0F172A]">
              {item.actorName || (isDoctor ? "Healthcare Professional" : "Public Scan")}
            </div>
            {item.actorSpecialization && (
              <div className="text-[11px] text-slate-500">
                {item.actorSpecialization} • {item.actorHospital || "Unknown Hospital"}
              </div>
            )}
          </div>
        </div>
        {item.actorVerificationStatus === "VERIFIED" && (
          <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[10px] font-bold border border-emerald-200 shrink-0">
            <ShieldCheck className="w-3 h-3" />
            Verified
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 text-[11px]">
        <div>
          <div className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Action</div>
          <div className="text-[#0F172A] font-semibold">{actionLabel[item.action] || item.action}</div>
        </div>
        <div>
          <div className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Time</div>
          <div className="text-[#0F172A] font-semibold">
            {new Date(item.createdAt).toLocaleDateString("en-IN", {
              day: "2-digit", month: "short", year: "numeric",
              hour: "2-digit", minute: "2-digit", hour12: true,
            })}
          </div>
        </div>
        {item.reasonText && (
          <div className="col-span-2">
            <div className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Reason</div>
            <div className="text-[#0F172A] font-semibold">{item.reasonText}</div>
          </div>
        )}
        {item.sessionExpiresAt && (
          <div>
            <div className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Expired</div>
            <div className="text-[#0F172A] font-semibold">
              {new Date(item.sessionExpiresAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", hour12: true })}
            </div>
          </div>
        )}
        {item.blockchainTxHash && (
          <div className="col-span-2">
            <div className="text-slate-400 font-semibold uppercase tracking-wider mb-0.5">Blockchain Proof</div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <span className="text-emerald-700 font-bold text-[10px]">Verified</span>
              <span className="text-slate-400 font-mono text-[10px]">
                {item.blockchainTxHash.substring(0, 18)}...
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Lazy import for Stethoscope icon used in history card
function Stethoscope({ className }: { className?: string }) {
  return (
    <svg className={className} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 2.25a.75.75 0 0 1 .75.75v2.25a2.25 2.25 0 0 0 2.25 2.25H9a2.25 2.25 0 0 0 2.25-2.25V3A.75.75 0 0 1 12 3v2.25a2.25 2.25 0 0 0 2.25 2.25h.004a2.25 2.25 0 0 0 2.246-2.25V3a.75.75 0 0 1 1.5 0v2.25A3.75 3.75 0 0 1 14.25 9H14v3a6 6 0 1 1-12 0V9h-.25A3.75 3.75 0 0 1 2 5.25V3A.75.75 0 0 1 2.75 2.25h3.5A.75.75 0 0 1 6 2.25Zm0 0" />
    </svg>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Component
// ─────────────────────────────────────────────────────────────────

export default function PatientEmergencyCenter() {
  const { user, userProfile } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning } = useToast();
  const [activeTab, setActiveTab] = useState<Tab>("qr");

  // Real DB patient profile data state
  const [patientDbData, setPatientDbData] = useState<{
    fullName: string;
    bloodGroup: string;
    emergencyContactName: string;
    emergencyContactPhone: string;
    chronicConditions: string[];
  } | null>(null);

  // Credential state
  const [credential, setCredential] = useState<EmergencyCredential | null>(null);
  const [generatedQrUrl, setGeneratedQrUrl] = useState<string | null>(null);
  const [credLoading, setCredLoading] = useState(true);
  const [credAction, setCredAction] = useState<"generate" | "regenerate" | "revoke" | null>(null);
  const [copied, setCopied] = useState(false);
  const [isOfflineLoaded, setIsOfflineLoaded] = useState(false);

  // Profile settings state
  const [profileSettings, setProfileSettings] = useState<EmergencyProfileSettings | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileSaving, setProfileSaving] = useState(false);

  // History state
  const [history, setHistory] = useState<EmergencyAccessHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // New contact form
  const [showAddContact, setShowAddContact] = useState(false);
  const [newContact, setNewContact] = useState<Omit<EmergencyContactItem, "priority">>({
    name: "", relationship: "", phone: "", enabled: true,
  });

  const [abhaProfile, setAbhaProfile] = useState<AbhaProfileData | null>(null);

  useEffect(() => {
    GovernmentAPI.getProfile().then(setAbhaProfile).catch(() => {});
  }, []);

  // ─── Load Real Patient DB Data ───
  const loadPatientDbData = useCallback(async () => {
    if (!user) return;
    try {
      const { data: profileRow } = await supabase
        .from("users_profile")
        .select("*")
        .eq("id", user.id)
        .maybeSingle();

      const { data: patientRow } = await supabase
        .from("patients")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      let chronicList: string[] = [];
      if (patientRow?.chronic_conditions_json && Array.isArray(patientRow.chronic_conditions_json)) {
        chronicList = patientRow.chronic_conditions_json;
      } else if (patientRow?.chronic_conditions) {
        chronicList = patientRow.chronic_conditions.split(",").map((s: string) => s.trim()).filter(Boolean);
      }

      const dataObj = {
        fullName: profileRow?.full_name || "",
        bloodGroup: patientRow?.blood_group || "",
        emergencyContactName: patientRow?.emergency_contact_name || "",
        emergencyContactPhone: patientRow?.emergency_contact_phone || patientRow?.emergency_contact || "",
        chronicConditions: chronicList,
      };

      setPatientDbData(dataObj);
      OfflineEmergencyVault.saveSnapshot({
        patientName: dataObj.fullName,
        bloodGroup: dataObj.bloodGroup,
        uhid: patientRow?.uhid || "",
      });
    } catch (err) {
      console.warn("Failed to load patient DB data, checking offline vault:", err);
      const cached = OfflineEmergencyVault.getSnapshot();
      if (cached) {
        setPatientDbData({
          fullName: cached.patientName,
          bloodGroup: cached.bloodGroup,
          emergencyContactName: "",
          emergencyContactPhone: "",
          chronicConditions: [],
        });
        setIsOfflineLoaded(true);
      }
    }
  }, [user]);

  // ─── Load credential ───
  const loadCredential = useCallback(async () => {
    setCredLoading(true);
    try {
      const cred = await emergencyApi.getCredential();
      setCredential(cred);
      if (cred?.id) {
        const userId = user?.id || 'demo';
        const storedUrl = localStorage.getItem(`medivault_qr_url_${userId}_${cred.id}`) || localStorage.getItem(`medivault_qr_url_${userId}`);
        const rawUrl = cred.rawToken ? `/e/${cred.rawToken}` : (cred.qrUrl || storedUrl || `/e/${cred.id}`);
        const url = normalizeEmergencyQrUrl(rawUrl, cred.rawToken || cred.id);
        setGeneratedQrUrl(url);

        // Sync to offline vault
        OfflineEmergencyVault.saveSnapshot({
          credential: { ...cred, qrUrl: url },
          patientName: userProfile?.displayName || undefined,
        });
        setIsOfflineLoaded(false);
      }
    } catch {
      // Offline fallback
      const cached = OfflineEmergencyVault.getSnapshot();
      if (cached?.credential) {
        setCredential(cached.credential);
        const url = normalizeEmergencyQrUrl(cached.credential.qrUrl, cached.credential.rawToken || cached.credential.id);
        setGeneratedQrUrl(url);
        setIsOfflineLoaded(true);
      } else {
        setCredential(null);
      }
    } finally {
      setCredLoading(false);
    }
  }, [user, userProfile]);

  // ─── Load profile settings ───
  const loadProfileSettings = useCallback(async () => {
    setProfileLoading(true);
    let localSaved: Partial<EmergencyProfileSettings> | null = null;
    try {
      const stored = localStorage.getItem(`medivault_emergency_profile_${user?.id || 'demo'}`);
      if (stored) localSaved = JSON.parse(stored);
    } catch {}

    try {
      const settings = await emergencyApi.getProfileSettings();
      const merged = localSaved ? { ...settings, ...localSaved } : settings;
      setProfileSettings(merged);
      OfflineEmergencyVault.saveSnapshot({ profileSettings: merged });
    } catch {
      const cached = OfflineEmergencyVault.getSnapshot();
      if (cached?.profileSettings) {
        setProfileSettings(cached.profileSettings);
        setIsOfflineLoaded(true);
      } else if (localSaved) {
        setProfileSettings(localSaved as EmergencyProfileSettings);
      }
    } finally {
      setProfileLoading(false);
    }
  }, [user]);

  // ─── Load history ───
  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const h = await emergencyApi.getAccessHistory(20);
      setHistory(h);
    } catch {
      setHistory([]);
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  // Helper to ensure mutations are strictly protected by active authentication and online connection
  const requireAuthAndOnline = (actionName: string): boolean => {
    if (!user) {
      showError("Authentication Required", `You must be signed in to ${actionName}.`);
      return false;
    }
    if (typeof navigator !== "undefined" && !navigator.onLine) {
      showWarning("Offline Mode", `Cannot ${actionName} while offline. Please connect to the internet.`);
      return false;
    }
    return true;
  };

  useEffect(() => {
    // Clean any legacy localhost URLs in localStorage
    cleanLocalStorageQrUrls();

    // 1. Zero-latency offline hydration: immediately load cached offline snapshot in 0ms
    const cached = OfflineEmergencyVault.getSnapshot();
    if (cached) {
      if (cached.credential) {
        setCredential(cached.credential);
        const url = normalizeEmergencyQrUrl(
          cached.credential.qrUrl,
          cached.credential.rawToken || cached.credential.id
        );
        setGeneratedQrUrl(url);
      }
      if (cached.profileSettings) {
        setProfileSettings(cached.profileSettings);
      }
      if (cached.patientName || cached.bloodGroup) {
        setPatientDbData({
          fullName: cached.patientName || "",
          bloodGroup: cached.bloodGroup || "",
          emergencyContactName: "",
          emergencyContactPhone: "",
          chronicConditions: [],
        });
      }
      setIsOfflineLoaded(true);
      setCredLoading(false);
      setProfileLoading(false);
    }

    // 2. Fresh background sync when user is available or online
    if (user || (typeof navigator !== "undefined" && navigator.onLine)) {
      loadCredential();
      loadProfileSettings();
      loadPatientDbData();
    }
  }, [user, loadCredential, loadProfileSettings, loadPatientDbData]);

  useEffect(() => { if (activeTab === "history") loadHistory(); }, [activeTab, loadHistory]);

  // Helper to save QR URL locally
  const saveQrUrlLocally = (credId: string, url: string) => {
    const userId = user?.id || 'demo';
    const cleanUrl = normalizeEmergencyQrUrl(url, credId);
    try {
      localStorage.setItem(`medivault_qr_url_${userId}_${credId}`, cleanUrl);
      localStorage.setItem(`medivault_qr_url_${userId}`, cleanUrl);
    } catch {}
  };

  // Helper to clear QR URL locally
  const clearQrUrlLocally = (credId?: string) => {
    const userId = user?.id || 'demo';
    try {
      if (credId) localStorage.removeItem(`medivault_qr_url_${userId}_${credId}`);
      localStorage.removeItem(`medivault_qr_url_${userId}`);
    } catch {}
  };

  // ─── Generate credential ───
  const handleGenerate = async () => {
    if (!requireAuthAndOnline("generate emergency credentials")) return;
    setCredAction("generate");
    try {
      const generated = await emergencyApi.generateCredential();
      setCredential(generated);
      const url = normalizeEmergencyQrUrl(
        generated.qrUrl || (generated.rawToken ? `/e/${generated.rawToken}` : `/e/${generated.id}`),
        generated.rawToken || generated.id
      );
      setGeneratedQrUrl(url);
      if (url && generated.id) {
        saveQrUrlLocally(generated.id, url);
      }
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setCredAction(null);
    }
  };

  // ─── Regenerate credential ───
  const handleRegenerate = async () => {
    if (!requireAuthAndOnline("regenerate emergency credentials")) return;
    if (!confirm("Regenerating will invalidate your current QR code. All saved copies will stop working. Continue?")) return;
    setCredAction("regenerate");
    try {
      const generated = await emergencyApi.regenerateCredential();
      setCredential(generated);
      const url = normalizeEmergencyQrUrl(
        generated.qrUrl || (generated.rawToken ? `/e/${generated.rawToken}` : `/e/${generated.id}`),
        generated.rawToken || generated.id
      );
      setGeneratedQrUrl(url);
      if (url && generated.id) {
        saveQrUrlLocally(generated.id, url);
      }
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setCredAction(null);
    }
  };

  // ─── Revoke credential ───
  const handleRevoke = async () => {
    if (!requireAuthAndOnline("revoke emergency credentials")) return;
    if (!confirm("Revoking will permanently deactivate your current QR code. Anyone trying to scan it will see an error. Continue?")) return;
    setCredAction("revoke");
    try {
      await emergencyApi.revokeCredential();
      clearQrUrlLocally(credential?.id);
      setCredential(null);
      setGeneratedQrUrl(null);
      await loadCredential();
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setCredAction(null);
    }
  };

  // ─── Copy QR URL ───
  const handleCopy = () => {
    const url = activeQrUrl;
    if (url) {
      navigator.clipboard.writeText(url).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } else if (hasActiveCredential) {
      if (confirm("QR token secret is not stored on this browser. Would you like to regenerate a fresh QR pass now to share?")) {
        handleRegenerate();
      }
    }
  };

  // ─── Print ───
  const handlePrint = () => window.print();

  // ─── Profile toggle ───
  const handleToggle = async (key: keyof EmergencyProfileSettings, value: boolean) => {
    if (!requireAuthAndOnline("update profile visibility settings")) return;
    const current = profileSettings || {
      id: "", patientId: user?.id || "",
      showBloodGroup: true, showAllergies: true, showMedications: true,
      showConditions: true, showSurgeries: true, showEmergencyContacts: true,
      showPrimaryPhysician: false, showFullTimeline: false,
      emergencyNotes: null, customAlerts: [], emergencyContacts: [],
      updatedAt: new Date().toISOString(),
    };
    const updated = { ...current, [key]: value };
    setProfileSettings(updated);
    setProfileSaving(true);

    try {
      localStorage.setItem(`medivault_emergency_profile_${user?.id || 'demo'}`, JSON.stringify(updated));
    } catch {}

    try {
      const serverUpdated = await emergencyApi.updateProfileSettings({ [key]: value });
      if (serverUpdated) {
        setProfileSettings((prev) => prev ? { ...serverUpdated, ...updated } : serverUpdated);
      }
    } catch (err) {
      console.warn("Profile toggle sync note:", err);
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Add emergency contact ───
  const handleAddContact = async () => {
    if (!requireAuthAndOnline("add emergency contacts")) return;
    if (!newContact.name || !newContact.phone) return;
    const contacts = [...(profileSettings?.emergencyContacts || [])];
    const contact: EmergencyContactItem = { ...newContact, priority: contacts.length + 1 };
    contacts.push(contact);
    setProfileSaving(true);
    try {
      const updated = await emergencyApi.updateProfileSettings({ emergencyContacts: contacts });
      setProfileSettings(updated);
      setNewContact({ name: "", relationship: "", phone: "", enabled: true });
      setShowAddContact(false);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setProfileSaving(false);
    }
  };

  // ─── Remove contact ───
  const handleRemoveContact = async (index: number) => {
    if (!requireAuthAndOnline("remove emergency contacts")) return;
    if (!profileSettings) return;
    const contacts = profileSettings.emergencyContacts.filter((_, i) => i !== index);
    setProfileSaving(true);
    try {
      const updated = await emergencyApi.updateProfileSettings({ emergencyContacts: contacts });
      setProfileSettings(updated);
    } catch {
      // ignore
    } finally {
      setProfileSaving(false);
    }
  };

  const displayName = patientDbData?.fullName || userProfile?.displayName || user?.email?.split("@")[0] || "Patient";
  const bloodGroupValue = profileSettings?.showBloodGroup !== false
    ? (patientDbData?.bloodGroup && patientDbData.bloodGroup !== "Not provided" ? patientDbData.bloodGroup : null)
    : undefined;

  let effectiveContacts: EmergencyContactItem[] = profileSettings?.emergencyContacts || [];
  if (effectiveContacts.length === 0 && (patientDbData?.emergencyContactName || patientDbData?.emergencyContactPhone)) {
    effectiveContacts = [{
      name: patientDbData.emergencyContactName || "Emergency Contact",
      relationship: "Contact",
      phone: patientDbData.emergencyContactPhone || "",
      priority: 1,
      enabled: true,
    }];
  }

  const chronicConditionsList = profileSettings?.showConditions !== false
    ? (patientDbData?.chronicConditions || [])
    : [];

  const hasActiveCredential = credential?.status === "ACTIVE";
  const activeQrUrl = normalizeEmergencyQrUrl(
    generatedQrUrl || (credential?.rawToken ? `/e/${credential.rawToken}` : (credential?.id ? `/e/${credential.id}` : null)),
    credential?.rawToken || credential?.id
  );

  const tabs: { id: Tab; icon: React.ElementType; label: string }[] = [
    { id: "qr", icon: QrCode, label: "Emergency QR" },
    { id: "profile", icon: Settings, label: "Profile" },
    { id: "history", icon: History, label: "Access History" },
    { id: "contacts", icon: Phone, label: "Contacts" },
  ];

  return (
    <div className="space-y-6 animate-in fade-in duration-500 font-body">
      {/* Offline Status Alert Banner */}
      {(isOfflineLoaded || OfflineEmergencyVault.isOffline()) && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-100 text-amber-700 shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <strong className="block font-heading font-bold text-amber-900 text-xs">Offline Emergency Pass Active</strong>
              <span className="text-[11px] text-amber-700">Displaying cryptographically verified Emergency Pass cached on your device. First responders can still scan and verify.</span>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-200/70 px-2.5 py-1 rounded-full border border-amber-300 shrink-0">
            ⚡ On-Device Vault
          </span>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
        <div>
          <h1 className="text-2xl font-extrabold text-[#0F172A] tracking-tight flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-rose-100 text-rose-600">
              <ShieldAlert className="w-6 h-6" />
            </div>
            Emergency Center
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Manage your Emergency Medical Pass and access controls
          </p>
        </div>

        <div className="flex items-center gap-2">
          {hasActiveCredential && (
            <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              Emergency Pass Active
            </span>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
        <div className="flex border-b border-slate-100 overflow-x-auto">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-5 py-4 text-xs font-bold whitespace-nowrap transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0891B2] ${
                  isActive
                    ? "text-[#0891B2] border-b-2 border-[#0891B2] bg-cyan-50/50"
                    : "text-slate-500 hover:text-[#0F172A] hover:bg-slate-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="p-6">
          {/* ═══════ TAB: QR CREDENTIAL ═══════ */}
          {activeTab === "qr" && (
            <div className="space-y-6">
              {credLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0891B2]" />
                </div>
              ) : hasActiveCredential || generatedQrUrl ? (
                <div className="space-y-6">
                  {/* Real Product Emergency Card Pass Component */}
                  <EmergencyCardPass
                    patientName={displayName}
                    bloodGroup={bloodGroupValue}
                    chronicConditions={chronicConditionsList}
                    emergencyNotes={profileSettings?.emergencyNotes}
                    emergencyContacts={profileSettings?.showEmergencyContacts !== false ? effectiveContacts : []}
                    credential={credential}
                    qrUrl={activeQrUrl}
                    onPrint={handlePrint}
                    abhaNumber={abhaProfile?.abhaNumber}
                    abhaAddress={abhaProfile?.abhaAddress}
                    isGovVerified={abhaProfile?.isGovVerified}
                  />

                  {/* Actions & Controls */}
                  <div className="pt-4 border-t border-slate-200">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-xs font-bold text-[#0F172A] uppercase tracking-wider">Pass Security Controls</h3>
                      <StatusBadge status={credential?.status || "ACTIVE"} />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <ActionCard
                        icon={Share2}
                        label={copied ? "Link Copied!" : "Share Pass URL"}
                        sublabel="Copy QR pass link to clipboard"
                        onClick={handleCopy}
                      />
                      <ActionCard
                        icon={RefreshCw}
                        label="Regenerate Pass"
                        sublabel="Creates new QR — invalidates old one"
                        onClick={handleRegenerate}
                        disabled={credAction !== null}
                      />
                      <ActionCard
                        icon={ShieldOff}
                        label="Revoke Pass"
                        sublabel="Permanently deactivates QR access"
                        onClick={handleRevoke}
                        variant="danger"
                        disabled={credAction !== null}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                /* No credential yet */
                <div className="flex flex-col items-center gap-6 py-12">
                  <div className="w-20 h-20 rounded-3xl bg-slate-100 border border-slate-200 flex items-center justify-center">
                    <QrCode className="w-10 h-10 text-slate-400" />
                  </div>
                  <div className="text-center space-y-2">
                    <h2 className="text-lg font-bold text-[#0F172A]">No Emergency Pass Yet</h2>
                    <p className="text-sm text-slate-500 max-w-sm">
                      Generate your Emergency Medical Pass to allow first responders to access your critical medical information in an emergency.
                    </p>
                  </div>
                  <button
                    onClick={handleGenerate}
                    disabled={credAction !== null}
                    className="flex items-center gap-2 px-6 py-3.5 rounded-2xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-sm shadow-md shadow-cyan-600/20 transition-all disabled:opacity-50 min-h-[48px]"
                  >
                    {credAction ? <RefreshCw className="w-4 h-4 animate-spin" /> : <QrCode className="w-4 h-4" />}
                    Generate Emergency Pass
                  </button>
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB: PROFILE SETTINGS ═══════ */}
          {activeTab === "profile" && (
            <div className="space-y-6">
              {profileLoading ? (
                <div className="py-16 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0891B2]" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-bold text-[#0F172A]">Emergency Profile Visibility</h2>
                      <p className="text-xs text-slate-500 mt-0.5">Control what first responders can see when scanning your QR</p>
                    </div>
                    {profileSaving && <RefreshCw className="w-4 h-4 animate-spin text-[#0891B2]" />}
                  </div>

                  <div className="bg-slate-50 rounded-2xl border border-slate-200 divide-y divide-slate-100 overflow-hidden px-4">
                    <ToggleRow label="Blood Group" description="Critical for emergency transfusions" value={profileSettings?.showBloodGroup ?? true} onChange={(v) => handleToggle("showBloodGroup", v)} />
                    <ToggleRow label="Current Medications" description="Active prescriptions and dosages" value={profileSettings?.showMedications ?? true} onChange={(v) => handleToggle("showMedications", v)} />
                    <ToggleRow label="Chronic Conditions" description="Ongoing medical conditions" value={profileSettings?.showConditions ?? true} onChange={(v) => handleToggle("showConditions", v)} />
                    <ToggleRow label="Major Surgeries" description="Significant surgical history" value={profileSettings?.showSurgeries ?? true} onChange={(v) => handleToggle("showSurgeries", v)} />
                    <ToggleRow label="Emergency Contacts" description="Contacts shown to first responders" value={profileSettings?.showEmergencyContacts ?? true} onChange={(v) => handleToggle("showEmergencyContacts", v)} />
                  </div>

                  {/* Emergency Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-[#0F172A] block">Emergency Notes</label>
                    <p className="text-[11px] text-slate-500">Personal notes shown to first responders (e.g. "I have a pacemaker")</p>
                    <textarea
                      rows={3}
                      value={profileSettings?.emergencyNotes || ""}
                      onChange={(e) => setProfileSettings((p) => p ? { ...p, emergencyNotes: e.target.value } : p)}
                      onBlur={async () => {
                        if (profileSettings) {
                          await emergencyApi.updateProfileSettings({ emergencyNotes: profileSettings.emergencyNotes }).catch(() => {});
                        }
                      }}
                      placeholder="E.g. I am diabetic and carry glucose tablets. Pacemaker implanted 2023."
                      className="w-full px-3.5 py-3 rounded-xl bg-slate-50 border border-slate-200 text-[#0F172A] text-xs focus:outline-none focus:border-[#0891B2] focus:bg-white transition-all resize-none"
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* ═══════ TAB: HISTORY ═══════ */}
          {activeTab === "history" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Emergency Access History</h2>
                  <p className="text-xs text-slate-500 mt-0.5">All emergency access events for your records</p>
                </div>
                <button onClick={loadHistory} className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 transition-colors">
                  <RefreshCw className={`w-4 h-4 ${historyLoading ? "animate-spin" : ""}`} />
                </button>
              </div>

              {historyLoading ? (
                <div className="py-12 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0891B2]" />
                </div>
              ) : history.length === 0 ? (
                <div className="py-16 text-center space-y-2">
                  <History className="w-10 h-10 text-slate-300 mx-auto" />
                  <p className="text-sm font-semibold text-slate-500">No access events yet</p>
                  <p className="text-xs text-slate-400">Emergency access events will appear here when your QR is scanned</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {history.map((item) => (
                    <AccessHistoryCard key={item.id} item={item} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ═══════ TAB: CONTACTS ═══════ */}
          {activeTab === "contacts" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-sm font-bold text-[#0F172A]">Emergency Contacts</h2>
                  <p className="text-xs text-slate-500 mt-0.5">Contacts shown to first responders when your QR is scanned</p>
                </div>
                <button
                  onClick={() => setShowAddContact(true)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:bg-[#0e7490] transition-colors min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Contact
                </button>
              </div>

              {profileLoading ? (
                <div className="py-8 flex items-center justify-center">
                  <RefreshCw className="w-5 h-5 animate-spin text-[#0891B2]" />
                </div>
              ) : (
                <>
                  {profileSettings?.emergencyContacts && profileSettings.emergencyContacts.length > 0 ? (
                    <div className="space-y-3">
                      {profileSettings.emergencyContacts.map((contact, i) => (
                        <div key={i} className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                          <div className="w-10 h-10 rounded-xl bg-[#0891B2]/10 text-[#0891B2] font-bold text-sm flex items-center justify-center shrink-0">
                            {contact.name.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-bold text-[#0F172A]">{contact.name}</div>
                            <div className="text-[11px] text-slate-500">{contact.relationship}</div>
                            <div className="text-[11px] text-[#0891B2] font-mono font-semibold">{contact.phone}</div>
                          </div>
                          <button
                            onClick={() => handleRemoveContact(i)}
                            className="p-2 rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            aria-label="Remove contact"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center space-y-2">
                      <Phone className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-sm text-slate-500">No emergency contacts added yet</p>
                    </div>
                  )}

                  {/* Add Contact Form */}
                  {showAddContact && (
                    <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4">
                      <h3 className="text-xs font-bold text-[#0F172A]">Add Emergency Contact</h3>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Full Name *</label>
                          <input
                            type="text"
                            value={newContact.name}
                            onChange={(e) => setNewContact((p) => ({ ...p, name: e.target.value }))}
                            placeholder="John Smith"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2] min-h-[38px]"
                          />
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Relationship</label>
                          <input
                            type="text"
                            value={newContact.relationship}
                            onChange={(e) => setNewContact((p) => ({ ...p, relationship: e.target.value }))}
                            placeholder="Spouse / Parent / Sibling"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2] min-h-[38px]"
                          />
                        </div>
                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-bold text-slate-600 mb-1">Phone Number *</label>
                          <input
                            type="tel"
                            value={newContact.phone}
                            onChange={(e) => setNewContact((p) => ({ ...p, phone: e.target.value }))}
                            placeholder="+91 98765 43210"
                            className="w-full px-3 py-2 rounded-xl bg-white border border-slate-200 text-xs text-[#0F172A] focus:outline-none focus:border-[#0891B2] min-h-[38px]"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={handleAddContact}
                          disabled={!newContact.name || !newContact.phone || profileSaving}
                          className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:bg-[#0e7490] disabled:opacity-50 transition-colors min-h-[36px]"
                        >
                          {profileSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
                          Save Contact
                        </button>
                        <button
                          onClick={() => setShowAddContact(false)}
                          className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 transition-colors min-h-[36px]"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
