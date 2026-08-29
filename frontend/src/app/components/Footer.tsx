"use client";

import React from "react";
import Link from "next/link";
import { ShieldCheck, ArrowUpRight } from "lucide-react";

export default function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="bg-slate-950 text-slate-400 border-t border-slate-800/80 font-sans">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-14 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-10 pb-12 border-b border-slate-800/70">
          
          {/* Brand & Mission Column */}
          <div className="md:col-span-5 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group focus:outline-none">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-600 to-emerald-500 text-white flex items-center justify-center shadow-xs">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-lg tracking-tight text-white">
                Medi<span className="text-cyan-400">Vault</span>
              </span>
            </Link>

            <p className="text-xs sm:text-sm text-slate-400 max-w-sm leading-relaxed">
              The sovereign personal health operating system. Unifying 14-digit government ABHA IDs, multimodal clinical AI, and zero-knowledge client encryption into a patient-controlled health vault.
            </p>

            {/* Live Operational Status Indicator */}
            <div className="pt-1">
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-800 text-[11px] text-slate-300 font-mono">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse shrink-0" />
                <span>All Systems Operational · AWS Mumbai (`ap-south-1`)</span>
              </div>
            </div>
          </div>

          {/* Navigation Column 1: Portals */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Portals
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/auth" className="hover:text-white transition-colors py-1 inline-flex items-center gap-1">
                  <span>Patient Health Vault</span>
                </Link>
              </li>
              <li>
                <Link href="/doctor/auth/login" className="hover:text-white transition-colors py-1 inline-flex items-center gap-1">
                  <span>Doctor Workstation</span>
                </Link>
              </li>
              <li>
                <Link href="/admin/dashboard" className="hover:text-white transition-colors py-1 inline-flex items-center gap-1">
                  <span>Hospital Admin &amp; Telemetry</span>
                </Link>
              </li>
              <li>
                <Link href="/patient/emergency" className="hover:text-white transition-colors py-1 inline-flex items-center gap-1">
                  <span>Paramedic Emergency Pass</span>
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 2: Clinical Features */}
          <div className="md:col-span-3 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Clinical Features
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/patient/profile" className="hover:text-white transition-colors py-1 inline-block">
                  14-Digit ABHA ID &amp; 3D Card
                </Link>
              </li>
              <li>
                <Link href="/patient/reports" className="hover:text-white transition-colors py-1 inline-block">
                  Encrypted Document Locker
                </Link>
              </li>
              <li>
                <Link href="/patient/ai-copilot" className="hover:text-white transition-colors py-1 inline-block">
                  Multimodal Gemini AI Copilot
                </Link>
              </li>
              <li>
                <Link href="/patient/prescriptions" className="hover:text-white transition-colors py-1 inline-block">
                  Rx Explainer &amp; Drug Safety
                </Link>
              </li>
              <li>
                <Link href="/patient/timeline" className="hover:text-white transition-colors py-1 inline-block">
                  Longitudinal Health Timeline
                </Link>
              </li>
              <li>
                <Link href="/patient/consent" className="hover:text-white transition-colors py-1 inline-block">
                  Time-Bound Consent Manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Navigation Column 3: Trust & Compliance */}
          <div className="md:col-span-2 space-y-3">
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider font-mono">
              Trust &amp; Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/privacy" className="hover:text-white transition-colors py-1 inline-block">
                  Privacy Policy (DPDPA)
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-white transition-colors py-1 inline-block">
                  Terms of Service &amp; CDS
                </Link>
              </li>
              <li>
                <Link href="/#security" className="hover:text-white transition-colors py-1 inline-block">
                  Security Architecture
                </Link>
              </li>
              <li>
                <a
                  href="https://sandbox.abdm.gov.in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-white transition-colors py-1 inline-flex items-center gap-1 text-slate-400"
                >
                  <span>NHA ABDM Sandbox</span>
                  <ArrowUpRight className="w-3 h-3" />
                </a>
              </li>
            </ul>
          </div>

        </div>

        {/* Footer Bottom Strip */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="space-y-1 text-center sm:text-left">
            <p>&copy; {currentYear} MediVault Health Technologies Inc. All rights reserved.</p>
            <p className="text-[11px] text-slate-500 font-mono">
              Ayushman Bharat Digital Mission (ABDM) Partner · DPDPA 2023 Compliant · HIPAA Standard.
            </p>
          </div>

          <div className="flex items-center gap-5 text-xs">
            <Link href="/privacy" className="hover:text-slate-300 transition-colors py-1">
              Privacy Policy
            </Link>
            <span className="text-slate-800">·</span>
            <Link href="/terms" className="hover:text-slate-300 transition-colors py-1">
              Terms of Service
            </Link>
            <span className="text-slate-800">·</span>
            <Link href="/#security" className="hover:text-slate-300 transition-colors py-1">
              Security Disclosure
            </Link>
          </div>
        </div>

      </div>
    </footer>
  );
}
