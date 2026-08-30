"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "motion/react";
import {
  ShieldAlert,
  ShieldCheck,
  Activity,
  ArrowLeft,
  Home,
  FileText,
  Stethoscope,
  AlertTriangle,
  RefreshCw,
  Search,
  Lock,
  Terminal,
  ChevronRight,
  ExternalLink,
  Zap,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isTracing, setIsTracing] = useState(false);
  const [traceLogs, setTraceLogs] = useState<string[]>([]);
  const [currentPath, setCurrentPath] = useState("");

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const handleRunTracer = () => {
    if (isTracing) return;
    setIsTracing(true);
    setTraceLogs([]);

    const steps = [
      `[0.02s] INITIATING CRYPTOGRAPHIC ROUTE AUDIT: ${currentPath || "/unknown-sector"}`,
      `[0.08s] QUERYING SUPABASE POSTGRESQL CLUSTER: RECORD_NOT_FOUND (404)`,
      `[0.14s] CHECKING DECENTRALIZED IPFS & MINIO S3 BUCKET: ZERO_MATCH`,
      `[0.21s] ABDM V3 NATIONAL HEALTH GRID PROBE: ADDRESS UNRESOLVED`,
      `[0.29s] VAULT INTEGRITY VERIFIED: 100% SECURE. RE-ROUTING TO SAFE HARBOR.`,
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setTraceLogs((prev) => [...prev, step]);
        if (idx === steps.length - 1) {
          setIsTracing(false);
        }
      }, (idx + 1) * 350);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const query = searchQuery.trim().toLowerCase();
    if (!query) return;

    if (query.includes("doc") || query.includes("prescription")) {
      router.push("/patient/reports");
    } else if (query.includes("emergency") || query.includes("er") || query.includes("pass")) {
      router.push("/patient/emergency");
    } else if (query.includes("abha") || query.includes("card") || query.includes("id")) {
      router.push("/patient/profile");
    } else if (query.includes("doctor") || query.includes("clinic") || query.includes("emr")) {
      router.push("/doctor/dashboard");
    } else if (query.includes("timeline") || query.includes("history")) {
      router.push("/patient/timeline");
    } else {
      router.push(`/patient/dashboard?search=${encodeURIComponent(query)}`);
    }
  };

  return (
    <main className="min-h-screen bg-slate-950 text-white selection:bg-cyan-500/30 selection:text-cyan-200 relative overflow-hidden flex flex-col justify-between font-sans">
      {/* ── Background Geometric Cyber Grid & Ambient Glows ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Subtle 32px radial grid */}
        <div 
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.4) 1px, transparent 0)`,
            backgroundSize: "32px 32px",
          }}
        />

        {/* Ambient Top Cyan & Emerald Glow Spheres */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.15, 0.25, 0.15],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[700px] h-[500px] bg-gradient-to-b from-cyan-500/20 via-teal-500/10 to-transparent blur-[120px] rounded-full pointer-events-none"
        />

        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.1, 0.18, 0.1],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-40 right-1/4 w-[500px] h-[500px] bg-gradient-to-t from-emerald-500/15 via-cyan-600/10 to-transparent blur-[140px] rounded-full pointer-events-none"
        />
      </div>

      {/* ── Header Navigation Bar ── */}
      <header className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex items-center justify-between border-b border-white/5">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 p-0.5 shadow-lg shadow-cyan-500/20 group-hover:scale-105 transition-transform">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <ShieldCheck className="w-5 h-5 text-cyan-400" />
            </div>
          </div>
          <div className="flex flex-col">
            <span className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-1.5">
              MediVault <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-400 font-mono font-bold uppercase">Chain AI</span>
            </span>
          </div>
        </Link>

        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <span className="font-mono text-slate-300 font-medium">HTTP 404: Uncharted Route</span>
          </div>
          <button
            onClick={() => router.back()}
            className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Go Back</span>
          </button>
        </div>
      </header>

      {/* ── Main Hero Section ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center my-auto">
        
        {/* Holographic 3D Animated Medical Vault Core */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          
          {/* Outer Orbital Rotating Ring 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-dashed border-cyan-500/20 absolute -inset-6 sm:-inset-8 pointer-events-none"
          />

          {/* Inner Orbital Counter-Rotating Ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-white/10 border-t-cyan-400/50 border-r-emerald-400/40 absolute -inset-2 pointer-events-none"
          />

          {/* Pulsing Luminous Center Shield */}
          <motion.div
            animate={{
              scale: [1, 1.05, 1],
              boxShadow: [
                "0 0 40px rgba(6,182,212,0.2)",
                "0 0 70px rgba(16,185,129,0.3)",
                "0 0 40px rgba(6,182,212,0.2)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-gradient-to-b from-slate-900 via-slate-950 to-slate-900 border border-white/15 backdrop-blur-xl flex flex-col items-center justify-center relative p-4 shadow-2xl"
          >
            {/* Animated ECG Sine Wave Line across center */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 overflow-hidden pointer-events-none opacity-40">
              <svg viewBox="0 0 200 40" className="w-full h-full text-cyan-400 stroke-current fill-none stroke-[2]">
                <motion.path
                  d="M0 20 L40 20 L50 10 L60 30 L70 5 L80 35 L90 20 L200 20"
                  animate={{
                    pathOffset: [0, 1],
                  }}
                  transition={{ duration: 2.2, repeat: Infinity, ease: "linear" }}
                />
              </svg>
            </div>

            {/* Glowing Core Icon */}
            <motion.div
              animate={{ y: [-3, 3, -3] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-emerald-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-300 relative z-10 shadow-inner"
            >
              <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-cyan-400 drop-shadow-[0_0_12px_rgba(6,182,212,0.8)]" />
            </motion.div>

            {/* Core Status Tag */}
            <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-[10px] font-mono font-bold text-rose-300 uppercase tracking-wider relative z-10">
              Sector 404 Locked
            </div>
          </motion.div>

          {/* Floating Orbiting Satellite Nodes */}
          <motion.div
            animate={{
              y: [-10, 10, -10],
              x: [-4, 4, -4],
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -left-6 sm:-left-10 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-cyan-500/30 backdrop-blur-md text-[10px] font-mono text-cyan-300 shadow-lg flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3 text-cyan-400" />
            <span>SHA-256 Valid</span>
          </motion.div>

          <motion.div
            animate={{
              y: [8, -8, 8],
              x: [4, -4, 4],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-2 -right-6 sm:-right-10 px-2.5 py-1 rounded-xl bg-slate-900/90 border border-emerald-500/30 backdrop-blur-md text-[10px] font-mono text-emerald-300 shadow-lg flex items-center gap-1.5"
          >
            <Activity className="w-3 h-3 text-emerald-400" />
            <span>AWS ap-south-1</span>
          </motion.div>
        </div>

        {/* 404 Headline */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-3 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
            <span>Encrypted Ledger Diagnostic: Route Null Pointer</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black tracking-tight text-white">
            Clinical Record <span className="bg-gradient-to-r from-cyan-400 via-teal-300 to-emerald-400 bg-clip-text text-transparent">Not Located</span>
          </h1>

          <p className="text-slate-400 text-sm sm:text-base leading-relaxed">
            The requested medical endpoint or decentralized ledger block does not exist. It may have moved, expired, or been permanently shredded in compliance with statutory DPDPA Section 12 protocols.
          </p>
        </motion.div>

        {/* Quick Portal Navigation Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl mt-8">
          
          {/* Card 1: Patient Vault */}
          <Link
            href="/patient/dashboard"
            className="group p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-cyan-500/40 text-left transition-all duration-300 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-cyan-300 transition-colors">
                Patient Vault
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Access your encrypted health locker, lab tests, and 14-digit ABHA card.
              </p>
            </div>
          </Link>

          {/* Card 2: Doctor Workstation */}
          <Link
            href="/doctor/dashboard"
            className="group p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-emerald-500/40 text-left transition-all duration-300 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors">
                Doctor Station
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Consented patient clinical directory, e-prescriptions, and AI Copilot.
              </p>
            </div>
          </Link>

          {/* Card 3: Emergency Trauma Pass */}
          <Link
            href="/patient/emergency"
            className="group p-4 rounded-2xl bg-slate-900/60 hover:bg-slate-900 border border-white/10 hover:border-rose-500/40 text-left transition-all duration-300 shadow-lg flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-rose-400 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white group-hover:text-rose-300 transition-colors">
                Emergency Pass
              </h3>
              <p className="text-[11px] text-slate-400 mt-1 leading-snug">
                Paramedic break-glass resuscitation QR card for instant trauma triage.
              </p>
            </div>
          </Link>
        </div>

        {/* Primary Action Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-gradient-to-r from-cyan-500 to-emerald-500 text-slate-950 font-bold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <button
            type="button"
            onClick={handleRunTracer}
            disabled={isTracing}
            className="px-5 py-3 rounded-xl bg-white/10 hover:bg-white/15 border border-white/15 text-white font-semibold text-xs sm:text-sm transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Terminal className={`w-4 h-4 text-cyan-400 ${isTracing ? "animate-spin" : ""}`} />
            <span>{isTracing ? "Auditing Grid..." : "Run Vault Tracer"}</span>
          </button>
        </div>

        {/* Diagnostic Tracer Terminal Console */}
        <AnimatePresence>
          {(traceLogs.length > 0 || isTracing) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-2xl mt-6 rounded-2xl bg-slate-950 border border-cyan-500/30 p-4 text-left font-mono text-[11px] shadow-2xl relative overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300 font-semibold ml-1">medivault-telemetry-tracer --verbose</span>
                </div>
                <span className="text-[10px] text-cyan-400">STATUS: AUDITING</span>
              </div>

              <div className="space-y-1 text-slate-300">
                {traceLogs.map((log, i) => (
                  <div key={i} className="flex items-start gap-2">
                    <span className="text-cyan-400 shrink-0">➜</span>
                    <span className={log.includes("100% SECURE") ? "text-emerald-400 font-bold" : ""}>
                      {log}
                    </span>
                  </div>
                ))}
                {isTracing && (
                  <div className="flex items-center gap-2 text-cyan-400 animate-pulse pt-1">
                    <span>_</span>
                    <span className="text-[10px] text-slate-500">Scanning decentralized nodes...</span>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </section>

      {/* ── Footer Telemetry & Legal ── */}
      <footer className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-slate-500 font-mono">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
          <span>Core Grid Healthy: AWS Mumbai (ap-south-1)</span>
        </div>

        <div className="flex items-center gap-4 text-slate-400">
          <Link href="/privacy" className="hover:text-white transition-colors">
            Privacy Policy
          </Link>
          <span>•</span>
          <Link href="/terms" className="hover:text-white transition-colors">
            Terms of Service
          </Link>
          <span>•</span>
          <span>DPDPA &amp; ABDM V3 Compliant</span>
        </div>
      </footer>
    </main>
  );
}
