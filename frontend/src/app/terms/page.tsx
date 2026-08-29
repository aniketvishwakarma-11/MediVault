"use client";

import React from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  Scale,
  AlertTriangle,
  FileCheck,
  Stethoscope,
  ShieldAlert,
  Lock,
  ArrowLeft,
  CheckCircle,
  HelpCircle,
  Brain,
  QrCode,
  Building
} from "lucide-react";

export default function TermsOfServicePage() {
  const lastUpdated = "August 29, 2026";

  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 flex flex-col font-sans selection:bg-cyan-100 selection:text-cyan-900">
      <Navbar />

      <main className="flex-1 pt-24 pb-20">
        {/* Header Banner */}
        <section className="bg-white border-b border-slate-200 py-12">
          <div className="max-w-4xl mx-auto px-4 sm:px-6">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:text-cyan-700 transition-colors mb-4 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Home</span>
            </Link>

            <div className="space-y-3">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold uppercase tracking-wider">
                <Scale className="w-3.5 h-3.5 text-amber-700" />
                <span>Legally Binding Patient &amp; Clinical Agreement</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                Terms of Service &amp; Clinical Disclaimers
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-mono">
                Effective Date: {lastUpdated} · Version 3.2 (Production Release)
              </p>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-10">

          {/* CRITICAL MEDICAL DISCLAIMER (CDSCO / NMC Compliance) */}
          <div className="p-6 rounded-2xl bg-rose-50 border-2 border-rose-200 space-y-3">
            <div className="flex items-center gap-2 font-black text-sm text-rose-950 uppercase tracking-wide">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0" />
              <span>CRITICAL MEDICAL &amp; CLINICAL AI DISCLAIMER</span>
            </div>
            <div className="space-y-2 text-xs text-rose-900 leading-relaxed font-medium">
              <p>
                <strong>1. MediVault is NOT a Licensed Medical Provider:</strong> MediVault is a digital health record management software and decentralized cryptographic locker. MediVault does NOT practice medicine, dispense pharmaceutical drugs, or provide formal diagnoses.
              </p>
              <p>
                <strong>2. Assistive Clinical AI Limitations:</strong> MediVault&apos;s multimodal Optical Character Recognition (OCR), Prescription Explainer, Lab Reference Biomarker range indicators, and Drug-Drug Interaction Safety engines are <strong>assistive informational algorithms</strong> designed to facilitate patient organization. Under the Medical Device Rules (CDSCO MDR 2017) and NMC Telemedicine Guidelines, our AI models <strong>do NOT constitute certified Software as a Medical Device (SaMD)</strong> or primary medical diagnostics.
              </p>
              <p>
                <strong>3. Always Consult a Physician:</strong> Never discontinue, modify, or begin any prescription medication or medical therapy based solely on output from the MediVault AI Copilot. In case of acute chest pain, trauma, or medical distress, dial <strong>112 / 102</strong> or proceed to the nearest emergency department immediately.
              </p>
            </div>
          </div>

          {/* Section 1: Acceptance of Terms */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              1. Acceptance of Terms &amp; Scope
            </h2>
            <p>
              By accessing, registering an account, linking an Ayushman Bharat Health Account (ABHA), uploading documents, or utilizing the doctor terminal on MediVault (the &quot;Platform&quot;), you acknowledge that you have read, understood, and agreed to be legally bound by these Terms of Service (&quot;Terms&quot;) and our Privacy Policy. If you do not agree to these Terms, you must immediately discontinue use of the Platform.
            </p>
          </div>

          {/* Section 2: Patient Vault & Identity */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              2. User Accounts, Passkeys &amp; Security Responsibility
            </h2>
            <p>
              MediVault utilizes hardware-backed FIDO2 / WebAuthn passwordless authentication (biometric face/fingerprint or security key). You are solely responsible for:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>Maintaining physical custody and security of devices registered as your authorized biometric passkeys.</li>
              <li>Ensuring that uploaded medical documents, lab results, and personal details reflect authentic and accurate health information.</li>
              <li>Promptly revoking access or alerting MediVault administrators if you suspect unauthorized access to your account or credentials.</li>
            </ul>
          </div>

          {/* Section 3: Government ABDM & DigiLocker Integration */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              3. Government ABDM &amp; DigiLocker Sync Rules
            </h2>
            <p>
              MediVault provides API interoperability with the National Health Authority (NHA) Ayushman Bharat Digital Mission (ABDM) and DigiLocker (MeitY):
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Voluntary Participation:</strong> Generating or linking an ABHA number via MediVault is strictly voluntary. You may use MediVault as a private offline health vault without providing an Aadhaar or ABHA identifier.</li>
              <li><strong>Third-Party Gateway Availability:</strong> MediVault does not control the uptime or response latency of government identity servers (UIDAI or NHA). We are not liable for transient authentication failures resulting from government gateway downtime.</li>
              <li><strong>Document Authenticity:</strong> Documents pulled through DigiLocker (e.g. CoWIN certificates, PM-JAY cards) are certified directly by the issuing authority and are imported into your vault in an unadulterated state.</li>
            </ul>
          </div>

          {/* Section 4: Doctor Workstation & Consent Delegations */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              4. Doctor Consultation Sessions &amp; Time-Bound Consent
            </h2>
            <div className="space-y-2 text-xs text-slate-600">
              <p>
                <strong>A. Patient-Controlled Consent:</strong> When you share your vault with a physician, you grant a time-limited cryptographic delegation token (e.g. 15 minutes, 1 hour, or 30 days). You retain the right to terminate access prematurely using the &quot;Revoke Access&quot; button.
              </p>
              <p>
                <strong>B. Doctor Professional Duty:</strong> Licensed medical practitioners using the Doctor Terminal must verify patient identity and uphold standard duty of care in compliance with the National Medical Commission (NMC) regulations. Doctors may not download, re-distribute, or photograph patient records outside the authorized clinical session.
              </p>
              <p>
                <strong>C. Emergency 15-Minute Hospital Override:</strong> Verified hospital trauma physicians may trigger an emergency bypass in acute resuscitation cases. Every emergency override generates an immutable on-chain audit trail and immediately notifies the patient via SMS/Email.
              </p>
            </div>
          </div>

          {/* Section 5: Golden Hour Emergency Trauma Pass */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              5. Emergency Trauma Pass Usage &amp; Limitations
            </h2>
            <p>
              The Golden Hour Emergency Pass renders essential resuscitation data (blood type, critical allergies, and emergency phone numbers) when scanned by paramedics:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li>The emergency pass operates in public or unauthenticated mode to allow paramedics and first responders immediate life-saving triage data without requiring your phone unlock code.</li>
              <li>You are solely responsible for verifying that your listed blood group and allergy disclosures are medically accurate. MediVault bears no responsibility for adverse clinical reactions resulting from inaccurate patient-submitted allergy data.</li>
            </ul>
          </div>

          {/* Section 6: Prohibited Uses */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              6. Prohibited Activities
            </h2>
            <p>You agree not to engage in any of the following unauthorized activities:</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-rose-800 block mb-1">✕ Falsifying Medical Credentials</span>
                <span>Impersonating a licensed medical doctor, healthcare provider, or emergency responder on the platform.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-rose-800 block mb-1">✕ Malicious Payloads</span>
                <span>Uploading executables, malicious binaries, scripts, or corrupted files disguised as medical PDFs or images.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-rose-800 block mb-1">✕ Scraping &amp; Data Harvesting</span>
                <span>Using bots, crawlers, or automated tools to scrape provider directories or patient information.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-rose-800 block mb-1">✕ Circumventing Consent Tokens</span>
                <span>Attempting to reverse-engineer, forge, or tamper with Polygon blockchain notarizations or cryptographic consent tokens.</span>
              </div>
            </div>
          </div>

          {/* Section 7: Limitation of Liability */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              7. Limitation of Liability &amp; Indemnification
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, MEDIVAULT CHAIN AI INC., ITS DIRECTORS, EMPLOYEES, AND PARTNERS SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF DATA, MEDICAL COMPLICATIONS, CLINICAL ERRORS BY ATTENDING PHYSICIANS, OR SERVICE INTERRUPTIONS RESULTING FROM NETWORK OR BLOCKCHAIN LATENCY. IN NO EVENT SHALL MEDIVAULT&apos;S TOTAL AGGREGATE LIABILITY EXCEED THE GREATER OF ONE THOUSAND INDIAN RUPEES (INR 1,000) OR THE TOTAL FEES PAID BY YOU TO MEDIVAULT IN THE PRECEDING TWELVE MONTHS.
            </p>
          </div>

          {/* Section 8: Governing Law & Jurisdiction */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              8. Governing Law &amp; Dispute Resolution
            </h2>
            <p className="text-xs text-slate-600 leading-relaxed">
              These Terms shall be governed by, construed, and enforced in accordance with the laws of the Republic of India, without regard to its conflict of law principles. Any dispute, claim, or controversy arising out of or relating to these Terms or the breach, termination, enforcement, interpretation, or validity thereof shall be submitted to the exclusive jurisdiction of the competent courts situated in <strong>Mumbai, Maharashtra, India</strong>.
            </p>
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 mt-2">
              <span>For legal notices or questions regarding these Terms, contact our legal counsel at </span>
              <a href="mailto:legal@medivault.app" className="text-cyan-700 font-mono font-bold hover:underline">legal@medivault.app</a>.
            </div>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
