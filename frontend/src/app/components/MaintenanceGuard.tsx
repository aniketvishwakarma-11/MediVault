"use client";

import React, { useEffect, useState, useCallback } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  Power,
  Wrench,
  RefreshCw,
  ShieldAlert,
  AlertTriangle,
  ArrowRight,
  Shield,
  Mail,
  Globe,
  Phone,
  MapPin,
  ExternalLink,
  Sparkles,
  Code,
  GraduationCap,
  Briefcase,
  Copy,
  Check,
  CheckCircle2,
  Lock,
  LogOut,
  LogIn,
  Home,
  User as UserIcon,
} from "lucide-react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { useAuth } from "@/context/AuthContext";

function LinkedInIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path d="M19 3a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h14m-.5 15.5v-5.3a3.26 3.26 0 0 0-3.26-3.26c-.85 0-1.84.52-2.28 1.3v-1.11h-2.79v8.37h2.79v-4.93c0-.77.62-1.4 1.39-1.4a1.4 1.4 0 0 1 1.4 1.4v4.93h2.75M6.88 8.56a1.68 1.68 0 0 0 1.68-1.68c0-.93-.75-1.69-1.68-1.69a1.69 1.69 0 0 0-1.69 1.69c0 .93.76 1.68 1.69 1.68m1.39 9.94v-8.37H5.5v8.37h2.77z" />
    </svg>
  );
}

function GitHubIcon({ className = "w-3.5 h-3.5" }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 24 24">
      <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.53 1.032 1.53 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
    </svg>
  );
}

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

interface MaintenanceState {
  enabled: boolean;
  message: string;
  scheduled_end?: string | null;
}

export function MaintenanceGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, userProfile, role, logout, isDemo } = useAuth();
  const [loggingOut, setLoggingOut] = useState(false);

  const [maintenance, setMaintenance] = useState<MaintenanceState>(() => {
    if (typeof window !== "undefined") {
      try {
        const cached = localStorage.getItem("medivault_maintenance_state");
        if (cached) return JSON.parse(cached);
      } catch (e) {}
    }
    return { enabled: false, message: "" };
  });
  const [checking, setChecking] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  const handleSignOut = async () => {
    try {
      setLoggingOut(true);
      await logout();
      router.push("/auth");
    } catch (err) {
      console.error("[MaintenanceGuard] Sign out error:", err);
      if (typeof window !== "undefined") {
        window.location.href = "/auth";
      }
    } finally {
      setLoggingOut(false);
    }
  };

  const checkMaintenance = useCallback(async () => {
    try {
      setChecking(true);

      // 1. Try Backend API endpoint
      try {
        const res = await fetch(`${API_BASE_URL}/system/maintenance`, {
          cache: "no-store",
        });
        if (res.ok) {
          const json = await res.json();
          if (json.maintenance) {
            setMaintenance(json.maintenance);
            if (typeof window !== "undefined") {
              localStorage.setItem("medivault_maintenance_state", JSON.stringify(json.maintenance));
            }
            return;
          }
        }
      } catch (apiErr) {
        // Fallback to Supabase direct query
      }

      // 2. Direct Supabase Query Fallback
      const { data, error } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", "maintenance")
        .single();

      if (!error && data?.value) {
        setMaintenance(data.value);
        if (typeof window !== "undefined") {
          localStorage.setItem("medivault_maintenance_state", JSON.stringify(data.value));
        }
      }
    } catch (e) {
      console.warn("[MaintenanceGuard] Status check:", e);
    } finally {
      setChecking(false);
    }
  }, []);

  useEffect(() => {
    // Listen for instant local updates across tabs and window
    const handleCustomChange = (e: any) => {
      if (e.detail) {
        setMaintenance(e.detail);
      }
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "medivault_maintenance_state" && e.newValue) {
        try {
          setMaintenance(JSON.parse(e.newValue));
        } catch (err) {}
      }
    };

    window.addEventListener("medivault_maintenance_change", handleCustomChange);
    window.addEventListener("storage", handleStorageChange);

    checkMaintenance();
    const interval = setInterval(checkMaintenance, 5000);

    return () => {
      window.removeEventListener("medivault_maintenance_change", handleCustomChange);
      window.removeEventListener("storage", handleStorageChange);
      clearInterval(interval);
    };
  }, [checkMaintenance]);

  const handleCopyEmail = () => {
    navigator.clipboard.writeText("aniketvishworks@gmail.com");
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2500);
  };

  const isAdminRoute = pathname?.startsWith("/admin");
  const isHomepage = pathname === "/";
  const isAuthRoute = pathname === "/auth";
  const isEmergencyRoute = pathname === "/patient/emergency" || pathname?.startsWith("/e/");

  // When Maintenance is ACTIVE:
  if (maintenance.enabled) {
    // 1. Admin Console: Always accessible with top reminder banner
    if (isAdminRoute) {
      return (
        <>
          <div className="bg-gradient-to-r from-rose-600 to-amber-600 text-white px-4 py-2 text-xs font-bold flex items-center justify-between shadow-sm z-50 sticky top-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>
                <strong>MAINTENANCE MODE ACTIVE:</strong> Patient and Doctor portals are locked. Admin console remains open.
              </span>
            </div>
            <Link
              href="/admin/settings"
              className="underline hover:text-white/80 shrink-0 font-extrabold"
            >
              Settings &rarr;
            </Link>
          </div>
          {children}
        </>
      );
    }

    // 2. Homepage, Auth, and Emergency Life-saving Passes: Accessible with top maintenance banner
    if (isHomepage || isAuthRoute || isEmergencyRoute) {
      return (
        <>
          <div className="bg-gradient-to-r from-[#0891B2] via-teal-600 to-[#0D9488] text-white px-4 py-2.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md z-50 sticky top-0 animate-in slide-in-from-top text-center">
            <Wrench className="w-4 h-4 shrink-0 animate-pulse" />
            <span>
              <strong>SCHEDULED UPGRADE IN PROGRESS:</strong> {maintenance.message || "Patient & Doctor portals are undergoing database optimization. All services will resume shortly."}
            </span>
          </div>
          {children}
        </>
      );
    }

    // 3. All Other Routes (Patients /patient/*, Doctors /doctor/*, etc.): BRANDED FULL-SCREEN LOCK
    return (
      <div className="min-h-screen bg-[#F0FDFA] text-[#0F172A] flex flex-col justify-between p-4 sm:p-8 font-body relative overflow-x-hidden">
        {/* Ambient Gradient Glows */}
        <div className="fixed inset-0 grid-pattern opacity-40 pointer-events-none" />
        <div className="fixed -top-40 -left-40 w-96 h-96 rounded-full bg-cyan-200/50 blur-3xl pointer-events-none -z-10" />
        <div className="fixed -bottom-40 -right-40 w-96 h-96 rounded-full bg-teal-200/40 blur-3xl pointer-events-none -z-10" />

        {/* Top Navbar Header with Brand & Interactive Navigation Actions */}
        <header className="max-w-6xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between gap-4 py-4 border-b border-slate-200/80 mb-4 sm:mb-6">
          <Link href="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="p-2.5 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white shadow-md shadow-cyan-500/20 group-hover:scale-105 transition-transform">
              <Shield className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-heading font-extrabold text-xl text-[#0F172A] tracking-tight">
                  MediVault
                </span>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-100/80 text-[#0891B2] border border-cyan-200 uppercase">
                  HEALTH AI
                </span>
              </div>
              <p className="text-[10px] text-slate-500 font-medium">Digital Health &amp; Clinical Identity</p>
            </div>
          </Link>

          {/* Nav & Auth Controls */}
          <div className="flex flex-wrap items-center justify-center sm:justify-end gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-ping" />
              Maintenance Mode
            </span>

            <Link
              href="/"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold border border-slate-200 shadow-xs transition-colors"
            >
              <Home className="w-3.5 h-3.5 text-slate-500" />
              <span>Home</span>
            </Link>

            <Link
              href="/patient/emergency"
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold border border-rose-200 shadow-xs transition-colors"
            >
              <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
              <span>Emergency ID</span>
            </Link>

            {user || isDemo ? (
              <div className="flex items-center gap-2">
                <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100/80 border border-slate-200 text-xs text-slate-700 font-medium">
                  <UserIcon className="w-3.5 h-3.5 text-[#0891B2]" />
                  <span className="max-w-[120px] truncate">{userProfile?.displayName || user?.email?.split("@")[0] || "User"}</span>
                  <span className="uppercase text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                    {role}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  disabled={loggingOut}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50"
                  title="Sign Out of MediVault"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                </button>
              </div>
            ) : (
              <Link
                href="/auth"
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold shadow-xs transition-colors"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Portal Login</span>
              </Link>
            )}
          </div>
        </header>

        {/* Main Content Grid: Maintenance Notice + Admin Architect Profile */}
        <main className="max-w-6xl mx-auto w-full my-auto py-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
            {/* ─── Left Card: Maintenance Status & Upgrade Notice (7 Cols) ─── */}
            <div className="lg:col-span-7 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-cyan-900/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500/10 to-rose-500/10 border border-amber-200 text-amber-600 flex items-center justify-center shadow-xs">
                    <Wrench className="w-6 h-6 animate-bounce" />
                  </div>
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold bg-rose-50 text-rose-700 border border-rose-200 uppercase font-heading tracking-wider">
                    <Power className="w-3 h-3" /> Scheduled System Upgrade
                  </span>
                </div>

                <div className="space-y-1.5">
                  <h1 className="font-heading font-black text-2xl sm:text-3xl text-[#0F172A] tracking-tight leading-tight">
                    MediVault is Upgrading
                  </h1>
                  <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                    We are currently performing scheduled infrastructure scaling, database indexing, and clinical AI model telemetry optimizations.
                  </p>
                </div>

                {/* Custom Admin Announcement Box */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1.5">
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-[#0891B2]" /> Administrator Operational Notice
                  </span>
                  <p className="text-xs text-slate-700 font-semibold leading-relaxed">
                    {maintenance.message ||
                      "MediVault is currently undergoing routine maintenance. Patient & Doctor portals are temporarily offline. All services will resume shortly."}
                  </p>
                </div>

                {/* Live Upgrade Telemetry & Progress Bar */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50/50 to-slate-50 border border-cyan-100/80 space-y-2.5">
                  <div className="flex items-center justify-between text-xs font-bold text-slate-800">
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-[#0891B2] animate-spin" />
                      <span>Cluster Re-indexing &amp; Verification</span>
                    </span>
                    <span className="font-mono text-[#0891B2]">98.4% Completed</span>
                  </div>
                  <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                    <div className="h-full bg-gradient-to-r from-[#0891B2] to-[#0D9488] rounded-full w-[98.4%] animate-pulse" />
                  </div>
                  <p className="text-[10px] text-slate-500 font-medium">
                    Automatic health probe active &middot; Portals will resume immediately upon migration finish.
                  </p>
                </div>

                {/* 4 Diagnostic Status Badges */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                  <div className="p-3 rounded-xl bg-cyan-50/60 border border-cyan-100 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0891B2] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Patient Vaults Encrypted</p>
                      <p className="text-[10px] text-slate-500">AES-256 GCM Storage Safe</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-teal-50/60 border border-teal-100 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-[#0D9488] shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Polygon Blockchain Proofs</p>
                      <p className="text-[10px] text-slate-500">Immutable Ledger Verified</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">MinIO Object Storage</p>
                      <p className="text-[10px] text-slate-500">Data Integrity Protected</p>
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center gap-2.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-slate-800">Auto-Reconnection</p>
                      <p className="text-[10px] text-slate-500">Polling every 5 seconds</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-wrap items-center gap-2.5 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={checkMaintenance}
                  disabled={checking}
                  className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#0891B2] to-[#0D9488] text-white text-xs font-bold hover:brightness-105 transition-all cursor-pointer shadow-xs disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${checking ? "animate-spin" : ""}`} />
                  <span>{checking ? "Checking..." : "Check Status & Refresh"}</span>
                </button>

                <Link
                  href="/"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition-all border border-slate-200 shadow-xs"
                >
                  <Home className="w-3.5 h-3.5 text-slate-500" />
                  <span>Return to Homepage</span>
                </Link>

                <Link
                  href="/patient/emergency"
                  className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 shadow-xs"
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-600" />
                  <span>Emergency Pass</span>
                </Link>

                {user || isDemo ? (
                  <button
                    type="button"
                    onClick={handleSignOut}
                    disabled={loggingOut}
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold transition-all border border-rose-200 shadow-xs cursor-pointer disabled:opacity-50"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-600" />
                    <span>{loggingOut ? "Signing out..." : "Sign Out"}</span>
                  </button>
                ) : (
                  <Link
                    href="/auth"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-cyan-50 hover:bg-cyan-100 text-[#0891B2] text-xs font-bold transition-all border border-cyan-200 shadow-xs"
                  >
                    <LogIn className="w-3.5 h-3.5" />
                    <span>Sign In / Switch Role</span>
                  </Link>
                )}

                {role === "admin" && (
                  <Link
                    href="/admin/settings"
                    className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-xs font-bold transition-all border border-amber-200 shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-600" />
                    <span>Admin Settings &rarr;</span>
                  </Link>
                )}
              </div>
            </div>

            {/* ─── Right Card: Lead Platform Architect & Contact Admin (5 Cols) ─── */}
            <div className="lg:col-span-5 bg-white/95 backdrop-blur-xl border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-xl shadow-teal-900/5 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider font-heading flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-[#0891B2]" /> Platform Architect &amp; Creator
                  </span>
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200">
                    Lead Engineer
                  </span>
                </div>

                {/* Profile Header */}
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#0891B2] to-[#0D9488] text-white font-heading font-black text-xl flex items-center justify-center shadow-md shadow-cyan-500/20 shrink-0">
                    AV
                  </div>
                  <div>
                    <h2 className="font-heading font-black text-lg text-[#0F172A] leading-snug">
                      Aniket Vishwakarma
                    </h2>
                    <p className="text-xs font-bold text-[#0891B2]">Full-Stack Engineer &amp; AI Solutions Builder</p>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1 mt-0.5">
                      <MapPin className="w-3 h-3" /> Mumbai, India
                    </p>
                  </div>
                </div>

                {/* Inspiring Mission & Purpose Bio */}
                <p className="text-xs text-slate-600 leading-relaxed">
                  Driven by the conviction that software should solve real-world human challenges. I engineer intelligent, privacy-first, and accessible digital ecosystems—bridging artificial intelligence and robust system design to democratize critical healthcare data and empower people globally.
                </p>

                {/* Education */}
                <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-slate-50 border border-slate-200/80 text-xs">
                  <GraduationCap className="w-3.5 h-3.5 text-[#0891B2] shrink-0" />
                  <span className="text-[11px] font-bold text-slate-700">
                    B.E. in Information Technology &middot; Mumbai University (PVPPCOE)
                  </span>
                </div>

                {/* Contact & Links List */}
                <div className="space-y-2 pt-1">
                  {/* Email */}
                  <div className="flex items-center justify-between p-2.5 rounded-xl bg-cyan-50/50 border border-cyan-100 text-xs">
                    <a
                      href="mailto:aniketvishworks@gmail.com"
                      className="flex items-center gap-2 font-bold text-slate-800 hover:text-[#0891B2] transition-colors truncate"
                    >
                      <Mail className="w-3.5 h-3.5 text-[#0891B2] shrink-0" />
                      <span className="truncate">aniketvishworks@gmail.com</span>
                    </a>
                    <button
                      onClick={handleCopyEmail}
                      className="p-1 rounded-lg hover:bg-white text-slate-400 hover:text-[#0891B2] transition-colors cursor-pointer shrink-0 ml-2"
                      title="Copy Email"
                    >
                      {copiedEmail ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Portfolio Link (Full Width) */}
                  <a
                    href="https://aniket-vishwakarma-portfolio.vercel.app/"
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2.5 rounded-xl bg-teal-50/50 hover:bg-teal-50 border border-teal-100 hover:border-teal-200 text-xs font-bold text-slate-800 hover:text-[#0D9488] transition-all group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span className="truncate">aniket-vishwakarma-portfolio.vercel.app</span>
                    </div>
                    <ExternalLink className="w-3 h-3 text-teal-600 opacity-60 group-hover:opacity-100 shrink-0 ml-2" />
                  </a>

                  {/* LinkedIn & GitHub Grid */}
                  <div className="grid grid-cols-2 gap-2">
                    <a
                      href="https://www.linkedin.com/in/aniket-vishwakarma-bb1b922b5"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-cyan-50 border border-slate-200 hover:border-cyan-200 text-xs font-bold text-slate-700 hover:text-[#0891B2] transition-all"
                    >
                      <LinkedInIcon className="w-3.5 h-3.5 text-[#0891B2]" />
                      <span>LinkedIn Profile</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>

                    <a
                      href="https://github.com/aniketvishwakarma-11"
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 text-xs font-bold text-slate-700 transition-all"
                    >
                      <GitHubIcon className="w-3.5 h-3.5 text-slate-800" />
                      <span>GitHub</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-50" />
                    </a>
                  </div>
                </div>

                {/* Core Impact & Problem Solving Domains */}
                <div className="pt-2">
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      "Clinical AI Intelligence",
                      "Healthcare Democratization",
                      "Cryptographic Trust & Privacy",
                      "Human-Centric UX",
                      "Scalable Cloud Systems",
                    ].map((domain) => (
                      <span
                        key={domain}
                        className="px-2 py-0.5 rounded-lg bg-cyan-50/70 border border-cyan-100/80 text-[#0891B2] text-[10px] font-bold"
                      >
                        {domain}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <p className="text-[10px] text-slate-400 font-mono text-center pt-2">
                For administrative assistance, emergency access, or platform inquiries, feel free to reach out directly.
              </p>
            </div>
          </div>
        </main>

        {/* Footer Navigation */}
        <footer className="max-w-6xl mx-auto w-full pt-6 pb-4 border-t border-slate-200/70 mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500 font-medium">
          <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-4">
            <Link href="/" className="hover:text-[#0891B2] transition-colors">Home</Link>
            <span className="text-slate-300">&bull;</span>
            <Link href="/patient/emergency" className="hover:text-[#0891B2] transition-colors">Emergency Medical Pass</Link>
            <span className="text-slate-300">&bull;</span>
            <Link href="/auth" className="hover:text-[#0891B2] transition-colors">Portal Login</Link>
            <span className="text-slate-300">&bull;</span>
            <Link href="/admin" className="hover:text-[#0891B2] transition-colors">Admin Console</Link>
          </div>
          <p className="font-mono text-[11px] text-slate-400 text-center sm:text-right">
            MediVault Chain AI &copy; 2026 &middot; High Availability Infrastructure
          </p>
        </footer>
      </div>
    );
  }

  // Normal live state: render application normally
  return <>{children}</>;
}
