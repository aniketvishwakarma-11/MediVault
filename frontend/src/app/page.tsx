"use client";

import React, { useState } from "react";
import Link from "next/link";
import { motion, type Variants } from "motion/react";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import CounterStats from "./components/CounterStats";
import { Badge } from "@/app/components/ui/badge";
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
  FileSpreadsheet,
  Fingerprint,
  PhoneCall,
  Heart,
  Layers,
  Zap,
  Shield,
} from "lucide-react";

// ─────────────────────────────────────────────────────────────────
// Animation Variants (typed to satisfy motion/react strict types)
// ─────────────────────────────────────────────────────────────────
const fadeUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.45 } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.5 } },
};

// ─────────────────────────────────────────────────────────────────
// Interactive Persona Demos
// ─────────────────────────────────────────────────────────────────
function PatientVaultDemo() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#0891B2] text-white font-bold flex items-center justify-center text-sm">
            AM
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-slate-900 text-sm">Alex Morgan</span>
              <span className="text-[10px] font-mono bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">
                MV-9401
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Blood Group: O+ · Age: 28 · BMI: 22.1</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-emerald-200 bg-emerald-50 text-emerald-800 gap-1">
          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> ZKP VERIFIED
        </Badge>
      </div>

      <div className="grid grid-cols-3 gap-2 text-xs">
        {[
          { label: "Pulse Rate", value: "72", unit: "BPM" },
          { label: "Blood Pressure", value: "118/76", unit: "mmHg" },
          { label: "SpO2 Oxygen", value: "99%", unit: "Optimal", ok: true },
        ].map((v) => (
          <div key={v.label} className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 space-y-0.5">
            <span className="text-[10px] text-slate-500 uppercase font-semibold tracking-wide block">{v.label}</span>
            <div className="font-bold text-slate-900 font-mono tabular-nums">
              {v.value}{" "}
              <span className={`text-[10px] font-normal ${v.ok ? "text-emerald-600" : "text-slate-400"}`}>{v.unit}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="p-3.5 rounded-xl bg-cyan-50 border border-cyan-100 space-y-1.5">
        <div className="flex items-center justify-between text-[11px] font-bold text-[#0891B2]">
          <span className="flex items-center gap-1.5"><Bot className="w-3.5 h-3.5" /> AI Health Copilot</span>
          <span className="text-[9px] bg-white text-[#0891B2] px-2 py-0.5 rounded border border-cyan-200 font-mono">Sample</span>
        </div>
        <p className="text-xs text-slate-700 leading-relaxed">
          &quot;Lipid panel shows 14% improvement in HDL cholesterol over 6 months. Blood glucose within normal fasting thresholds.&quot;
        </p>
      </div>

      <div className="p-3 rounded-lg bg-slate-900 text-slate-200 text-xs font-mono flex items-center justify-between">
        <div className="flex items-center gap-2 truncate">
          <Lock className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
          <span className="truncate text-slate-300">Annual_Metabolic_Panel.pdf</span>
        </div>
        <span className="text-[10px] bg-slate-800 text-emerald-400 px-2 py-0.5 rounded border border-slate-700 shrink-0">
          AES-256 IPFS
        </span>
      </div>
    </div>
  );
}

function DoctorWorkstationDemo() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-cyan-400 flex items-center justify-center border border-slate-700">
            <Stethoscope className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-slate-900 text-sm">Dr. Eleanor Vance, MD</span>
              <Badge variant="outline" className="text-[10px] font-mono border-emerald-200 bg-emerald-50 text-emerald-700">VERIFIED</Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono">Internal Medicine · Metropolitan Health</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-cyan-200 bg-cyan-50 text-[#0891B2]">
          CONSENT #8f42
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider font-mono flex justify-between">
          <span>Active Diagnoses</span><span>Sample</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800">Essential HTN</span>
            <Badge variant="outline" className="text-[9px] font-mono border-amber-200 bg-amber-50 text-amber-800">Stage 1</Badge>
          </div>
          <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between">
            <span className="font-bold text-slate-800">Pre-diabetes</span>
            <Badge variant="outline" className="text-[9px] font-mono border-emerald-200 bg-emerald-50 text-emerald-700">HbA1c 5.6%</Badge>
          </div>
        </div>
      </div>

      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-xs">
        <div className="flex items-center justify-between font-bold text-slate-900">
          <span className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#0891B2]" /> STAT Prescription
          </span>
          <span className="text-[10px] font-mono text-slate-400">Rx-DEMO-9041</span>
        </div>
        <div className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between">
          <div>
            <div className="font-bold text-slate-900">Telmisartan 40mg</div>
            <div className="text-[10px] text-slate-500">1 Tablet · Once daily · 30 Days</div>
          </div>
          <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Sign Ready
          </span>
        </div>
      </div>
    </div>
  );
}

function ParamedicTerminalDemo() {
  return (
    <div className="space-y-4 animate-in fade-in duration-300">
      <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-rose-600 text-white flex items-center justify-center">
            <QrCode className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-heading font-bold text-slate-900 text-sm">Break-Glass Session</span>
              <Badge variant="outline" className="text-[10px] font-mono border-rose-300 bg-rose-100 text-rose-800 font-bold">
                TRAUMA LVL 1
              </Badge>
            </div>
            <p className="text-[11px] text-slate-500 font-mono tabular-nums">Remaining: 00:58:24 · Audited On-Chain</p>
          </div>
        </div>
        <Badge variant="outline" className="text-[10px] font-mono border-rose-200 bg-rose-50 text-rose-800">
          STAT OVERRIDE
        </Badge>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
          <span className="text-[10px] font-bold text-rose-800 uppercase tracking-wider font-mono flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> Critical Allergies
          </span>
          <div className="font-extrabold text-sm text-rose-950">Penicillin (Severe)</div>
          <p className="text-[10px] text-rose-700">Anaphylaxis risk · NKDA sulfa</p>
        </div>
        <div className="p-3 rounded-xl bg-slate-900 text-white border border-slate-800 space-y-1">
          <span className="text-[10px] font-bold text-rose-400 uppercase tracking-wider font-mono">
            Transfusion Match
          </span>
          <div className="text-xl font-black font-mono tabular-nums">O-Positive</div>
          <p className="text-[10px] text-slate-400">Rh Factor: Positive</p>
        </div>
      </div>

      <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-xs">
        <div>
          <div className="font-bold text-emerald-950">Emergency Contact: Jordan M.</div>
          <div className="text-[10px] text-emerald-700 font-mono tabular-nums">+1 (555) 019-2834</div>
        </div>
        <span className="px-3 py-1.5 rounded-lg bg-emerald-600 text-white font-bold text-[10px] flex items-center gap-1 min-h-[36px]">
          <PhoneCall className="w-3 h-3" /> Quick Dial
        </span>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// FAQ Item
// ─────────────────────────────────────────────────────────────────
function FAQItem({ question, answer }: { question: string; answer: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 py-5">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between text-left gap-4 cursor-pointer group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded-md"
      >
        <span className="font-heading font-semibold text-sm sm:text-base text-slate-900 group-hover:text-[#0891B2] transition-colors duration-150">
          {question}
        </span>
        <span className="p-1.5 rounded-lg bg-slate-100 group-hover:bg-cyan-50 text-slate-400 group-hover:text-[#0891B2] transition-colors shrink-0">
          {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </span>
      </button>
      {open && (
        <p className="text-sm text-slate-600 mt-3 leading-relaxed animate-in fade-in duration-200 max-w-3xl">
          {answer}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────
// Main Homepage
// ─────────────────────────────────────────────────────────────────
export default function Home() {
  const [personaTab, setPersonaTab] = useState<"patient" | "doctor" | "paramedic">("patient");

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-body">
      <Navbar />
      <main className="flex-1 pt-16">

        {/* ══════════════════════════════════════════════════════
            HERO — Clean dual-column with live deck
        ══════════════════════════════════════════════════════ */}
        <section className="bg-white border-b border-slate-200 pt-16 pb-20 sm:pt-20 sm:pb-28 relative overflow-hidden">
          {/* Subtle dot grid background */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: "radial-gradient(circle, #CBD5E1 1px, transparent 1px)",
              backgroundSize: "28px 28px",
              opacity: 0.35,
            }}
          />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-16 items-center">

              {/* Left — Value prop */}
              <motion.div
                className="lg:col-span-6 space-y-7 text-center lg:text-left"
                initial="hidden"
                animate="visible"
                variants={stagger}
              >
                <motion.div variants={fadeUp}>
                  <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-md bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-bold uppercase tracking-widest">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                    Zero-Knowledge Health Operating System
                  </span>
                </motion.div>

                <motion.h1
                  variants={fadeUp}
                  className="font-heading text-4xl sm:text-5xl lg:text-[3.25rem] font-black text-slate-900 leading-[1.1] tracking-tight"
                >
                  Own Your Health Records.{" "}
                  <span className="text-[#0891B2]">Control Who Sees Them.</span>
                </motion.h1>

                <motion.p
                  variants={fadeUp}
                  className="text-base sm:text-lg text-slate-500 max-w-xl mx-auto lg:mx-0 leading-relaxed"
                >
                  MediVault unifies fragmented medical records across hospitals into a continuous encrypted timeline — with cryptographic consent and AI-powered clinical summaries.
                </motion.p>

                <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-1">
                  <Link
                    href="/auth"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-7 py-3.5 rounded-lg bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-sm shadow-sm transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
                  >
                    <span>Create Free Health Vault</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                  <Link
                    href="/doctor/auth/login"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-lg bg-white border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50 hover:border-slate-300 transition-colors min-h-[44px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
                  >
                    <Stethoscope className="w-4 h-4 text-[#0891B2]" />
                    <span>Doctor Portal</span>
                  </Link>
                </motion.div>

                {/* Trust micro-signals */}
                <motion.div
                  variants={fadeUp}
                  className="flex flex-wrap items-center justify-center lg:justify-start gap-x-5 gap-y-2 pt-2 text-xs text-slate-500 font-medium"
                >
                  {[
                    "HIPAA & FHIR Standard",
                    "AES-256 & ZKP Encryption",
                    "Emergency QR Pass Included",
                    "Free to Start",
                  ].map((t) => (
                    <span key={t} className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                      {t}
                    </span>
                  ))}
                </motion.div>
              </motion.div>

              {/* Right — Interactive Persona Deck */}
              <motion.div
                className="lg:col-span-6"
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.2, ease: "easeOut" }}
              >
                <div className="bg-white rounded-2xl border border-slate-200 shadow-lg p-5 sm:p-6 space-y-5">
                  {/* Persona Tab Bar */}
                  <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
                    {(["patient", "doctor", "paramedic"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setPersonaTab(tab)}
                        className={`flex-1 py-2 px-2 rounded-md text-[11px] font-bold transition-all cursor-pointer min-h-[36px] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] ${
                          personaTab === tab
                            ? tab === "paramedic"
                              ? "bg-white text-rose-700 shadow-xs"
                              : "bg-white text-[#0891B2] shadow-xs"
                            : "text-slate-500 hover:text-slate-800"
                        }`}
                      >
                        {tab === "patient" ? "Patient Vault" : tab === "doctor" ? "Doctor EMR" : "Paramedic Pass"}
                      </button>
                    ))}
                  </div>

                  {/* Demo Content */}
                  {personaTab === "patient" && <PatientVaultDemo />}
                  {personaTab === "doctor" && <DoctorWorkstationDemo />}
                  {personaTab === "paramedic" && <ParamedicTerminalDemo />}

                  {/* Card footer */}
                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400 font-mono">
                    <span>Live interactive preview</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                      System online
                    </span>
                  </div>
                </div>
              </motion.div>

            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            COMPLIANCE TRUST BAR
        ══════════════════════════════════════════════════════ */}
        <section className="bg-white border-b border-slate-200 py-4 sm:py-5">
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-center gap-2 sm:gap-0 sm:divide-x sm:divide-slate-200">
              {[
                { icon: Shield, label: "HIPAA Compliant" },
                { icon: Layers, label: "FHIR R4 Interoperable" },
                { icon: Lock, label: "AES-256 Encrypted" },
                { icon: Fingerprint, label: "ZKP On-Chain Proof" },
                { icon: CheckCircle2, label: "WCAG 2.1 AAA" },
              ].map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 px-3 sm:px-5 py-1.5 sm:py-2 text-slate-600 sm:text-slate-500 text-xs font-medium bg-slate-50 sm:bg-transparent rounded-lg sm:rounded-none border sm:border-0 border-slate-200/60">
                  <Icon className="w-4 h-4 text-[#0891B2] shrink-0" />
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            STATS — CounterStats
        ══════════════════════════════════════════════════════ */}
        <section className="bg-[#F8FAFC] border-b border-slate-200 py-14">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CounterStats />
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FEATURES — 3-Col Capability Grid
        ══════════════════════════════════════════════════════ */}
        <section id="features" className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-2xl mx-auto mb-14 space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-bold uppercase tracking-widest">
                Engineered for Healthcare
              </motion.span>
              <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Enterprise Clinical Intelligence
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-500 text-base leading-relaxed">
                Built on zero-knowledge cryptography, decentralized storage, and multimodal clinical AI — purpose-built for patient sovereignty.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-px bg-slate-200 rounded-2xl overflow-hidden border border-slate-200"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {[
                {
                  icon: ShieldCheck,
                  title: "Zero-Knowledge Consent Proofs",
                  desc: "Verify health criteria on-chain — vaccinations, blood type, clearance — without revealing your full medical history to anyone.",
                  emergency: false,
                },
                {
                  icon: Brain,
                  title: "Multimodal AI OCR & Analysis",
                  desc: "Gemini AI extracts biomarkers, abnormal reference ranges, and diagnoses from lab PDFs — with source-cited clinical summaries.",
                  emergency: false,
                },
                {
                  icon: QrCode,
                  title: "Optical Paramedic Emergency Pass",
                  desc: "Dynamic QR emergency passes let first responders instantly access critical allergies, blood group, and emergency contacts.",
                  emergency: true,
                },
                {
                  icon: KeyRound,
                  title: "Granular Doctor Access Controls",
                  desc: "Grant time-limited access scopes — 15 min, 1 hour, 30 days. Revoke instantly on-chain with zero residual permissions.",
                  emergency: false,
                },
                {
                  icon: Database,
                  title: "Decentralized IPFS Vault Storage",
                  desc: "Client-side encrypted files across distributed IPFS nodes. Zero single points of failure. Complete data sovereignty.",
                  emergency: false,
                },
                {
                  icon: Activity,
                  title: "Longitudinal Clinical Timeline",
                  desc: "Connects visits, labs, imaging, and prescriptions across all providers into one coherent, queryable chronological record.",
                  emergency: false,
                },
              ].map(({ icon: Icon, title, desc, emergency }) => (
                <motion.div
                  key={title}
                  variants={fadeUp}
                  className="bg-white p-7 space-y-4 hover:bg-slate-50 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center border ${
                    emergency
                      ? "bg-rose-50 text-rose-600 border-rose-100"
                      : "bg-slate-50 text-[#0891B2] border-slate-200"
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-heading text-[0.9375rem] font-bold text-slate-900 mb-2">{title}</h3>
                    <p className="text-slate-500 text-sm leading-relaxed">{desc}</p>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            WHO IT'S FOR — 3-Persona Audience Cards
        ══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-2xl mx-auto mb-14 space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-700 text-[11px] font-bold uppercase tracking-widest">
                Built for Every Role
              </motion.span>
              <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                One Platform. Three Critical Workflows.
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-500 text-base leading-relaxed">
                Whether you're managing your own health, treating patients, or responding to emergencies — MediVault is purpose-built for your workflow.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 md:grid-cols-3 gap-6"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {/* Patient Card */}
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#0891B2] p-7 space-y-5 hover:shadow-sm transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-cyan-50 text-[#0891B2] flex items-center justify-center border border-cyan-100">
                  <Heart className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#0891B2] uppercase tracking-widest mb-1">For Patients</p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Own Your Health History</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    All your records from every hospital, in one encrypted vault. Upload, organise, and share on your terms — with a complete AI-analysed clinical timeline.
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {["Encrypted vault for all records", "AI health copilot summaries", "Emergency QR pass always ready"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/auth"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0891B2] hover:text-[#0e7490] transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded"
                >
                  Create Patient Vault <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>

              {/* Doctor Card */}
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-[#0891B2] p-7 space-y-5 hover:shadow-sm transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-slate-50 text-[#0891B2] flex items-center justify-center border border-slate-200">
                  <Stethoscope className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-[#0891B2] uppercase tracking-widest mb-1">For Physicians</p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Clinical AI at Point of Care</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Access patient records only with explicit cryptographic consent. AI-generated clinical summaries and longitudinal timelines — right at the point of care.
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {["Consent-gated patient record access", "AI-generated clinical summaries", "Digital prescription generation"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/doctor/auth/login"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#0891B2] hover:text-[#0e7490] transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2] rounded"
                >
                  Access Doctor Portal <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>

              {/* Paramedic Card */}
              <motion.div
                variants={fadeUp}
                className="bg-white rounded-2xl border border-slate-200 border-l-4 border-l-rose-500 p-7 space-y-5 hover:shadow-sm transition-shadow"
              >
                <div className="w-11 h-11 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center border border-rose-100">
                  <Zap className="w-5 h-5" />
                </div>
                <div>
                  <p className="text-[11px] font-bold text-rose-600 uppercase tracking-widest mb-1">For First Responders</p>
                  <h3 className="font-heading text-lg font-bold text-slate-900 mb-2">Instant Critical Access</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">
                    Scan the patient's emergency QR code to instantly access critical allergies, blood type, medications, and emergency contacts — even offline.
                  </p>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  {["QR scan — no login required", "Critical allergies & blood group", "Audit-logged emergency session"].map((f) => (
                    <li key={f} className="flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#22C55E] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  href="/patient/emergency"
                  className="inline-flex items-center gap-1.5 text-sm font-semibold text-rose-600 hover:text-rose-700 transition-colors group focus:outline-none focus-visible:ring-2 focus-visible:ring-rose-500 rounded"
                >
                  View Emergency Pass <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                </Link>
              </motion.div>
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            HOW IT WORKS — 4-Step Clinical Journey
        ══════════════════════════════════════════════════════ */}
        <section id="how-it-works" className="py-24 bg-white border-b border-slate-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center max-w-2xl mx-auto mb-16 space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-100 border border-slate-200 text-slate-600 text-[11px] font-bold uppercase tracking-widest">
                Seamless Patient Journey
              </motion.span>
              <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
                Up and Running in 4 Steps
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-500 text-base leading-relaxed">
                Designed for clinical speed while enforcing strict cryptographic and biometric safeguards at every step.
              </motion.p>
            </motion.div>

            <motion.div
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 relative"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-60px" }}
              variants={stagger}
            >
              {/* Connector line — desktop only */}
              <div className="hidden lg:block absolute top-[2.75rem] left-[12.5%] right-[12.5%] h-px bg-slate-200 z-0" />

              {[
                { step: "01", title: "Create Vault Identity", desc: "Register with email. Encryption keys are generated locally — never leave your device.", icon: ShieldCheck },
                { step: "02", title: "Upload Medical Records", desc: "Drag & drop lab tests, prescriptions, imaging. Files are client-encrypted and pinned to IPFS.", icon: FileText },
                { step: "03", title: "AI Synthesis & Indexing", desc: "AI extracts biomarkers, diagnoses, and populates your complete longitudinal clinical timeline.", icon: Brain },
                { step: "04", title: "Share on Your Terms", desc: "Grant physicians time-limited access or present your emergency QR pass to first responders.", icon: KeyRound },
              ].map((item, i) => (
                <motion.div key={item.step} variants={fadeUp} className="relative z-10">
                  <div className="bg-white rounded-xl border border-slate-200 p-6 space-y-4 h-full border-t-2 border-t-[#0891B2] hover:shadow-sm transition-shadow">
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-3xl font-black text-slate-200 tabular-nums">{item.step}</span>
                      <div className="w-9 h-9 rounded-lg bg-slate-50 text-[#0891B2] flex items-center justify-center border border-slate-200">
                        <item.icon className="w-4 h-4" />
                      </div>
                    </div>
                    <div>
                      <h3 className="font-heading font-bold text-slate-900 text-[0.9375rem] mb-1.5">{item.title}</h3>
                      <p className="text-xs text-slate-500 leading-relaxed">{item.desc}</p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FAQ
        ══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-[#F8FAFC] border-b border-slate-200">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
            <motion.div
              className="text-center mb-12 space-y-3"
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, margin: "-80px" }}
              variants={stagger}
            >
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-cyan-50 border border-cyan-200 text-[#0891B2] text-[11px] font-bold uppercase tracking-widest">
                Frequently Asked Questions
              </motion.span>
              <motion.h2 variants={fadeUp} className="font-heading text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Everything You Need to Know
              </motion.h2>
            </motion.div>

            <motion.div
              className="bg-white rounded-2xl border border-slate-200 shadow-xs px-6 sm:px-8 divide-y divide-slate-100"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4 }}
            >
              <FAQItem
                question="How does MediVault protect my sensitive medical data?"
                answer="MediVault uses end-to-end client-side encryption (AES-GCM-256). Your medical files are encrypted before leaving your browser and stored across distributed IPFS nodes. Only you and explicitly authorized doctors hold the decryption keys — MediVault itself never has access."
              />
              <FAQItem
                question="How does the Emergency Medical Pass work during trauma situations?"
                answer="Patients can generate a digital or physical Emergency Pass QR code. In an emergency, verified paramedics scan the pass to perform a statutory 'Break-Glass' override, revealing critical allergies, blood type, and emergency contacts in a time-limited, fully audited session."
              />
              <FAQItem
                question="How does the AI Clinical Copilot extract and verify data?"
                answer="When you upload medical reports or lab tests, Gemini AI performs OCR extraction and clinical entity resolution. Every extracted metric is cross-referenced with normal laboratory reference ranges and linked directly to the original source document."
              />
              <FAQItem
                question="Can doctors access my records without my explicit permission?"
                answer="No. Doctors must submit an access request with a clinical justification and duration. You receive an instant notification to approve or deny. Emergency overrides are restricted to verified ER personnel and generate an immutable on-chain audit log."
              />
              <FAQItem
                question="Is MediVault free to use?"
                answer="Yes — creating a patient vault, uploading records, and generating an emergency QR pass are all free. Premium tiers unlock advanced AI analysis, extended history, and multi-provider data federation."
              />
              <FAQItem
                question="What happens if I lose access to my account?"
                answer="Your encryption keys are derived from your credentials and stored in a secure recovery mechanism. Because files are on decentralized IPFS, they remain accessible as long as you hold your recovery key — MediVault going offline does not delete your data."
              />
            </motion.div>
          </div>
        </section>

        {/* ══════════════════════════════════════════════════════
            FINAL CTA BANNER
        ══════════════════════════════════════════════════════ */}
        <section className="py-24 bg-slate-950 text-white relative overflow-hidden border-t border-slate-800">
          {/* Subtle teal glow — not a full orb, just a gradient accent */}
          <div className="absolute inset-0 pointer-events-none bg-gradient-to-br from-[#0891B2]/8 via-transparent to-transparent" />
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-7 relative z-10">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true }}
              variants={stagger}
              className="space-y-5"
            >
              <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-white/8 border border-white/10 text-slate-300 text-[11px] font-bold uppercase tracking-widest">
                <span className="w-1.5 h-1.5 rounded-full bg-[#22C55E] animate-pulse" />
                Start in Under 2 Minutes
              </motion.span>
              <motion.h2 variants={fadeUp} className="font-heading text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white">
                Take Complete Ownership of{" "}
                <span className="text-[#22D3EE]">Your Health Future</span>
              </motion.h2>
              <motion.p variants={fadeUp} className="text-slate-400 text-base max-w-2xl mx-auto leading-relaxed">
                Join thousands of patients who have unified their records, authorized their physicians, and taken back control with zero-knowledge encrypted health identity.
              </motion.p>
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
                <Link
                  href="/auth"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-sm transition-colors min-h-[44px] flex items-center justify-center gap-2 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#22C55E]"
                >
                  Create Free Patient Account
                  <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/doctor/auth/login"
                  className="w-full sm:w-auto px-8 py-3.5 rounded-lg bg-white/8 border border-white/12 hover:bg-white/12 text-slate-200 font-semibold text-sm transition-colors min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                >
                  Access Doctor Workstation
                </Link>
              </motion.div>
            </motion.div>

            {/* Bottom trust strip */}
            <motion.div
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.4 }}
              className="pt-6 border-t border-white/8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[11px] text-slate-500"
            >
              {["No credit card required", "HIPAA & FHIR Compliant", "AES-256 Encryption", "Cancel anytime"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-slate-600" />
                  {t}
                </span>
              ))}
            </motion.div>
          </div>
        </section>

      </main>
      <Footer />
    </div>
  );
}
