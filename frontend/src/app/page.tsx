"use client";

import React, { useState } from "react";
import Link from "next/link";
import Navbar from "./components/Navbar";
import Footer from "./components/Footer";
import AnimatedSection from "./components/AnimatedSection";
import CounterStats from "./components/CounterStats";
import {
  ShieldCheck,
  Brain,
  Lock,
  QrCode,
  FileText,
  Activity,
  KeyRound,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  Database,
  Heart,
  Bot,
  Stethoscope
} from "lucide-react";

export default function Home() {
  const [activeTab, setActiveTab] = useState<"patient" | "doctor" | "paramedic">("patient");

  return (
    <div className="min-h-screen bg-[#F0FDFA] text-[#0F172A] flex flex-col font-body selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar />

      <main className="flex-1 pt-20">
        {/* HERO SECTION */}
        <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28 overflow-hidden">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              
              {/* Hero Left Column */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-cyan-50 border border-cyan-200 text-[#0891B2] text-xs font-bold uppercase tracking-wider shadow-xs animate-in fade-in slide-in-from-bottom-3 duration-500">
                  <Sparkles className="w-4 h-4 text-[#0891B2] animate-pulse" />
                  <span>Next-Gen Digital Health Identity Platform</span>
                </div>

                <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-[#0F172A] leading-[1.15] tracking-tight">
                  Your Health Data. <br />
                  <span className="text-[#0891B2]">Zero-Knowledge Secure.</span> <br />
                  AI-Powered.
                </h1>

                <p className="text-lg sm:text-xl text-[#475569] max-w-2xl mx-auto lg:mx-0 leading-relaxed font-normal">
                  MediVault unifies medical records across hospitals, empowers patients with full consent ownership, and delivers instant AI health insights backed by cryptographic proof.
                </p>

                {/* Hero CTA Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3 pt-2">
                  <Link
                    href="/auth"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2.5 px-7 py-3.5 rounded-2xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-sm shadow-lg shadow-emerald-600/20 hover:shadow-xl transition-all duration-200 min-h-[44px]"
                  >
                    <span>Get Started Free</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>

                  <Link
                    href="/patient/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white border border-slate-200 text-[#0F172A] font-bold text-sm shadow-xs hover:bg-slate-50 hover:border-[#0891B2]/40 transition-all duration-200 min-h-[44px]"
                  >
                    <ShieldCheck className="w-4 h-4 text-[#0891B2]" />
                    <span>Patient Portal</span>
                  </Link>

                  <Link
                    href="/doctor/dashboard"
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-[#071415] hover:bg-[#0c2224] text-cyan-300 border border-cyan-800 font-bold text-sm shadow-md transition-all duration-200 min-h-[44px]"
                  >
                    <Stethoscope className="w-4 h-4 text-cyan-400" />
                    <span>Doctor Portal</span>
                  </Link>
                </div>

                {/* Micro Badges */}
                <div className="pt-6 border-t border-slate-200/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-[#475569] font-medium">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span>HIPAA & FHIR Standard</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span>Zero-Knowledge Encryption</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-[#22C55E]" />
                    <span>Paramedic Emergency QR</span>
                  </div>
                </div>
              </div>

              {/* Hero Right Interactive Visual Card */}
              <div className="lg:col-span-5">
                <div className="relative mx-auto max-w-md lg:max-w-none">
                  {/* Floating Metric Pill Top Right */}
                  <div className="absolute -top-6 -right-6 z-20 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-3 animate-bounce" style={{ animationDuration: '4s' }}>
                    <div className="p-2.5 rounded-xl bg-emerald-50 text-[#22C55E]">
                      <Heart className="w-5 h-5 fill-[#22C55E]" />
                    </div>
                    <div>
                      <div className="text-xs text-[#475569] font-medium">Vitals Sync</div>
                      <div className="text-sm font-bold text-[#0F172A]">72 BPM • Optimal</div>
                    </div>
                  </div>

                  {/* Main Card Wrapper */}
                  <div className="bg-white/95 backdrop-blur-xl p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-2xl space-y-6 relative overflow-hidden">
                    <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-cyan-100 text-[#0891B2] font-bold flex items-center justify-center text-sm border border-cyan-200">
                          JD
                        </div>
                        <div>
                          <h3 className="font-heading font-bold text-[#0F172A] text-base leading-snug">John Doe</h3>
                          <p className="text-xs text-[#475569] font-mono">MediVault ID: #MV-894021</p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-[#065F46] text-xs font-bold border border-emerald-200">
                        ZKP Verified
                      </span>
                    </div>

                    {/* Quick Stats Grid inside Mock */}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-xs text-[#475569] flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span>Medical Records</span>
                        </div>
                        <div className="text-lg font-bold text-[#0F172A]">18 Reports</div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                        <div className="text-xs text-[#475569] flex items-center gap-1">
                          <KeyRound className="w-3.5 h-3.5 text-[#0891B2]" />
                          <span>Active Consents</span>
                        </div>
                        <div className="text-lg font-bold text-[#0F172A]">3 Doctors</div>
                      </div>
                    </div>

                    {/* AI Diagnostic Snippet */}
                    <div className="p-4 rounded-2xl bg-gradient-to-br from-cyan-50 to-teal-50/60 border border-cyan-100 space-y-2">
                      <div className="flex items-center justify-between text-xs font-bold text-[#0891B2]">
                        <span className="flex items-center gap-1.5">
                          <Bot className="w-4 h-4 text-[#0891B2]" />
                          AI Health Copilot
                        </span>
                        <span className="text-[10px] text-[#0891B2] bg-cyan-100/80 px-2 py-0.5 rounded-md font-semibold">Instant Analysis</span>
                      </div>
                      <p className="text-xs text-[#0F172A] leading-relaxed font-medium">
                        &quot;Latest lipid panel shows a 14% improvement in HDL. All biomarker levels match healthy ranges for your age group.&quot;
                      </p>
                    </div>

                    {/* IPFS Hash Tag */}
                    <div className="p-3 rounded-xl bg-[#071415] text-slate-300 text-xs font-mono flex items-center justify-between">
                      <div className="flex items-center gap-2 truncate">
                        <Lock className="w-3.5 h-3.5 text-[#22C55E] shrink-0" />
                        <span className="truncate">QmX9z7a...b489k2v</span>
                      </div>
                      <span className="text-[10px] font-mono bg-slate-800 text-slate-300 px-2 py-0.5 rounded shrink-0">IPFS</span>
                    </div>
                  </div>

                  {/* Floating Metric Pill Bottom Left */}
                  <div className="absolute -bottom-6 -left-6 z-20 bg-white p-3.5 rounded-2xl shadow-xl border border-slate-200/80 flex items-center gap-3">
                    <div className="p-2.5 rounded-xl bg-cyan-50 text-[#0891B2]">
                      <QrCode className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs text-[#475569] font-medium">Emergency Pass</div>
                      <div className="text-sm font-bold text-[#0F172A]">Scan Ready</div>
                    </div>
                  </div>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ================= STATS COUNTER BAR ================= */}
        <section className="bg-white border-y border-slate-200/80 py-12">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <CounterStats />
          </div>
        </section>

        {/* ================= CORE FEATURES GRID ================= */}
        <section id="features" className="py-24 bg-[#F0FDFA]">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="section-badge">
                <Sparkles className="w-3.5 h-3.5" /> Core Capabilities
              </span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                Everything You Need For Next-Generation Health Identity
              </h2>
              <p className="text-[#475569] text-base sm:text-lg max-w-2xl mx-auto leading-relaxed">
                Built on modern cryptographic standards, zero-knowledge proofs, and clinical AI model pipelines.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <AnimatedSection delay={100} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <ShieldCheck className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">ZKP Privacy Control</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Share verified health status (e.g. vaccination, blood group) without revealing your underlying sensitive medical history.
                </p>
              </AnimatedSection>

              {/* Feature 2 */}
              <AnimatedSection delay={200} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-teal-50 text-[#0891B2] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Brain className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">AI Diagnostic Insights</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Automated OCR extraction, lab value interpretation, and intelligent health summaries explained in plain patient language.
                </p>
              </AnimatedSection>

              {/* Feature 3 */}
              <AnimatedSection delay={300} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <QrCode className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">Emergency Paramedic Pass</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Instantly accessible QR code for first responders to view critical allergies, blood group, and emergency contacts in critical times.
                </p>
              </AnimatedSection>

              {/* Feature 4 */}
              <AnimatedSection delay={400} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#22C55E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <KeyRound className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">Granular Access Grants</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Grant doctors or lab centers temporary access to specific documents. Revoke access with a single click at any time.
                </p>
              </AnimatedSection>

              {/* Feature 5 */}
              <AnimatedSection delay={500} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-cyan-50 text-[#0891B2] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Database className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">Decentralized IPFS Storage</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  Files are encrypted locally before storing on distributed storage networks, eliminating single points of failure.
                </p>
              </AnimatedSection>

              {/* Feature 6 */}
              <AnimatedSection delay={600} className="bg-white p-8 rounded-3xl border border-slate-200/80 shadow-sm hover:shadow-xl hover:-translate-y-1 transition-all duration-300 group">
                <div className="w-14 h-14 rounded-2xl bg-emerald-50 text-[#22C55E] flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  <Activity className="w-7 h-7" />
                </div>
                <h3 className="font-heading text-xl font-bold text-[#0F172A] mb-3">Continuous Timeline</h3>
                <p className="text-[#475569] text-sm leading-relaxed">
                  A unified chronological timeline of your prescriptions, lab reports, surgeries, and vaccinations across all hospitals.
                </p>
              </AnimatedSection>
            </div>
          </div>
        </section>

        {/* ================= HOW IT WORKS ================= */}
        <section id="how-it-works" className="py-24 bg-white border-t border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <AnimatedSection className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="section-badge">Simple & Secure Workflow</span>
              <h2 className="font-heading text-3xl sm:text-4xl font-extrabold text-[#0F172A] tracking-tight">
                How MediVault Works in 4 Steps
              </h2>
              <p className="text-[#475569] text-base sm:text-lg mx-auto">
                Designed for maximum ease of use while enforcing strict cryptographic protection.
              </p>
            </AnimatedSection>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
              {[
                {
                  step: "01",
                  title: "Create Vault Identity",
                  desc: "Sign in securely with email or Web3 wallet. Your encryption keys are generated locally.",
                  icon: ShieldCheck,
                },
                {
                  step: "02",
                  title: "Upload Medical Records",
                  desc: "Drag & drop prescriptions, scans, or lab tests. Files are encrypted and pinned to IPFS.",
                  icon: FileText,
                },
                {
                  step: "03",
                  title: "AI Analysis & Insights",
                  desc: "AI Copilot extracts lab metrics, highlights anomalies, and formats key timeline events.",
                  icon: Brain,
                },
                {
                  step: "04",
                  title: "Manage Access & QR",
                  desc: "Grant doctors temporary permission or display your emergency QR pass to paramedics.",
                  icon: KeyRound,
                },
              ].map((item, idx) => (
                <AnimatedSection key={item.step} delay={idx * 150} className="relative bg-slate-50 p-6 rounded-3xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-3xl font-black text-[#0891B2]/30">{item.step}</span>
                    <div className="p-3 rounded-2xl bg-white text-[#0891B2] shadow-xs border border-slate-200">
                      <item.icon className="w-6 h-6" />
                    </div>
                  </div>
                  <h3 className="font-heading font-bold text-[#0F172A] text-lg">{item.title}</h3>
                  <p className="text-xs text-[#475569] leading-relaxed">{item.desc}</p>
                </AnimatedSection>
              ))}
            </div>
          </div>
        </section>

        {/* ================= CALL TO ACTION BANNER ================= */}
        <section className="py-20 bg-gradient-to-br from-[#071415] via-[#0F2327] to-[#0891B2] text-white relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center space-y-8 relative z-10">
            <h2 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white">
              Ready to Own Your Digital Health Future?
            </h2>
            <p className="text-slate-300 text-base sm:text-lg max-w-2xl mx-auto leading-relaxed font-body">
              Join thousands of patients and doctors experiencing seamless, zero-knowledge encrypted medical record management today.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Link
                href="/auth"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#22C55E] hover:bg-[#16a34a] text-white font-bold text-base shadow-lg shadow-emerald-600/30 transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-white"
              >
                Create Free Account
              </Link>
              <Link
                href="/patient/dashboard"
                className="w-full sm:w-auto px-8 py-4 rounded-2xl bg-[#0F2327] border border-[#1E464D] hover:bg-[#142F34] text-white font-bold text-base transition-all min-h-[44px] flex items-center justify-center focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]"
              >
                Open Patient Portal
              </Link>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
