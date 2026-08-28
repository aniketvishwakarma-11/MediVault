"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  Sliders,
  Shield,
  HardDrive,
  Brain,
  Power,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertTriangle,
  Server,
  Key,
  Clock,
  Lock,
  FileCheck,
  Cpu,
  Layers,
  Sparkles,
  RefreshCw,
  Info,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useToast } from "@/context/ToastContext";
import { supabase } from "@/lib/supabase";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface SystemSettingsData {
  security: {
    session_timeout_minutes: number;
    require_2fa: boolean;
    max_login_attempts: number;
    password_min_length: number;
    enforce_strong_passwords: boolean;
  };
  storage: {
    max_file_size_mb: number;
    retention_years: number;
    auto_archive_inactive: boolean;
    allowed_mimes: string[];
  };
  ai_engine: {
    default_model: string;
    confidence_threshold: number;
    max_tokens: number;
    enable_rag: boolean;
    temperature: number;
  };
  maintenance: {
    enabled: boolean;
    message: string;
    scheduled_end: string | null;
  };
}

interface RuntimeInfo {
  node_version: string;
  platform: string;
  architecture: string;
  uptime_seconds: number;
  environment: string;
}

export default function AdminSettingsPage() {
  const { user } = useAuth();
  const { success: showSuccess, error: showError, warning: showWarning, info: showInfo } = useToast();

  const [activeTab, setActiveTab] = useState<"security" | "storage" | "ai" | "maintenance">("security");
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

  // Settings State
  const [settings, setSettings] = useState<SystemSettingsData>({
    security: {
      session_timeout_minutes: 60,
      require_2fa: false,
      max_login_attempts: 5,
      password_min_length: 8,
      enforce_strong_passwords: true,
    },
    storage: {
      max_file_size_mb: 50,
      retention_years: 7,
      auto_archive_inactive: true,
      allowed_mimes: ["application/pdf", "image/png", "image/jpeg", "image/webp"],
    },
    ai_engine: {
      default_model: "gemini-1.5-flash",
      confidence_threshold: 0.85,
      max_tokens: 4096,
      enable_rag: true,
      temperature: 0.1,
    },
    maintenance: {
      enabled: false,
      message: "MediVault is currently undergoing routine maintenance. All services will resume shortly.",
      scheduled_end: null,
    },
  });

  const [runtime, setRuntime] = useState<RuntimeInfo | null>(null);

  // ─── Fetch Settings ────────────────────────────────────────────────────────
  const fetchSettings = useCallback(async () => {
    try {
      setLoading(true);
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = {};
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/settings`, { headers });
      if (res.ok) {
        const json = await res.json();
        if (json.data?.settings) {
          setSettings((prev) => ({
            ...prev,
            ...json.data.settings,
          }));
        }
        if (json.data?.system_runtime) {
          setRuntime(json.data.system_runtime);
        }
      }
    } catch (err) {
      console.error("Error loading system settings:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // ─── Save Settings Handler ────────────────────────────────────────────────
  const handleSaveSection = async (key: keyof SystemSettingsData) => {
    try {
      setSavingKey(key);
      setSaveSuccess(null);

      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/settings/${key}`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value: settings[key] }),
      });

      if (!res.ok) {
        const errJson = await res.json();
        throw new Error(errJson.message || "Failed to update configuration");
      }

      if (key === "maintenance") {
        if (typeof window !== "undefined") {
          localStorage.setItem("medivault_maintenance_state", JSON.stringify(settings.maintenance));
          window.dispatchEvent(new CustomEvent("medivault_maintenance_change", { detail: settings.maintenance }));
        }
      }

      setSaveSuccess(key);
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  const formatUptime = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    return `${hrs}h ${mins}m`;
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // ─── Direct Quick Toggle Maintenance Handler ───
  const handleQuickToggleMaintenance = async () => {
    const newState = !settings.maintenance.enabled;
    const updatedMaintenance = {
      ...settings.maintenance,
      enabled: newState,
    };

    setSettings((prev) => ({
      ...prev,
      maintenance: updatedMaintenance,
    }));

    if (typeof window !== "undefined") {
      localStorage.setItem("medivault_maintenance_state", JSON.stringify(updatedMaintenance));
      window.dispatchEvent(new CustomEvent("medivault_maintenance_change", { detail: updatedMaintenance }));
    }

    try {
      setSavingKey("maintenance");
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const res = await fetch(`${API_BASE_URL}/admin/settings/maintenance`, {
        method: "PATCH",
        headers,
        body: JSON.stringify({ value: updatedMaintenance }),
      });

      if (!res.ok) throw new Error("Failed to toggle maintenance mode");

      showSuccess(
        newState ? "Maintenance Activated" : "Maintenance Deactivated",
        newState
          ? "Platform locked. Push alert dispatched to all subscribed users."
          : "Services restored. Online push alert dispatched to all subscribed users."
      );

      setSaveSuccess("maintenance");
      setTimeout(() => setSaveSuccess(null), 3000);
    } catch (err: any) {
      showError("Action Failed", err.message || "Please try again.");
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300 pb-16">
      {/* ─── Header & Action Bar ─── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white shadow-sm shadow-cyan-500/20">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-heading font-extrabold text-2xl text-[#0F172A]">
                Enterprise System Configuration
              </h1>
              <p className="text-xs text-slate-500">
                Security policies, HIPAA document retention lifecycles, neural AI models, and maintenance switches.
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={fetchSettings}
          disabled={loading}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200/80 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-xs cursor-pointer"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
          <span>Reload Config</span>
        </button>
      </div>

      {/* ─── System Runtime Telemetry ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-cyan-50 text-[#0891B2] border border-cyan-100">
            <Server className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Node.js Engine</p>
            <h3 className="text-lg font-black text-[#0F172A] mt-0.5 font-mono">
              {mounted && runtime?.node_version ? runtime.node_version : "v22.14.0"}
            </h3>
            <p className="text-[10px] text-cyan-600 font-semibold mt-0.5">
              {mounted && runtime?.platform ? `${runtime.platform} (${runtime.architecture})` : "win32 (x64)"}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Cluster Uptime</p>
            <h3 className="text-lg font-black text-[#0F172A] mt-0.5 font-mono">
              {mounted && runtime?.uptime_seconds ? formatUptime(runtime.uptime_seconds) : "Active"}
            </h3>
            <p className="text-[10px] text-emerald-600 font-semibold mt-0.5">High availability active</p>
          </div>
        </div>

        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-purple-50 text-purple-600 border border-purple-100">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">Default AI Pipeline</p>
            <h3 className="text-lg font-black text-purple-700 mt-0.5 font-mono">{settings.ai_engine.default_model}</h3>
            <p className="text-[10px] text-purple-600 font-semibold mt-0.5">RAG Embedding Enabled</p>
          </div>
        </div>

        {/* 4th Card: Telemetry Status with Interactive Pill Switch */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className={`p-3 rounded-2xl border shrink-0 ${settings.maintenance.enabled ? "bg-rose-50 text-rose-600 border-rose-200" : "bg-emerald-50 text-emerald-600 border-emerald-200"}`}>
              <Power className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading">System Status</p>
              <h3 className="text-sm font-black text-[#0F172A] mt-0.5 truncate">
                {settings.maintenance.enabled ? "Maintenance ON" : "Live (Normal)"}
              </h3>
              <p className={`text-[10px] font-semibold truncate ${settings.maintenance.enabled ? "text-rose-600" : "text-emerald-600"}`}>
                {settings.maintenance.enabled ? "Portals Locked" : "All Open"}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleQuickToggleMaintenance}
            disabled={savingKey === "maintenance"}
            className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 shrink-0 disabled:opacity-50 ${
              settings.maintenance.enabled ? "bg-rose-600" : "bg-slate-300"
            }`}
            title="Click to toggle platform maintenance mode on/off immediately"
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                settings.maintenance.enabled ? "translate-x-6" : "translate-x-0"
              }`}
            />
          </button>
        </div>
      </div>

      {/* ─── Navigation Tabs ─── */}
      <div className="flex items-center gap-2 border-b border-slate-200/80 pb-px overflow-x-auto">
        {[
          { id: "security", label: "Security & Auth Policies", icon: Shield },
          { id: "storage", label: "Storage & HIPAA Retention", icon: HardDrive },
          { id: "ai", label: "AI Engine & Telemetry Presets", icon: Brain },
          { id: "maintenance", label: "Maintenance Switch", icon: Power },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex items-center gap-2 px-5 py-3 rounded-2xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                isActive
                  ? "bg-[#0891B2] text-white shadow-sm shadow-cyan-500/20"
                  : "bg-transparent text-slate-600 hover:text-[#0891B2] hover:bg-cyan-50/50"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ─── Tab 1: Security & Auth Policies ─── */}
      {activeTab === "security" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Security &amp; Authentication Policies</h3>
              <p className="text-xs text-slate-500">Configure global authentication constraints, token timeouts, and brute-force defenses.</p>
            </div>
            <button
              onClick={() => handleSaveSection("security")}
              disabled={savingKey === "security"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {savingKey === "security" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savingKey === "security" ? "Saving..." : "Save Security Policy"}</span>
            </button>
          </div>

          {saveSuccess === "security" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Security settings successfully applied to authentication gateway!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Session Timeout */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Session Inactivity Timeout (Minutes)</label>
              <p className="text-[11px] text-slate-500">Automatically logs out inactive patient and doctor sessions.</p>
              <input
                type="number"
                min={5}
                max={1440}
                value={settings.security.session_timeout_minutes}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, session_timeout_minutes: parseInt(e.target.value) || 60 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Max Login Attempts */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Max Failed Login Attempts</label>
              <p className="text-[11px] text-slate-500">Temporarily locks IP/account after repeated credential failures.</p>
              <input
                type="number"
                min={3}
                max={20}
                value={settings.security.max_login_attempts}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, max_login_attempts: parseInt(e.target.value) || 5 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Password Minimum Length */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Password Minimum Length</label>
              <p className="text-[11px] text-slate-500">Enforced during patient/doctor registration &amp; password reset.</p>
              <input
                type="number"
                min={6}
                max={32}
                value={settings.security.password_min_length}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, password_min_length: parseInt(e.target.value) || 8 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Mandatory 2FA Toggle */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">Enforce Two-Factor Auth (2FA)</label>
                <p className="text-[11px] text-slate-500">Require OTP verification for all doctor &amp; admin logins.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    security: { ...settings.security, require_2fa: !settings.security.require_2fa },
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                  settings.security.require_2fa ? "bg-[#0891B2]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                    settings.security.require_2fa ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 2: Storage & HIPAA Retention ─── */}
      {activeTab === "storage" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Storage &amp; HIPAA Compliance Lifecycle</h3>
              <p className="text-xs text-slate-500">MinIO S3 storage quotas, automatic archival windows, and accepted document formats.</p>
            </div>
            <button
              onClick={() => handleSaveSection("storage")}
              disabled={savingKey === "storage"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {savingKey === "storage" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savingKey === "storage" ? "Saving..." : "Save Storage Policy"}</span>
            </button>
          </div>

          {saveSuccess === "storage" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Storage policies successfully saved to object storage engine!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Max Upload Size */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Maximum Document Upload Size (MB)</label>
              <p className="text-[11px] text-slate-500">Limit per file upload for PDFs, DICOM scans, and prescriptions.</p>
              <input
                type="number"
                min={5}
                max={200}
                value={settings.storage.max_file_size_mb}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    storage: { ...settings.storage, max_file_size_mb: parseInt(e.target.value) || 50 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Retention Years */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">HIPAA Mandatory Retention Window (Years)</label>
              <p className="text-[11px] text-slate-500">Default 7-year regulatory retention period before cold archive.</p>
              <input
                type="number"
                min={1}
                max={25}
                value={settings.storage.retention_years}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    storage: { ...settings.storage, retention_years: parseInt(e.target.value) || 7 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Auto Archive Inactive */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">Auto-Archive Inactive Records</label>
                <p className="text-[11px] text-slate-500">Compress and tier inactive records older than retention window.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    storage: { ...settings.storage, auto_archive_inactive: !settings.storage.auto_archive_inactive },
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                  settings.storage.auto_archive_inactive ? "bg-[#0891B2]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                    settings.storage.auto_archive_inactive ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>

            {/* Allowed MIME Types */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Allowed Media MIME Types</label>
              <p className="text-[11px] text-slate-500">Permitted document extensions for patient vault storage.</p>
              <div className="flex flex-wrap gap-2 pt-1">
                {["application/pdf", "image/png", "image/jpeg", "image/webp"].map((mime) => (
                  <span
                    key={mime}
                    className="px-2.5 py-1 rounded-xl bg-white border border-slate-200 text-[10px] font-mono font-bold text-slate-700"
                  >
                    {mime}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 3: AI Intelligence & Telemetry Presets ─── */}
      {activeTab === "ai" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">AI Engine &amp; Extraction Parameters</h3>
              <p className="text-xs text-slate-500">Configure default Google Gemini models, confidence cutoff thresholds, and RAG search indexing.</p>
            </div>
            <button
              onClick={() => handleSaveSection("ai_engine")}
              disabled={savingKey === "ai_engine"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#0891B2] text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-cyan-500/20 cursor-pointer disabled:opacity-50"
            >
              {savingKey === "ai_engine" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Save className="w-3.5 h-3.5" />}
              <span>{savingKey === "ai_engine" ? "Saving..." : "Save AI Config"}</span>
            </button>
          </div>

          {saveSuccess === "ai_engine" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>AI model parameters &amp; confidence thresholds updated!</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Model Selector */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Default Clinical Extraction Model</label>
              <p className="text-[11px] text-slate-500">Primary neural network used for parsing raw clinical OCR transcripts.</p>
              <select
                value={settings.ai_engine.default_model}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai_engine: { ...settings.ai_engine, default_model: e.target.value },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              >
                <option value="gemini-1.5-flash">Google Gemini 1.5 Flash (Ultra-fast, 720ms latency)</option>
                <option value="gemini-1.5-pro">Google Gemini 1.5 Pro (Deep reasoning, multi-page)</option>
                <option value="nvidia-llama-3.1-70b">NVIDIA NIM Llama-3.1 70B (Clinical Pathology Engine)</option>
                <option value="nvidia-llama-3.3-70b">NVIDIA NIM Llama-3.3 70B (High-Precision Medical Failover)</option>
              </select>
            </div>

            {/* Confidence Cutoff Slider */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-800">Confidence Cutoff Threshold</label>
                <span className="font-mono text-xs font-bold text-[#0891B2]">
                  {Math.round(settings.ai_engine.confidence_threshold * 100)}%
                </span>
              </div>
              <p className="text-[11px] text-slate-500">Entities below this confidence are flagged for doctor review.</p>
              <input
                type="range"
                min={0.5}
                max={0.99}
                step={0.01}
                value={settings.ai_engine.confidence_threshold}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai_engine: { ...settings.ai_engine, confidence_threshold: parseFloat(e.target.value) },
                  })
                }
                className="w-full accent-[#0891B2] cursor-pointer"
              />
            </div>

            {/* Max Token Cap */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2">
              <label className="text-xs font-bold text-slate-800 block">Max Token Limit Per Extraction</label>
              <p className="text-[11px] text-slate-500">Upper token ceiling to prevent unbounded API inference costs.</p>
              <input
                type="number"
                min={1024}
                max={16384}
                step={512}
                value={settings.ai_engine.max_tokens}
                onChange={(e) =>
                  setSettings({
                    ...settings,
                    ai_engine: { ...settings.ai_engine, max_tokens: parseInt(e.target.value) || 4096 },
                  })
                }
                className="w-full px-3.5 py-2 rounded-xl bg-white border border-slate-200 text-xs font-bold text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
              />
            </div>

            {/* Enable RAG Toggle */}
            <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
              <div>
                <label className="text-xs font-bold text-slate-800 block">Qdrant Semantic RAG Indexing</label>
                <p className="text-[11px] text-slate-500">Automatically embed clinical entities into 768-dim vector store.</p>
              </div>
              <button
                type="button"
                onClick={() =>
                  setSettings({
                    ...settings,
                    ai_engine: { ...settings.ai_engine, enable_rag: !settings.ai_engine.enable_rag },
                  })
                }
                className={`w-12 h-6 rounded-full transition-colors relative cursor-pointer p-0.5 ${
                  settings.ai_engine.enable_rag ? "bg-[#0891B2]" : "bg-slate-300"
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                    settings.ai_engine.enable_rag ? "translate-x-6" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Tab 4: Platform Maintenance Switch ─── */}
      {activeTab === "maintenance" && (
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6 animate-in fade-in">
          <div className="flex items-center justify-between pb-4 border-b border-slate-100">
            <div>
              <h3 className="font-heading font-extrabold text-lg text-[#0F172A]">Platform Maintenance Switch</h3>
              <p className="text-xs text-slate-500">Activate emergency maintenance mode to lock non-admin user operations during database migrations.</p>
            </div>
            <button
              onClick={() => handleSaveSection("maintenance")}
              disabled={savingKey === "maintenance"}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-600 text-white text-xs font-bold hover:brightness-105 transition-all shadow-sm shadow-rose-500/20 cursor-pointer disabled:opacity-50"
            >
              {savingKey === "maintenance" ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Power className="w-3.5 h-3.5" />}
              <span>{savingKey === "maintenance" ? "Applying..." : "Apply Maintenance State"}</span>
            </button>
          </div>

          {saveSuccess === "maintenance" && (
            <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>Platform maintenance configuration saved!</span>
            </div>
          )}

          {/* Master Maintenance Switch Card */}
          <div className={`p-6 rounded-3xl border transition-all ${settings.maintenance.enabled ? "bg-rose-50/70 border-rose-300" : "bg-slate-50 border-slate-200"}`}>
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className={`p-3.5 rounded-2xl border ${settings.maintenance.enabled ? "bg-rose-500 text-white border-rose-600 shadow-md shadow-rose-500/30" : "bg-slate-200 text-slate-500 border-slate-300"}`}>
                  <Power className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="font-heading font-extrabold text-base text-[#0F172A]">
                    {settings.maintenance.enabled ? "Maintenance Mode is ACTIVE" : "Platform is LIVE"}
                  </h4>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {settings.maintenance.enabled
                      ? "Patients and doctors see a maintenance banner. Admin access remains open."
                      : "All platform portals (Patient, Doctor, Admin) are fully accessible."}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleQuickToggleMaintenance}
                disabled={savingKey === "maintenance"}
                className={`w-14 h-7 rounded-full transition-colors relative cursor-pointer p-0.5 disabled:opacity-50 ${
                  settings.maintenance.enabled ? "bg-rose-600" : "bg-slate-300"
                }`}
                title="Click to toggle maintenance mode on/off instantly"
              >
                <div
                  className={`w-6 h-6 rounded-full bg-white transition-transform duration-200 shadow-xs ${
                    settings.maintenance.enabled ? "translate-x-7" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Maintenance Message */}
          <div className="space-y-2">
            <label className="text-xs font-bold text-slate-800 block">User-Facing Maintenance Banner Message</label>
            <textarea
              rows={3}
              value={settings.maintenance.message}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  maintenance: { ...settings.maintenance, message: e.target.value },
                })
              }
              className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-xs font-medium text-[#0F172A] focus:outline-none focus:border-[#0891B2]"
            />
          </div>
        </div>
      )}
    </div>
  );
}
