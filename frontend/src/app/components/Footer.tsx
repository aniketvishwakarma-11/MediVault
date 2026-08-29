"use client";

import Link from "next/link";
import { ShieldCheck, Lock, HeartPulse } from "lucide-react";

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
    <footer className="bg-[#071415] text-slate-300 pt-16 pb-12 border-t border-[#1E464D]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-10 pb-12 border-b border-[#1E464D]">
          {/* Brand Info */}
          <div className="md:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-3 group focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0891B2]">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#0891B2] to-[#22D3EE] text-white flex items-center justify-center shadow-md">
                <ShieldCheck className="w-6 h-6" />
              </div>
              <span className="font-heading font-extrabold text-xl tracking-tight text-white">
                Medi<span className="text-[#22D3EE]">Vault</span>
              </span>
            </Link>
            <p className="text-sm text-slate-400 max-w-sm leading-relaxed font-body">
              Empowering patients with secure, decentralized, AI-driven digital health identity management. Complete ownership of your medical history.
            </p>
            {/* Compliance Badges */}
            <div className="pt-2 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2327] text-slate-200 text-xs font-medium border border-[#1E464D]">
                <Lock className="w-3.5 h-3.5 text-[#22D3EE]" />
                HIPAA Compliant
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2327] text-slate-200 text-xs font-medium border border-[#1E464D]">
                <ShieldCheck className="w-3.5 h-3.5 text-[#0891B2]" />
                FHIR Interoperable
              </span>
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0F2327] text-slate-200 text-xs font-medium border border-[#1E464D]">
                <HeartPulse className="w-3.5 h-3.5 text-[#22C55E]" />
                Zero-Knowledge Privacy
              </span>
            </div>
          </div>

          {/* Links Grid */}
          {footerSections.map((section) => (
            <div key={section.title} className="space-y-3">
              <h4 className="font-heading text-xs font-bold text-slate-200 uppercase tracking-wider">
                {section.title}
              </h4>
              <ul className="space-y-2">
                {section.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="text-sm text-slate-400 hover:text-[#22D3EE] transition-colors py-1 inline-block min-h-[36px] flex items-center"
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
            <Link href="/privacy" className="hover:text-slate-200 transition-colors py-1 min-h-[36px] flex items-center cursor-pointer">Privacy Policy</Link>
            <Link href="/terms" className="hover:text-slate-200 transition-colors py-1 min-h-[36px] flex items-center cursor-pointer">Terms of Service</Link>
            <Link href="/#security" className="hover:text-slate-200 transition-colors py-1 min-h-[36px] flex items-center cursor-pointer">Security Disclosure</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
