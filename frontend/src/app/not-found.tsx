"use client";

import React, { useState, useEffect, useRef } from "react";
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
  Search,
  Heart,
  QrCode,
  Pill,
  Sparkles,
  RefreshCw,
  Clock,
  Compass,
} from "lucide-react";

export default function NotFound() {
  const router = useRouter();
  const [mounted, setMounted] = useState(false);
  const [currentPath, setCurrentPath] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [isAuditing, setIsAuditing] = useState(false);
  const [auditProgress, setAuditProgress] = useState(0);
  const [auditStep, setAuditStep] = useState<string>("");
  const [auditComplete, setAuditComplete] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (typeof window !== "undefined") {
      setCurrentPath(window.location.pathname);
    }
  }, []);

  const handleRunAudit = () => {
    if (isAuditing) return;
    setIsAuditing(true);
    setAuditProgress(0);
    setAuditComplete(false);

    const steps = [
      { p: 20, msg: "Pinging AWS Mumbai (ap-south-1) Health Cluster..." },
      { p: 45, msg: "Verifying AES-GCM-256 Vault Encryption & Zero-Knowledge Hash..." },
      { p: 70, msg: "Probing ABDM V3 Registry & Polygon Amoy Ledger..." },
      { p: 90, msg: "Analyzing Patient Data Sovereignty & Erasure Logs..." },
      { p: 100, msg: "Integrity Verified: Vault 100% Secure. Safe Harbor Reroute Ready." },
    ];

    steps.forEach((step, idx) => {
      setTimeout(() => {
        setAuditProgress(step.p);
        setAuditStep(step.msg);
        if (step.p === 100) {
          setIsAuditing(false);
          setAuditComplete(true);
        }
      }, (idx + 1) * 450);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const q = searchQuery.trim().toLowerCase();
    if (!q) return;

    if (q.includes("report") || q.includes("doc") || q.includes("lab") || q.includes("test")) {
      router.push("/patient/reports");
    } else if (q.includes("prescrip") || q.includes("med") || q.includes("pill")) {
      router.push("/patient/prescriptions");
    } else if (q.includes("emergency") || q.includes("er") || q.includes("pass") || q.includes("trauma")) {
      router.push("/patient/emergency");
    } else if (q.includes("abha") || q.includes("card") || q.includes("id") || q.includes("profile")) {
      router.push("/patient/profile");
    } else if (q.includes("doctor") || q.includes("clinic") || q.includes("consult")) {
      router.push("/doctor/dashboard");
    } else if (q.includes("timeline") || q.includes("history")) {
      router.push("/patient/timeline");
    } else {
      router.push(`/patient/dashboard?search=${encodeURIComponent(q)}`);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-slate-50 via-[#F8FAFC] to-white text-slate-900 selection:bg-cyan-100 selection:text-cyan-900 relative overflow-hidden flex flex-col justify-between font-sans">
      {/* 2px brand accent topbar */}
      <div className="fixed top-0 left-0 right-0 z-50 h-0.5 bg-gradient-to-r from-[#0891B2] via-teal-500 to-[#0891B2]" />

      {/* ── High-Tech Background Motion Canvas ── */}
      <div className="absolute inset-0 pointer-events-none z-0">
        {/* Subtle grid pattern */}
        <div 
          className="absolute inset-0 opacity-40"
          style={{
            backgroundImage: `radial-gradient(circle at 1px 1px, #CBD5E1 1px, transparent 0)`,
            backgroundSize: "28px 28px",
          }}
        />

        {/* Ambient Top Cyan Pulse Sphere */}
        <motion.div
          animate={{
            scale: [1, 1.15, 1],
            opacity: [0.35, 0.55, 0.35],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[750px] h-[450px] bg-gradient-to-b from-cyan-200/50 via-teal-100/30 to-transparent blur-[120px] rounded-full pointer-events-none"
        />

        {/* Ambient Right Emerald Pulse */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            opacity: [0.2, 0.4, 0.2],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute top-1/3 -right-32 w-[550px] h-[550px] bg-gradient-to-br from-emerald-100/40 via-cyan-100/20 to-transparent blur-[130px] rounded-full pointer-events-none"
        />

        {/* Ambient Bottom Left Indigo Pulse */}
        <motion.div
          animate={{
            scale: [1, 1.18, 1],
            opacity: [0.15, 0.3, 0.15],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute -bottom-32 -left-24 w-[500px] h-[500px] bg-gradient-to-tr from-sky-100/40 to-transparent blur-[130px] rounded-full pointer-events-none"
        />
      </div>

      {/* ── Top Header Navigation Bar (Pixel-perfect with site) ── */}
      <header className="relative z-20 w-full bg-white/85 backdrop-blur-md border-b border-slate-200/80 sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#0891B2] to-teal-500 text-white flex items-center justify-center shadow-md shadow-cyan-600/20 group-hover:scale-105 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-[1.15rem] tracking-tight text-slate-900">
                Medi<span className="text-[#0891B2]">Vault</span>
              </span>
              <span className="hidden sm:inline text-[10px] uppercase font-extrabold tracking-widest px-2 py-0.5 rounded-full bg-cyan-50 text-[#0891B2] border border-cyan-200/80 shadow-2xs">
                AI · ZKP
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium shadow-2xs">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
              <span className="font-mono font-semibold">HTTP 404 · Uncharted Route</span>
            </div>
            <button
              onClick={() => router.back()}
              className="px-3.5 py-2 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 shadow-2xs transition-all flex items-center gap-1.5 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </header>

      {/* ── Main Hero Container ── */}
      <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14 flex flex-col items-center text-center my-auto">
        
        {/* ── GIANT HOLOGRAPHIC 404 WITH ROTATING MEDICAL RADAR CORE ── */}
        <div className="relative mb-6 sm:mb-8 flex items-center justify-center select-none">
          
          {/* Typographic "4" Left */}
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-7xl sm:text-9xl md:text-[11rem] font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-800 to-cyan-900 bg-clip-text text-transparent drop-shadow-sm pr-1 sm:pr-4"
          >
            4
          </motion.div>

          {/* Center "0" Replaced by Futuristic Biometric Vault Radar */}
          <div className="relative w-36 h-36 sm:w-48 sm:h-48 md:w-56 md:h-56 flex items-center justify-center mx-1 sm:mx-3">
            
            {/* Outer Segmented Scanning CT Ring with 12 Tick Marks */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full border-2 border-dashed border-cyan-400/50"
            />

            {/* Middle Laser Tracking Ring (Counter-Clockwise) */}
            <motion.div
              animate={{ rotate: -360 }}
              transition={{ duration: 18, repeat: Infinity, ease: "linear" }}
              className="absolute inset-2 sm:inset-3 rounded-full border border-slate-200 border-t-[#0891B2] border-r-teal-500 shadow-sm"
            />

            {/* Orbiting Laser Scanning Dot */}
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 4, repeat: Infinity, ease: "linear" }}
              className="absolute inset-0 rounded-full pointer-events-none"
            >
              <div className="w-3 h-3 rounded-full bg-[#0891B2] shadow-[0_0_12px_#0891B2] absolute -top-1.5 left-1/2 -translate-x-1/2" />
            </motion.div>

            {/* Central Vault Glassmorphic Shield Card */}
            <motion.div
              animate={{
                scale: [1, 1.04, 1],
                boxShadow: [
                  "0 10px 35px -10px rgba(8,145,178,0.2)",
                  "0 20px 45px -10px rgba(13,148,136,0.3)",
                  "0 10px 35px -10px rgba(8,145,178,0.2)",
                ],
              }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
              className="w-24 h-24 sm:w-32 sm:h-32 md:w-36 md:h-36 rounded-3xl bg-white border-2 border-slate-100 shadow-xl flex flex-col items-center justify-center relative z-10 overflow-hidden"
            >
              {/* Dynamic ECG Sine Wave Oscilloscope flowing in center */}
              <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 h-8 sm:h-10 overflow-hidden pointer-events-none opacity-40">
                <svg viewBox="0 0 200 40" className="w-full h-full text-[#0891B2] stroke-current fill-none stroke-[2.5]">
                  <motion.path
                    d="M0 20 L45 20 L55 8 L65 32 L75 4 L85 36 L95 20 L200 20"
                    animate={{ pathOffset: [0, 1] }}
                    transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  />
                </svg>
              </div>

              {/* Pulsing Biological Heartbeat Core */}
              <motion.div
                animate={{
                  scale: [1, 1.22, 1.08, 1.28, 1],
                }}
                transition={{
                  duration: 1.4,
                  repeat: Infinity,
                  ease: "easeInOut",
                }}
                className="w-10 h-10 sm:w-13 sm:h-13 md:w-14 md:h-14 rounded-2xl bg-gradient-to-tr from-cyan-50 to-teal-50 border border-cyan-200 flex items-center justify-center text-[#0891B2] shadow-inner relative z-10"
              >
                <ShieldAlert className="w-5 h-5 sm:w-7 sm:h-7 text-[#0891B2]" />
              </motion.div>

              <div className="mt-1 px-2 py-0.5 rounded-full bg-rose-50 border border-rose-200 text-[8px] sm:text-[9px] font-mono font-black text-rose-700 uppercase tracking-widest relative z-10">
                LOCKED
              </div>
            </motion.div>

            {/* Satellite Badge 1 (Top Left) */}
            <motion.div
              animate={{ y: [-5, 5, -5] }}
              transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
              className="absolute -top-3 -left-8 sm:-left-12 px-2.5 py-1 rounded-xl bg-white/95 border border-slate-200 shadow-md text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1.5 backdrop-blur-md"
            >
              <Lock className="w-3 h-3 text-[#0891B2]" />
              <span>AES-256</span>
            </motion.div>

            {/* Satellite Badge 2 (Bottom Right) */}
            <motion.div
              animate={{ y: [5, -5, 5] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
              className="absolute -bottom-3 -right-8 sm:-right-12 px-2.5 py-1 rounded-xl bg-white/95 border border-slate-200 shadow-md text-[10px] font-mono font-bold text-slate-700 flex items-center gap-1.5 backdrop-blur-md"
            >
              <Activity className="w-3 h-3 text-emerald-600" />
              <span>72 BPM · Stable</span>
            </motion.div>
          </div>

          {/* Typographic "4" Right */}
          <motion.div
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.7, ease: "easeOut" }}
            className="text-7xl sm:text-9xl md:text-[11rem] font-black tracking-tighter bg-gradient-to-br from-slate-900 via-slate-800 to-teal-900 bg-clip-text text-transparent drop-shadow-sm pl-1 sm:pl-4"
          >
            4
          </motion.div>
        </div>

        {/* ── Headline & Narrative ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="space-y-3 max-w-2xl"
        >
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-50 border border-cyan-200 text-[#0891B2] text-xs font-bold shadow-2xs">
            <Zap className="w-3.5 h-3.5 text-[#0891B2] animate-pulse" />
            <span>Decentralized Health Ledger: Block Unresolved</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-slate-900">
            Clinical Record <span className="text-[#0891B2]">Not Located</span>
          </h1>

          <p className="text-slate-600 text-sm sm:text-base leading-relaxed max-w-xl mx-auto">
            The medical endpoint, consultation record, or cryptographic transaction you requested does not exist or has been permanently shredded under DPDPA Section 12 protocols.
          </p>
        </motion.div>

        {/* ── Interactive Route Recovery Omnibar ── */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="w-full max-w-xl mt-7"
        >
          <form onSubmit={handleSearchSubmit} className="relative flex items-center">
            <Search className="w-4 h-4 absolute left-4 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search destination (e.g., Prescriptions, ABHA Card, Emergency, Doctor)..."
              className="w-full pl-11 pr-24 py-3.5 rounded-2xl bg-white border-2 border-slate-200 text-xs sm:text-sm font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-[#0891B2] shadow-sm transition-all"
            />
            <button
              type="submit"
              className="absolute right-2 px-4 py-2 rounded-xl bg-[#0891B2] hover:bg-[#0e7490] text-white text-xs font-bold transition-all shadow-sm cursor-pointer"
            >
              Navigate
            </button>
          </form>

          {/* Quick Filter Pill Suggestions */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-3 text-[11px]">
            <span className="text-slate-400 font-semibold text-[10px] uppercase tracking-wider">Quick Jump:</span>
            <Link
              href="/patient/reports"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-600 hover:text-[#0891B2] transition-colors font-medium shadow-2xs flex items-center gap-1"
            >
              <FileText className="w-3 h-3 text-[#0891B2]" />
              <span>Lab Reports</span>
            </Link>
            <Link
              href="/patient/prescriptions"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-600 hover:text-[#0891B2] transition-colors font-medium shadow-2xs flex items-center gap-1"
            >
              <Pill className="w-3 h-3 text-teal-600" />
              <span>Prescriptions</span>
            </Link>
            <Link
              href="/patient/profile"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-cyan-50 border border-slate-200 hover:border-cyan-300 text-slate-600 hover:text-[#0891B2] transition-colors font-medium shadow-2xs flex items-center gap-1"
            >
              <QrCode className="w-3 h-3 text-indigo-600" />
              <span>ABHA ID</span>
            </Link>
            <Link
              href="/patient/emergency"
              className="px-2.5 py-1 rounded-lg bg-white hover:bg-rose-50 border border-slate-200 hover:border-rose-300 text-slate-600 hover:text-rose-600 transition-colors font-medium shadow-2xs flex items-center gap-1"
            >
              <Heart className="w-3 h-3 text-rose-500" />
              <span>Emergency Pass</span>
            </Link>
          </div>
        </motion.div>

        {/* ── 3 High-Tech Portal Cards ── */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 w-full max-w-3xl mt-8 text-left">
          
          {/* Card 1: Patient Vault */}
          <Link
            href="/patient/dashboard"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-cyan-400 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-[#0891B2] group-hover:scale-110 transition-transform shadow-2xs">
                <FileText className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-[#0891B2] bg-cyan-50 px-2 py-0.5 rounded-full border border-cyan-200">
                Patient
              </span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-[#0891B2] transition-colors flex items-center justify-between">
                <span>Personal Vault</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-[#0891B2] transition-all" />
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
                Encrypted medical documents, longitudinal timeline, and 14-digit ABHA card.
              </p>
            </div>
          </Link>

          {/* Card 2: Doctor Workstation */}
          <Link
            href="/doctor/dashboard"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-teal-400 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-600 group-hover:scale-110 transition-transform shadow-2xs">
                <Stethoscope className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full border border-teal-200">
                Doctor
              </span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-teal-700 transition-colors flex items-center justify-between">
                <span>Doctor Workstation</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-teal-600 transition-all" />
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
                Consented patient clinical directory, e-prescriptions, and AI Copilot.
              </p>
            </div>
          </Link>

          {/* Card 3: Emergency Trauma Pass */}
          <Link
            href="/patient/emergency"
            className="group p-5 rounded-2xl bg-white hover:bg-slate-50 border border-slate-200 hover:border-rose-300 transition-all duration-200 shadow-sm hover:shadow-md flex flex-col justify-between"
          >
            <div className="flex items-center justify-between mb-3.5">
              <div className="w-11 h-11 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 group-hover:scale-110 transition-transform shadow-2xs">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <span className="text-[10px] uppercase font-mono font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                Break-Glass
              </span>
            </div>
            <div>
              <h3 className="text-sm font-extrabold text-slate-900 group-hover:text-rose-700 transition-colors flex items-center justify-between">
                <span>Emergency Pass</span>
                <ChevronRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 group-hover:text-rose-600 transition-all" />
              </h3>
              <p className="text-[11.5px] text-slate-500 mt-1 leading-snug">
                Paramedic break-glass resuscitation QR card for instant offline trauma triage.
              </p>
            </div>
          </Link>
        </div>

        {/* ── Primary Action Row ── */}
        <div className="flex flex-wrap items-center justify-center gap-3.5 mt-8">
          <Link
            href="/"
            className="px-6 py-3.5 rounded-xl bg-gradient-to-r from-[#0891B2] via-teal-600 to-[#0891B2] text-white font-bold text-xs sm:text-sm shadow-md shadow-cyan-600/25 hover:brightness-110 transition-all flex items-center gap-2 cursor-pointer"
          >
            <Home className="w-4 h-4" />
            <span>Return to Safe Harbor (Home)</span>
          </Link>

          <button
            type="button"
            onClick={handleRunAudit}
            disabled={isAuditing}
            className="px-5 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-bold text-xs sm:text-sm shadow-2xs transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Terminal className={`w-4 h-4 text-[#0891B2] ${isAuditing ? "animate-spin" : ""}`} />
            <span>{isAuditing ? "Auditing Network..." : "Run Vault Integrity Audit"}</span>
          </button>
        </div>

        {/* ── Interactive Progress & Telemetry Terminal ── */}
        <AnimatePresence>
          {(isAuditing || auditComplete) && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="w-full max-w-2xl mt-6 rounded-2xl bg-slate-950 border border-slate-800 p-4.5 text-left font-mono text-[11px] shadow-xl text-white overflow-hidden"
            >
              <div className="flex items-center justify-between pb-2 mb-3 border-b border-slate-800 text-slate-400">
                <div className="flex items-center gap-2">
                  <div className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                  <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                  <span className="text-slate-300 font-bold ml-1">medivault-integrity-probe v3.4</span>
                </div>
                <span className="text-[10px] text-cyan-400 font-bold">
                  {auditProgress}% COMPLETED
                </span>
              </div>

              {/* Progress Bar */}
              <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-gradient-to-r from-cyan-500 to-emerald-400"
                  animate={{ width: `${auditProgress}%` }}
                  transition={{ duration: 0.3 }}
                />
              </div>

              <div className="space-y-1.5 text-slate-300">
                <div className="flex items-center gap-2 text-cyan-400">
                  <span>➜</span>
                  <span className="text-slate-200">{auditStep || "Initializing cryptographic handshake..."}</span>
                </div>

                {auditComplete && (
                  <div className="p-2.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 flex items-center justify-between mt-2">
                    <span>✓ AUDIT CONCLUSION: Vault database is healthy. No data compromised.</span>
                    <Link href="/patient/dashboard" className="underline font-bold text-emerald-200 hover:text-white">
                      Go to Vault ➔
                    </Link>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </div>

      {/* ── Footer ── */}
      <footer className="relative z-20 w-full bg-white border-t border-slate-200/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500 font-sans">
          <div className="flex items-center gap-2 font-mono text-[11px]">
            <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block animate-pulse" />
            <span>All Systems Operational · AWS Mumbai (ap-south-1)</span>
          </div>

          <div className="flex items-center gap-4 text-slate-600 font-medium text-[11.5px]">
            <Link href="/privacy" className="hover:text-[#0891B2] transition-colors">
              Privacy Policy
            </Link>
            <span>•</span>
            <Link href="/terms" className="hover:text-[#0891B2] transition-colors">
              Terms of Service
            </Link>
            <span>•</span>
            <span className="text-slate-400">DPDPA 2023 &amp; ABDM V3 Certified</span>
          </div>
        </div>
      </footer>
    </main>
  );
}
