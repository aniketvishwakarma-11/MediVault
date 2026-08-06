"use client";

import Link from "next/link";
import { ShieldCheck, Lock, HeartPulse, CheckCircle2 } from "lucide-react";

const footerSections = [
  {
    title: "Platform Modules",
    links: [
      { label: "Patient Records Vault", href: "/patient/reports" },
      { label: "AI Medical Copilot", href: "/patient/ai-copilot" },
      { label: "Emergency Medical Pass", href: "/patient/emergency" },
      { label: "Consent & Access Control", href: "/patient/consent" },
      { label: "Health Timeline", href: "/patient/timeline" },
    ],
  },
  {
    title: "Security & Standards",
    links: [
      { label: "Zero-Knowledge Proofs", href: "/#security" },
      { label: "FHIR & HL7 Standard", href: "/#security" },
      { label: "HIPAA Privacy Protocol", href: "/#security" },
      { label: "AES-256 Encryption", href: "/#security" },
      { label: "IPFS Storage Hash", href: "/#blockchain" },
    ],
  },
  {
    title: "Resources",
    links: [
      { label: "User Guide & Docs", href: "#" },
      { label: "Developer API", href: "#" },
      { label: "Paramedic Quick Scan", href: "/patient/emergency" },
      { label: "System Status", href: "#" },
      { label: "Security Whitepaper", href: "#" },
    ],
  },
];

export default function Footer() {
  return (
    <footer className="bg-slate-900 text-slate-300 pt-16 pb-12 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-slate-800">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-teal-400 text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="font-extrabold text-xl tracking-tight text-white">
                Medi<span className="text-sky-400">Vault</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed">
              Empowering patients with secure, decentralized, AI-driven digital health identity management. Complete ownership of your medical history.
            </p>
            {/* Compliance Badges */}
            <div className="pt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                <Lock className="w-3.5 h-3.5 text-sky-400" />
                HIPAA Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                FHIR Interoperable
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg bg-slate-800 text-slate-300 text-xs font-medium border border-slate-700">
                <HeartPulse className="w-3.5 h-3.5 text-emerald-400" />
                Zero-Knowledge Privacy
              </span>
            </div>
          </div>

          {/* Links Grid */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-sky-400 transition-colors"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Footer Bottom */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <p>&copy; {new Date().getFullYear()} MediVault Chain AI Inc. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <a href="#" className="hover:text-slate-200 transition-colors">Privacy Policy</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Terms of Service</a>
            <a href="#" className="hover:text-slate-200 transition-colors">Security Disclosure</a>
          </div>
        </div>
      </div>
    </footer>
  );
}
