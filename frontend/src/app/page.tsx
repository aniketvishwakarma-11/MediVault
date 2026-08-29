"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import { QRCodeSVG } from "qrcode.react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CounterStats from "./components/CounterStats";
import {
  ShieldCheck,
  Brain,
  Lock,
  QrCode,
  FileText,
  Activity,
  KeyRound,
  ArrowRight,
  CheckCircle2,
  Database,
  Bot,
  Stethoscope,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  Fingerprint,
  PhoneCall,
  Heart,
  Layers,
  Zap,
  Shield,
  RotateCw,
  Sparkles,
  Calendar,
  Building2,
  UserCheck,
  FileCheck2,
  Upload,
  Camera,
  ExternalLink,
  Clock,
  Droplets,
  Copy,
  Check,
  Smartphone,
  CheckCircle,
  FileSpreadsheet
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Animation Variants
// ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

// ─────────────────────────────────────────────────────────────────
// 1. Interactive Demo Deck: Government ABHA ID & DigiLocker
// ─────────────────────────────────────────────────────────────────
function AbhaDemoCard() {
  const [flipped, setFlipped] = useState(false);
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText("91258386716789");
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-4 select-none">
      {/* 3D Card Container */}
      <div 
        onClick={() => setFlipped(!flipped)}
        className="cursor-pointer [perspective:1000px] w-full"
      >
        <div className={`relative w-full rounded-2xl transition-transform duration-500 [transform-style:preserve-3d] shadow-lg border border-slate-700/60 ${flipped ? "[transform:rotateY(180deg)]" : ""}`}>
          
          {/* ── CARD FRONT ── */}
          <div className={`w-full bg-gradient-to-br from-slate-900 via-slate-850 to-slate-950 text-white p-5 rounded-2xl [backface-visibility:hidden] ${flipped ? "hidden" : "block"}`}>
            {/* Header Ribbon */}
            <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3.5">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 flex items-center justify-center text-xs font-black">
                  🇮🇳
                </div>
                <div>
                  <div className="text-[9px] uppercase font-bold tracking-widest text-amber-400 leading-none">
                    Government of India
                  </div>
                  <div className="text-[11px] font-extrabold tracking-wide text-white mt-0.5">
                    National Health Authority (NHA)
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/30 text-[9px] text-emerald-300 font-bold">
                <ShieldCheck className="w-3 h-3" />
                <span>ABDM Verified</span>
              </div>
            </div>

            {/* Profile & QR Row */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0 flex-1">
                <div className="relative shrink-0">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=160&auto=format&fit=crop&q=80"
                    alt="Citizen Photo"
                    className="w-14 h-16 rounded-xl object-cover border border-white/20 bg-slate-800"
                  />
                  <span className="absolute -bottom-1 -right-1 bg-amber-400 text-slate-950 text-[8px] font-black px-1 rounded shadow-xs">
                    KYC
                  </span>
                </div>
                <div className="min-w-0 flex-1 space-y-0.5 text-slate-300">
                  <div className="text-sm font-bold text-white truncate">Aniket Vishwakarma</div>
                  <div className="text-[10px] text-slate-400">DOB: <span className="text-white font-medium">14/05/1998</span></div>
                  <div className="text-[10px] text-slate-400">Gender: <span className="text-white font-medium">MALE</span> · State: <span className="text-white font-medium">MH</span></div>
                </div>
              </div>

              {/* Verified ABDM QR */}
              <div className="p-1.5 rounded-xl bg-white text-slate-950 shrink-0 shadow-xs">
                <QRCodeSVG value="https://abdm.gov.in/profile/91258386716789" size={62} level="M" />
              </div>
            </div>

            {/* 14-Digit ABHA ID Box */}
            <div className="mt-3.5 p-2 rounded-xl bg-white/5 border border-white/10 flex items-center justify-between">
              <div>
                <div className="text-[8px] uppercase font-bold tracking-widest text-slate-400">ABHA Health Number</div>
                <div className="text-xs sm:text-sm font-mono font-bold text-amber-300 tracking-wider">
                  91-2583-8671-6789
                </div>
              </div>
              <button
                type="button"
                onClick={handleCopy}
                className="p-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
                title="Copy ABHA Number"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>

            {/* Footer Handle */}
            <div className="mt-2.5 flex items-center justify-between text-[10px] text-slate-400 pt-2 border-t border-white/5">
              <div className="truncate">
                Address: <span className="font-bold text-emerald-400 font-mono">aniketvis675.7167@abdm</span>
              </div>
              <div className="text-[9px] text-slate-500 italic shrink-0">Tap to flip ↻</div>
            </div>
          </div>

          {/* ── CARD BACK (Unmirrored & Clean) ── */}
          <div className={`w-full bg-gradient-to-br from-slate-950 via-slate-900 to-slate-900 text-white p-5 rounded-2xl space-y-3.5 [backface-visibility:hidden] [transform:rotateY(180deg)] ${!flipped ? "hidden" : "block"}`}>
            <div className="flex items-center justify-between border-b border-white/10 pb-2">
              <div className="text-xs font-bold text-slate-200">Emergency &amp; Helpline Information</div>
              <div className="text-[9px] text-amber-400 font-bold">Ayushman Bharat</div>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[9px] text-slate-400">National Health Helpline</div>
                <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                  <PhoneCall className="w-3 h-3 shrink-0" />
                  <span>14555 / 1800-111-565</span>
                </div>
              </div>
              <div className="p-2.5 rounded-xl bg-white/5 border border-white/10">
                <div className="text-[9px] text-slate-400">Aadhaar Status</div>
                <div className="text-xs font-bold text-slate-200 mt-0.5 font-mono">
                  XXXX-XXXX-9024 🔒
                </div>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] text-slate-400 leading-relaxed">
              <span className="font-bold text-slate-200">Legal Notice:</span> Issued under Ayushman Bharat Digital Mission (ABDM). Authorizes consent-based hospital record sharing nationwide.
            </div>

            <div className="flex items-center justify-between pt-1 border-t border-white/10 text-[9px] text-slate-500">
              <span>National Health Authority (NHA)</span>
              <span className="text-slate-400 italic">Tap to flip back ↻</span>
            </div>
          </div>

        </div>
      </div>

      {/* DigiLocker Auto-Sync Badge */}
      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
          <span className="text-emerald-900 font-bold text-[11px]">DigiLocker Health Sync Active</span>
        </div>
        <span className="text-[10px] font-mono font-extrabold text-emerald-800 bg-white px-2 py-0.5 rounded border border-emerald-200">
          PM-JAY ₹5L Card &amp; CoWIN Linked
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 2. Interactive Demo Deck: Golden Hour Emergency Trauma Pass
// ─────────────────────────────────────────────────────────────────
function EmergencyPassDemo() {
  return (
    <div className="space-y-3.5 select-none animate-in fade-in duration-200">
      {/* Wallet Pass Container */}
      <div className="rounded-2xl border-2 border-slate-200 bg-white p-4.5 shadow-sm space-y-3">
        {/* Pass Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-rose-600 flex items-center justify-center text-white font-black text-xs">
              ✚
            </div>
            <div>
              <div className="text-[10px] font-black text-rose-700 uppercase tracking-wider leading-none">
                MediVault Emergency Pass
              </div>
              <div className="text-[8px] text-slate-500 font-mono mt-0.5">GOLDEN HOUR TRAUMA CARD</div>
            </div>
          </div>
          <span className="px-2.5 py-1 rounded-md bg-rose-100 text-rose-800 font-black text-xs tracking-wider flex items-center gap-1 border border-rose-200">
            <Droplets className="w-3.5 h-3.5 fill-rose-600 text-rose-600" />
            O-POSITIVE (O+)
          </span>
        </div>

        {/* Govt ABDM Badge */}
        <div className="flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-emerald-50 border border-emerald-200 text-[10px] text-emerald-900 font-bold">
          <div className="flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>GOVERNMENT VERIFIED CITIZEN</span>
          </div>
          <span className="font-mono text-[9px] text-emerald-800 font-extrabold">91-2583-8671-6789</span>
        </div>

        {/* Details & QR Code */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex-1 min-w-0 space-y-2 text-xs">
            <div>
              <div className="text-[9px] text-slate-500 uppercase font-bold tracking-wider">Patient Name</div>
              <div className="text-sm font-extrabold text-slate-900 truncate">Aniket Vishwakarma</div>
            </div>

            {/* Critical Allergy Alert */}
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 space-y-0.5">
              <div className="text-[9px] font-extrabold text-rose-800 uppercase flex items-center gap-1">
                <AlertTriangle className="w-3 h-3 text-rose-600" />
                Critical Allergy: Penicillin
              </div>
              <div className="text-[10px] text-rose-700">Severe Anaphylaxis risk · NKDA sulfa</div>
            </div>

            <div className="text-[10px] text-slate-600">
              Chronic: <strong className="text-slate-900">Mild Asthma</strong> (Inhaler Rx)
            </div>
          </div>

          {/* Dynamic Scannable Trauma QR */}
          <div className="shrink-0 flex flex-col items-center justify-center p-1.5 bg-white rounded-xl shadow-xs border border-slate-200">
            <QRCodeSVG value="https://medivault.app/emergency/public-triage-pass?v=3" size={76} level="H" />
            <span className="text-[7px] font-mono text-slate-600 font-bold mt-1 uppercase">SCAN OFFLINE</span>
          </div>
        </div>

        {/* Emergency ICE Contact Footer */}
        <div className="border-t border-slate-100 pt-2 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-600 text-[11px]">
            <PhoneCall className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>ICE Contact: <strong className="text-slate-900">Jordan M.</strong> (+91 98765 43210)</span>
          </div>
          <span className="text-[9px] font-mono text-cyan-700 font-bold bg-cyan-50 px-1.5 py-0.5 rounded border border-cyan-200">
            FIDO2 Verified
          </span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 3. Interactive Demo Deck: Multimodal Clinical AI & Rx OCR
// ─────────────────────────────────────────────────────────────────
function ClinicalAiDemo() {
  return (
    <div className="space-y-3.5 select-none animate-in fade-in duration-200">
      {/* File Header */}
      <div className="flex items-center justify-between p-2.5 rounded-xl bg-slate-900 text-white text-xs">
        <div className="flex items-center gap-2 truncate">
          <Camera className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
          <span className="truncate font-mono text-slate-200 text-[11px]">Dr_Prescription_Lab_Metabolic.pdf</span>
        </div>
        <span className="text-[9px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 font-mono shrink-0">
          AES-256 IPFS
        </span>
      </div>

      {/* Extracted Biomarker Grid */}
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 space-y-0.5">
          <span className="text-[9px] text-rose-700 font-bold uppercase block">Fasting Glucose</span>
          <div className="text-sm font-extrabold text-rose-950 font-mono">142 mg/dL</div>
          <span className="text-[9px] text-rose-600 font-bold">HIGH ⚠️ (&gt;100)</span>
        </div>

        <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 space-y-0.5">
          <span className="text-[9px] text-amber-700 font-bold uppercase block">HbA1c Level</span>
          <div className="text-sm font-extrabold text-amber-950 font-mono">6.8%</div>
          <span className="text-[9px] text-amber-700 font-bold">PRE-DIABETIC</span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-0.5">
          <span className="text-[9px] text-emerald-700 font-bold uppercase block">Cholesterol</span>
          <div className="text-sm font-extrabold text-emerald-950 font-mono">185 mg/dL</div>
          <span className="text-[9px] text-emerald-600 font-bold">NORMAL (Optimal)</span>
        </div>
      </div>

      {/* Multimodal AI Clinical Summary */}
      <div className="p-3 rounded-xl bg-cyan-50/80 border border-cyan-200 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-cyan-900">
          <span className="flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-cyan-700" />
            <span>Gemini 2.5 Flash Clinical Guidance</span>
          </span>
          <span className="text-[9px] bg-white text-cyan-800 px-1.5 py-0.5 rounded border border-cyan-200 font-mono font-extrabold">
            OCR Confidence: 99.4%
          </span>
        </div>
        <p className="text-[11px] text-slate-700 leading-relaxed">
          &quot;Fasting blood sugar elevated by 18% over prior quarter. Detected handwritten Metformin 500mg (1-0-1). No contraindications with your asthma inhaler.&quot;
        </p>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// 4. Interactive Demo Deck: Doctor Workstation & Consent Gateway
// ─────────────────────────────────────────────────────────────────
function DoctorWorkstationDemo() {
  return (
    <div className="space-y-3.5 select-none animate-in fade-in duration-200">
      <div className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-sky-100 text-sky-700 font-bold flex items-center justify-center text-xs">
            AV
          </div>
          <div>
            <div className="font-bold text-xs text-slate-900">Aniket Vishwakarma</div>
            <div className="text-[10px] text-slate-500 font-mono">Vault ID: #mv-7167 · ABHA Linked</div>
          </div>
        </div>
        <span className="text-[10px] font-mono font-bold bg-amber-50 text-amber-800 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-1">
          <Clock className="w-3 h-3 text-amber-600" />
          <span>Expires in 14m 32s</span>
        </span>
      </div>

      <div className="space-y-1.5 text-xs">
        <div className="text-[10px] uppercase font-bold tracking-wider text-slate-500">Active Access Permissions</div>
        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
          <span className="text-slate-700 font-medium text-[11px]">Full Clinical Vault &amp; Lab History</span>
          <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 cursor-pointer hover:bg-rose-100">
            Revoke Access
          </span>
        </div>
      </div>

      <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-xs flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span className="font-bold text-emerald-950 text-[11px]">Rx Drug Interaction Safe</span>
        </div>
        <span className="text-[10px] font-mono text-emerald-800 font-bold">0 Contraindications</span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FAQ Item Component
// ─────────────────────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-200 py-4.5">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group focus:outline-none"
      >
        <span className="font-bold text-sm sm:text-base text-slate-900 group-hover:text-cyan-700 transition-colors">
          {question}
        </span>
        <span className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-cyan-50 text-slate-500 group-hover:text-cyan-700 transition-colors shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <p className="text-xs sm:text-sm text-slate-600 mt-2.5 leading-relaxed animate-in fade-in duration-200 max-w-3xl">
          {answer}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Homepage Component
// ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [activeDeckTab, setActiveDeckTab] = useState<"abha" | "emergency" | "ai" | "doctor">("abha");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar />
      <main className="flex-1 pt-16">

        {/* ══════════════════════════════════════════════════════
            HERO SECTION — Enterprise Clinical Precision
        ══════════════════════════════════════════════════════ */}
        <section className="bg-white border-b border-slate-200 pt-12 pb-16 sm:pt-16 sm:pb-24 relative overflow-hidden">
          {/* Subtle Grid Background */}
          <div
            className="absolute inset-0 pointer-events-none opacity-[0.35]"
            style={{
              backgroundImage: "radial-gradient(circle, #94a3b8 1px, transparent 1px)",
              backgroundSize: "28px 28px",
            }}
          />

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-14 items-center">
              
              {/* Left Column: Core Value Proposition */}
              <motion.div
                className="lg:col-span-6 space-y-6 text-center lg:text-left"
                initial="hidden"
                animate="visible"
                variants={stagger}
              >
                {/* Official Govt Tag */}
                <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold uppercase tracking-wider">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span>Ayushman Bharat (ABDM) &amp; DigiLocker Integrated</span>
                </motion.div>

                {/* Main Headline */}
                <motion.h1
                  variants={fadeUp}
                  className="text-3xl sm:text-5xl lg:text-[3.25rem] font-black text-slate-900 leading-[1.12] tracking-tight"
                >
                  Your Complete Health History.{" "}
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-cyan-700 via-sky-600 to-emerald-600">
                    Government Verified.
                  </span>{" "}
                  Always In Your Pocket.
                </motion.h1>

                {/* Subtitle */}
                <motion.p
                  variants={fadeUp}
                  className="text-sm sm:text-base text-slate-600 max-w-xl mx-auto lg:mx-0 leading-relaxed font-normal"
                >
                  MediVault unifies your 14-digit ABHA ID, DigiLocker health records, AI handwritten prescription scanning, and offline golden-hour emergency passes into a client-side encrypted, zero-trust health vault.
                </motion.p>

                {/* High-Intent CTAs */}
                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/auth"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-sm transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
                  >
                    <span>Create Free Health Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/doctor/auth/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-xl bg-white border border-slate-200 hover:border-slate-300 text-slate-800 font-semibold text-xs sm:text-sm shadow-2xs hover:bg-slate-50 transition-colors"
                  >
                    <Stethoscope className="w-4 h-4 text-cyan-600" />
                    <span>Doctor Terminal Login</span>
                  </Link>
                </motion.div>

                {/* Trust Micro-Signals */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2 text-[11px] text-slate-500 font-medium"
                >
                  {[
                    "ABDM Milestone 1 (M1)",
                    "DigiLocker Health Sync",
                    "FIDO2 Biometric Passkeys",
                    "Client-Side AES-256",
                  ].map((signal) => (
                    <span key={signal} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <span>{signal}</span>
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right Column: Live Interactive Product Deck */}
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.15 }}
              >
                <div className="bg-white rounded-3xl border border-slate-200 shadow-md p-4 sm:p-6 space-y-4">
                  {/* Deck Tabs */}
                  <div className="grid grid-cols-4 gap-1 bg-slate-100 p-1 rounded-xl border border-slate-200 text-[11px]">
                    {[
                      { id: "abha", label: "ABHA Card", icon: ShieldCheck },
                      { id: "emergency", label: "Trauma Pass", icon: QrCode },
                      { id: "ai", label: "AI Copilot", icon: Bot },
                      { id: "doctor", label: "Doctor EMR", icon: Stethoscope },
                    ].map((tab) => {
                      const Icon = tab.icon;
                      const active = activeDeckTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveDeckTab(tab.id as any)}
                          className={`flex items-center justify-center gap-1.5 py-2 px-1 rounded-lg font-bold transition-all cursor-pointer ${
                            active
                              ? "bg-white text-slate-900 shadow-xs border border-slate-200/80"
                              : "text-slate-500 hover:text-slate-900"
                          }`}
                        >
                          <Icon className={`w-3.5 h-3.5 ${active ? "text-cyan-600" : "text-slate-400"}`} />
                          <span className="hidden sm:inline">{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Active Simulation */}
                  <div className="min-h-[290px] flex flex-col justify-center">
                    {activeDeckTab === "abha" && <AbhaDemoCard />}
                    {activeDeckTab === "emergency" && <EmergencyPassDemo />}
                    {activeDeckTab === "ai" && <ClinicalAiDemo />}
                    {activeDeckTab === "doctor" && <DoctorWorkstationDemo />}
                  </div>

                  {/* Deck Footer Note */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3 h-3 text-amber-500" />
                      <span>Live product simulation</span>
                    </span>
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                      Sandbox Active
                    </span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            GOVERNMENT & COMPLIANCE TRUST RIBBON
        ══════════════════════════════════════════════════════ */}
        <section className="bg-slate-50 border-b border-slate-200 py-4.5">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-slate-600 text-xs font-semibold">
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <span className="text-sm">🇮🇳</span>
                <span>ABDM Milestone 1 (M1) Ready</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>DigiLocker / MeriPehchan Partner</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <Lock className="w-3.5 h-3.5 text-cyan-600" />
                <span>AES-256 GCM + SHA-256 Vault</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <Fingerprint className="w-3.5 h-3.5 text-indigo-600" />
                <span>FIDO2 / WebAuthn Biometrics</span>
              </div>
              <div className="flex items-center gap-1.5 px-3 py-1 bg-white rounded-lg border border-slate-200 shadow-2xs">
                <Layers className="w-3.5 h-3.5 text-amber-600" />
                <span>FHIR R4 &amp; HIPAA Standard</span>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            STATS COUNTER
        ══════════════════════════════════════════════════════ */}
        <section className="bg-white border-b border-slate-200 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CounterStats />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            "HOW MEDIVAULT WORKS" — 4-Step Patient Passport Journey
        ══════════════════════════════════════════════════════ */}
        <section className="py-20 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2.5">
              <span className="inline-flex items-center gap-1 px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-cyan-800 text-[11px] font-bold uppercase tracking-wider">
                The Patient Passport
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                How MediVault Protects Your Health Journey
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                From 30-second government ABHA verification to offline trauma care — four simple steps to complete medical sovereignty.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
              {[
                {
                  step: "01",
                  title: "Link Government ID",
                  desc: "Create or link your 14-digit ABHA in 30 seconds. Pull your official Ayushman PM-JAY ₹5L cover and CoWIN certificates via DigiLocker.",
                  icon: ShieldCheck,
                  badge: "ABDM + DigiLocker",
                },
                {
                  step: "02",
                  title: "Scan & Auto-Index",
                  desc: "Use the smart edge camera scanner to photograph messy handwritten prescriptions and lab reports. Perspective auto-corrects instantly.",
                  icon: Camera,
                  badge: "Edge Scanner",
                },
                {
                  step: "03",
                  title: "Clinical AI Extraction",
                  desc: "Multimodal Gemini AI parses medication dosages, compares lab biomarkers to clinical reference ranges, and alerts on drug interactions.",
                  icon: Brain,
                  badge: "Gemini 2.5 Flash",
                },
                {
                  step: "04",
                  title: "Golden Hour Emergency",
                  desc: "First responders scan your offline QR code to see critical allergies and blood type. Grant doctors time-bound 15-min access tokens.",
                  icon: QrCode,
                  badge: "Trauma Triage",
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <div
                    key={item.step}
                    className="bg-white rounded-2xl border border-slate-200 p-6 space-y-4 shadow-2xs hover:shadow-sm transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-2xl font-black font-mono text-slate-300">{item.step}</span>
                      <span className="text-[9px] font-bold text-cyan-800 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200">
                        {item.badge}
                      </span>
                    </div>

                    <div className="w-10 h-10 rounded-xl bg-slate-100 text-cyan-700 flex items-center justify-center border border-slate-200">
                      <Icon className="w-5 h-5" />
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="font-bold text-base text-slate-900">{item.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CORE CAPABILITIES — 6 Precision Modules
        ══════════════════════════════════════════════════════ */}
        <section id="features" className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-wider">
                Enterprise Clinical Features
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Built for Precision Healthcare
              </h2>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Purpose-built architecture adhering to Indian national health standards (ABDM) and global cryptographic privacy guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[
                {
                  icon: ShieldCheck,
                  title: "Official 14-Digit ABHA ID & NHA Card",
                  desc: "Instant enrollment via Aadhaar OTP or Mobile OTP. Generates official 3D flippable health card with scannable ABDM QR code and printable wallet PDF.",
                  badge: "ABDM Milestone 1",
                },
                {
                  icon: Building2,
                  title: "DigiLocker & MeriPehchan Sync",
                  desc: "2-Step authenticated citizen sync imports official Ayushman Bharat PM-JAY ₹5L cover and CoWIN immunization certificates directly into your vault.",
                  badge: "National Registry",
                },
                {
                  icon: QrCode,
                  title: "Golden Hour Paramedic Pass",
                  desc: "Offline-scannable QR pass providing ambulance medics and emergency rooms instant access to blood group, severe allergies, and emergency contacts.",
                  badge: "Emergency Care",
                },
                {
                  icon: Brain,
                  title: "Multimodal Prescription OCR",
                  desc: "AI reading engine transcribes messy physician handwriting, normalizes medications to clinical databases, and highlights abnormal blood test results.",
                  badge: "Clinical AI",
                },
                {
                  icon: Fingerprint,
                  title: "FIDO2 WebAuthn Passkeys",
                  desc: "Log in seamlessly using FaceID, TouchID, or Windows Hello. Zero passwords to remember and completely immune to phishing attacks.",
                  badge: "Zero-Trust Auth",
                },
                {
                  icon: KeyRound,
                  title: "Granular Doctor Access Delegation",
                  desc: "Authorize treating doctors for 15 minutes, 1 hour, or 30 days. Revoke access instantly with an immutable cryptographic audit trail.",
                  badge: "Consent Control",
                },
              ].map((feat) => {
                const Icon = feat.icon;
                return (
                  <div
                    key={feat.title}
                    className="p-6 rounded-2xl border border-slate-200 bg-[#F8FAFC] hover:bg-white hover:border-slate-300 transition-all space-y-3.5"
                  >
                    <div className="flex items-center justify-between">
                      <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-cyan-700 shadow-2xs">
                        <Icon className="w-5 h-5" />
                      </div>
                      <span className="text-[9px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                        {feat.badge}
                      </span>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-base text-slate-900">{feat.title}</h3>
                      <p className="text-xs text-slate-600 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CRYPTOGRAPHIC SECURITY & UNDER THE HOOD
        ══════════════════════════════════════════════════════ */}
        <section className="py-20 bg-[#070D12] text-white border-b border-slate-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14 space-y-2.5">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-slate-800 border border-slate-700 text-cyan-400 text-[10px] font-bold uppercase tracking-widest">
                <Lock className="w-3 h-3" />
                Zero-Knowledge Cryptography
              </span>
              <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
                Architected for Absolute Patient Privacy
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Even MediVault operators cannot read your clinical records. Your health data belongs exclusively to you.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-cyan-950/80 border border-cyan-800/40 text-cyan-400 flex items-center justify-center">
                  <Lock className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Client-Side AES-256 GCM</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Documents are encrypted in your browser before transmission. Decryption keys are derived from your biometric passkey and never stored on servers.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-950/80 border border-emerald-800/40 text-emerald-400 flex items-center justify-center">
                  <Fingerprint className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Hardware-Backed FIDO2</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Private keys are locked inside your phone&apos;s Secure Enclave or PC TPM. Protects your medical identity from credential theft, SIM swapping, and phishing.
                </p>
              </div>

              <div className="p-6 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-950/80 border border-indigo-800/40 text-indigo-400 flex items-center justify-center">
                  <Database className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white">Indian Data Localization</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Strictly complies with the Indian Digital Personal Data Protection (DPDP) Act and NHA guidelines. All databases hosted exclusively in India (AWS Mumbai).
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FREQUENTLY ASKED QUESTIONS (FAQ)
        ══════════════════════════════════════════════════════ */}
        <section className="py-20 bg-white border-b border-slate-200">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
            <div className="text-center space-y-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-800 bg-cyan-50 px-2.5 py-1 rounded border border-cyan-200">
                Patient &amp; Clinical Questions
              </span>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900">
                Frequently Asked Questions
              </h2>
            </div>

            <div className="divide-y divide-slate-200">
              <FAQItem
                question="Is linking an Aadhaar or ABHA ID compulsory to use MediVault?"
                answer="No, government ID integration is 100% voluntary. You can use MediVault as a standalone private health locker without providing Aadhaar or ABHA. However, linking an ABHA ID allows you to fetch official lab reports from AIIMS, Apollo, Max, and sync your Ayushman PM-JAY card in one click."
              />
              <FAQItem
                question="How do paramedics access my emergency pass if my phone is locked?"
                answer="MediVault generates an offline-compatible physical and digital pass with an ABDM-standard emergency QR code. You can print the wallet card or save it as a lock-screen wallpaper widget. When first responders scan it, they see only golden-hour critical data (blood group, critical allergies, and emergency contacts)."
              />
              <FAQItem
                question="Can insurance companies or employers see my health records?"
                answer="Never. MediVault uses zero-knowledge encryption. No third party—including insurance firms, employers, or even MediVault system administrators—can view your medical documents without your explicit, time-bound consent."
              />
              <FAQItem
                question="How accurately does the AI read messy handwritten prescriptions?"
                answer="Our multimodal vision model (Gemini 2.5 Flash) is tuned for clinical handwriting, abbreviations (OD, BD, TDS), and medical nomenclature. It extracts dosages and cross-checks them against a clinical drug database with over 99% accuracy."
              />
              <FAQItem
                question="Is MediVault free for individual patients?"
                answer="Yes. Individual patient accounts with unlimited cloud storage, ABHA health card issuance, DigiLocker sync, and the emergency trauma pass are completely free."
              />
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            CLOSING CALL TO ACTION
        ══════════════════════════════════════════════════════ */}
        <section className="py-20 bg-gradient-to-b from-slate-50 to-white text-center">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
            <h2 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
              Ready to Own Your Complete Health Record?
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed">
              Join thousands of citizens and physicians taking control of their medical records with official government ABHA integration and zero-knowledge encryption.
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
              <Link
                href="/auth"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md transition-all hover:scale-[1.01] active:scale-[0.99] cursor-pointer"
              >
                Create Free Health Vault
              </Link>
              <Link
                href="/doctor/auth/login"
                className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white border border-slate-300 hover:border-slate-400 text-slate-800 font-semibold text-xs sm:text-sm hover:bg-slate-50 transition-colors cursor-pointer"
              >
                Doctor Portal Access
              </Link>
            </div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
