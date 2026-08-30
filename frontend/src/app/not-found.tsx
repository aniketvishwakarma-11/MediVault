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
  Lock,
  Terminal,
  ChevronRight,
  Zap,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
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
      }, (idx + 1) * 320);
    });
  };

  return (
    <main className="min-h-screen bg-[#F8FAFC] text-slate-900 selection:bg-cyan-100 selection:text-cyan-900 relative overflow-hidden flex flex-col justify-between font-sans">
      {/* 2px brand accent topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-[#0891B2]" />

      {/* ── Background Grid & Soft Ambient Light Glows ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Crisp subtle dot grid */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Top soft cyan glow */}
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.35, 0.5, 0.35],
          }}
          transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-32 left-1/2 -translate-x-1/2 w-[650px] h-[400px] bg-gradient-to-b from-cyan-100 via-teal-50 to-transparent blur-[100px] rounded-full pointer-events-none"
        />

        {/* Bottom-right soft emerald glow */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.2, 0.35, 0.2],
          }}
          transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute -bottom-32 right-1/4 w-[500px] h-[400px] bg-gradient-to-t from-emerald-100 via-cyan-50 to-transparent blur-[110px] rounded-full pointer-events-none"
        />
      </div>

      {/* ── Header Navigation Bar (Matches site header) ── */}
      <header className="relative z-10 w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-lg bg-[#0891B2] text-white flex items-center justify-center shadow-sm group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[1.1rem] tracking-tight text-slate-900">
                Medi<span className="text-[#0891B2]">Vault</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-bold tracking-widest px-2 py-0.5 rounded bg-cyan-50 text-[#0891B2] border border-cyan-200">
                AI · ZKP
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 border border-rose-200 text-[11px] text-rose-700 font-medium">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono font-semibold">HTTP 404: Uncharted Route</span>
            </div>
            <button
              onClick={() => router.back()}
              className="px-3.5 py-1.5 rounded-lg bg-white hover:bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 hover:text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Hero Content ── */}
      <section className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col items-center text-center my-auto">
        
        {/* Holographic 3D Animated Medical Vault Core (Light Edition) */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center">
          
          {/* Outer Orbital Rotating Ring 1 */}
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
            className="w-56 h-56 sm:w-72 sm:h-72 rounded-full border border-dashed border-cyan-300 absolute -inset-6 sm:-inset-8 pointer-events-none opacity-60"
          />

          {/* Inner Orbital Counter-Rotating Ring 2 */}
          <motion.div
            animate={{ rotate: -360 }}
            transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
            className="w-48 h-48 sm:w-60 sm:h-60 rounded-full border border-slate-200 border-t-[#0891B2] border-r-teal-500 absolute -inset-2 pointer-events-none"
          />

          {/* Pulsing Center Card */}
          <motion.div
            animate={{
              scale: [1, 1.03, 1],
              boxShadow: [
                "0 10px 30px -10px rgba(8,145,178,0.15)",
                "0 20px 40px -10px rgba(13,148,136,0.2)",
                "0 10px 30px -10px rgba(8,145,178,0.15)",
              ],
            }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            className="w-36 h-36 sm:w-44 sm:h-44 rounded-3xl bg-white border-2 border-slate-100 shadow-xl flex flex-col items-center justify-center relative p-4"
          >
            {/* Animated ECG Sine Wave Line across center */}
            <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-10 overflow-hidden pointer-events-none opacity-30">
              <svg viewBox="0 0 200 40" className="w-full h-full text-[#0891B2] stroke-current fill-none stroke-[2]">
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
              className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#0891B2] relative z-10 shadow-xs"
            >
              <ShieldAlert className="w-7 h-7 sm:w-8 sm:h-8 text-[#0891B2]" />
            </motion.div>

            {/* Core Status Tag */}
            <div className="mt-2.5 px-2.5 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[10px] font-mono font-bold text-rose-700 uppercase tracking-wider relative z-10">
              Sector 404 Locked
            </div>
          </motion.div>

          {/* Floating Orbiting Satellite Nodes */}
          <motion.div
            animate={{
              y: [-8, 8, -8],
              x: [-3, 3, -3],
            }}
            transition={{ duration: 4.5, repeat: Infinity, ease: "easeInOut" }}
            className="absolute -top-2 -left-6 sm:-left-10 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-md text-[10px] font-mono text-slate-700 flex items-center gap-1.5"
          >
            <Lock className="w-3 h-3 text-[#0891B2]" />
            <span>SHA-256 Valid</span>
          </motion.div>

          <motion.div
            animate={{
              y: [6, -6, 6],
              x: [3, -3, 3],
            }}
            transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="absolute -bottom-2 -right-6 sm:-right-10 px-2.5 py-1 rounded-xl bg-white border border-slate-200 shadow-md text-[10px] font-mono text-slate-700 flex items-center gap-1.5"
          >
            <Activity className="w-3 h-3 text-emerald-600" />
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
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0891B2] text-xs font-semibold">
            <Zap className="w-3.5 h-3.5 text-[#0891B2] animate-pulse" />
            <span>Encrypted Ledger Diagnostic: Route Null Pointer</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Clinical Record <span className="text-[#0891B2]">Not Located</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed">
            The requested medical endpoint or decentralized ledger block does not exist. It may have moved, expired, or been securely shredded in compliance with statutory DPDPA Section 12 protocols.
          </p>
        </motion.div>

        {/* Quick Portal Navigation Cards (Light Theme with Clean Elevation) */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 w-full max-w-3xl mt-8">
          
          {/* Card 1: Patient Vault */}
          <Link
            href="/patient/dashboard"
            className="group p-4.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-cyan-400 text-left transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#0891B2] group-hover:scale-110 transition-transform">
                <FileText className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-[#0891B2] group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-[#0891B2] transition-colors">
                Patient Vault
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Access your encrypted health locker, lab tests, and 14-digit ABHA card.
              </p>
            </div>
          </Link>

          {/* Card 2: Doctor Workstation */}
          <Link
            href="/doctor/dashboard"
            className="group p-4.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-400 text-left transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform">
                <Stethoscope className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-teal-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-700 transition-colors">
                Doctor Station
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Consented patient clinical directory, e-prescriptions, and AI Copilot.
              </p>
            </div>
          </Link>

          {/* Card 3: Emergency Trauma Pass */}
          <Link
            href="/patient/emergency"
            className="group p-4.5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 text-left transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3">
              <div className="w-10 h-10 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-rose-600 group-hover:translate-x-1 transition-all" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-700 transition-colors">
                Emergency Pass
              </h3>
              <p className="text-[11px] text-slate-500 mt-1 leading-snug">
                Paramedic break-glass resuscitation QR card for instant trauma triage.
              </p>
            </div>
          </Link>
        </div>

        {/* Primary Action Buttons (Matching Site Button Design) */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
          <Link
            href="/"
            className="px-6 py-3 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/20 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Homepage</span>
          </Link>

          <button
            type="button"
            onClick={handleRunTracer}
            disabled={isTracing}
            className="px-5 py-3 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs sm:text-sm shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Terminal className={`w-4 h-4 text-[#0891B2] ${isTracing ? "animate-spin" : ""}`} />
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
              className="w-full max-w-2xl mt-6 rounded-2xl bg-slate-950 border border-slate-800 p-4 text-left font-mono text-[11px] shadow-2xl relative overflow-hidden text-white"
            >
              <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800 text-slate-400">
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

      {/* ── Footer (Matches rest of site) ── */}
      <footer className="relative z-10 w-full bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4.5 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
          <div className="flex items-center gap-2 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
            <span>Core Grid Healthy: AWS Mumbai (ap-south-1)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-medium">
            <Link href="/privacy" className="hover:text-[#0891B2] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#0891B2] transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <span className="text-slate-400">DPDPA &amp; ABDM V3 Compliant</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
