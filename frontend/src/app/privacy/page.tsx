"use client";

import React from "react";
import Link from "next/link";
import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import {
  ShieldCheck,
  Lock,
  Eye,
  FileText,
  Database,
  UserCheck,
  AlertCircle,
  Building2,
  Clock,
  Mail,
  ArrowLeft,
  CheckCircle2,
  PhoneCall,
  Scale
} from "lucide-react";

export default function PrivacyPolicyPage() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] font-bold uppercase tracking-wider">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>Statutory Compliance · DPDPA 2023 &amp; HIPAA Standard</span>
              </div>
              <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
                MediVault Privacy Policy
              </h1>
              <p className="text-xs sm:text-sm text-slate-500 font-mono">
                Effective Date: {lastUpdated} · Version 3.2 (Production Release)
              </p>
            </div>
          </div>
        </section>

        {/* Content Container */}
        <section className="max-w-4xl mx-auto px-4 sm:px-6 pt-10 space-y-10">
          
          {/* Quick Summary Card */}
          <div className="p-6 rounded-2xl bg-cyan-50/70 border border-cyan-200 space-y-3">
            <div className="flex items-center gap-2 font-bold text-sm text-cyan-950">
              <Lock className="w-4 h-4 text-cyan-700" />
              <span>Our Sovereign Privacy Commitment in 30 Seconds</span>
            </div>
            <ul className="space-y-1.5 text-xs text-slate-700 leading-relaxed">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Zero Ad Selling:</strong> We never sell, monetize, or broker your personal or health data to advertisers, pharmaceutical companies, or life insurers.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Client-Side Encryption:</strong> Documents are encrypted in your browser using AES-256 GCM before cloud transmission. MediVault operators cannot read your clinical records.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Indian Data Residency:</strong> All primary databases and encrypted object stores reside strictly within Indian borders (AWS Mumbai `ap-south-1`) in compliance with the DPDPA 2023.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                <span><strong>Time-Bound Doctor Consent:</strong> Doctors access your vault only via explicit, revocable time tokens (15m, 1h, 30d).</span>
              </li>
            </ul>
          </div>

          {/* Section 1: Introduction & Governing Jurisdiction */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              1. Introduction &amp; Regulatory Framework
            </h2>
            <p>
              MediVault Chain AI Inc. (&quot;MediVault&quot;, &quot;we&quot;, &quot;our&quot;, or &quot;us&quot;) operates the MediVault decentralized healthcare platform, Personal Health Record (PHR) health locker, and Clinical AI Assistant. This Privacy Policy governs our collection, storage, encryption, processing, and disclosure of data across our patient portal, doctor workstation, and administrative interfaces.
            </p>
            <p>
              MediVault strictly complies with the following statutory regimes:
            </p>
            <ul className="list-disc pl-5 space-y-1 text-xs text-slate-600">
              <li><strong>Digital Personal Data Protection Act (DPDPA), 2023:</strong> Act No. 22 of 2023 (Government of India).</li>
              <li><strong>Ayushman Bharat Digital Mission (ABDM):</strong> Health Data Management Policy issued by the National Health Authority (NHA).</li>
              <li><strong>Information Technology (Reasonable Security Practices and Procedures and Sensitive Personal Data or Information) Rules, 2011 (SPDI Rules).</strong></li>
              <li><strong>Indian Computer Emergency Response Team (CERT-In) Cyber Security Directions of April 2022.</strong></li>
              <li><strong>Health Insurance Portability and Accountability Act of 1996 (HIPAA):</strong> 45 CFR Part 160 and Part 164 (Security and Privacy Rules for global interoperability).</li>
            </ul>
          </div>

          {/* Section 2: Data We Collect */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              2. Categories of Information We Collect
            </h2>
            <p>
              Depending on which features you activate, we process the following categories of data:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-cyan-700" />
                  <span>A. Identity &amp; Government ID Data</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Full name, mobile number, date of birth, gender, state, 14-digit Ayushman Bharat Health Account (ABHA) number, `@abdm` virtual health handle, and masked Aadhaar reference numbers. Biometric data (fingerprint or face) is processed exclusively locally by your device&apos;s Secure Enclave for FIDO2 WebAuthn and is never transmitted to our servers.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-emerald-700" />
                  <span>B. Protected Health Information (PHI)</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Medical prescriptions, laboratory panels (blood, metabolic, lipid), diagnostic imaging scans, discharge summaries, vaccination records (CoWIN), health insurance policies (PM-JAY), and Emergency Trauma data (blood type, critical drug allergies, chronic conditions, ICE contacts).
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Database className="w-4 h-4 text-purple-700" />
                  <span>C. Cryptographic &amp; Blockchain Proofs</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  SHA-256 cryptographic hashes of uploaded documents, Polygon Amoy blockchain transaction hashes (`txHash`), block numbers, and consent state verification tokens.
                </p>
              </div>

              <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-2">
                <h3 className="font-bold text-xs text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-slate-700" />
                  <span>D. Regulatory Telemetry &amp; Access Logs</span>
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  IP addresses, timestamps, user-agent headers, and consultation access event IDs. Maintained in immutable audit logs for 180 days in compliance with CERT-In directions.
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Purpose of Processing */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              3. Purpose Limitation &amp; Lawful Grounds for Processing
            </h2>
            <p>
              Under Section 4 and Section 6 of the DPDPA 2023, MediVault processes personal and health data only on the lawful grounds of **explicit, informed consent** for specified clinical purposes:
            </p>
            <ul className="list-disc pl-5 space-y-1.5 text-xs text-slate-600">
              <li><strong>Vault Custody &amp; Retrieval:</strong> Storing, organizing, and rendering your clinical records in an encrypted digital repository.</li>
              <li><strong>Government ABDM Synchronization:</strong> Communicating with the National Health Authority gateway to link your ABHA ID and DigiLocker certificates upon your explicit authorization.</li>
              <li><strong>AI Clinical Extraction:</strong> Running automated Optical Character Recognition (OCR) and biomarker analysis (via Google Gemini 2.5 Flash Cloud) to transcribe handwriting and alert on drug-drug interactions.</li>
              <li><strong>Emergency First-Responder Access:</strong> Presenting non-sensitive emergency trauma information (blood group, anaphylactic allergies, and emergency phone numbers) when an emergency pass QR is scanned.</li>
              <li><strong>Legal &amp; Regulatory Compliance:</strong> Fulfilling incident reporting and forensic logging requirements under CERT-In and Indian law.</li>
            </ul>
          </div>

          {/* Section 4: Data Encryption & Zero-Knowledge Architecture */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              4. Technical Safeguards &amp; Zero-Knowledge Cryptography
            </h2>
            <p>
              MediVault is engineered with zero-trust architectural boundaries to prevent unauthorized inspection:
            </p>
            <div className="p-4 rounded-xl bg-slate-900 text-white space-y-2 text-xs font-mono">
              <div className="text-emerald-400 font-bold">Client-Side Encryption Standard:</div>
              <p className="text-slate-300">
                All clinical files are encrypted in the user&apos;s browser using AES-256-GCM before payload transmission. Decryption keys are derived directly from the patient&apos;s authenticated hardware passkey (WebAuthn) and are never stored on MediVault backend servers.
              </p>
              <div className="text-cyan-400 font-bold pt-2">Transit Security:</div>
              <p className="text-slate-300">
                All API endpoints mandate TLS 1.3 encryption with HTTP Strict Transport Security (HSTS) and binary magic-byte inspection to prevent spoofing.
              </p>
            </div>
          </div>

          {/* Section 5: Data Sharing & Third-Party Processors */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              5. Third-Party Sub-Processors &amp; Data Sharing
            </h2>
            <p>
              We share data only with verified sub-processors necessary to operate the platform under strict Business Associate Agreements (BAAs) and Data Processing Addendums (DPAs):
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-left border border-slate-200 rounded-xl text-xs">
                <thead className="bg-slate-100 text-slate-900 font-bold">
                  <tr>
                    <th className="p-3 border-b border-slate-200">Sub-Processor</th>
                    <th className="p-3 border-b border-slate-200">Purpose</th>
                    <th className="p-3 border-b border-slate-200">Data Transferred</th>
                    <th className="p-3 border-b border-slate-200">Location</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 text-slate-600">
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">Amazon Web Services (AWS)</td>
                    <td className="p-3">Encrypted Cloud Storage &amp; Database</td>
                    <td className="p-3">AES-256 Encrypted Blobs</td>
                    <td className="p-3 font-mono">Mumbai (`ap-south-1`), India</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">National Health Authority (NHA)</td>
                    <td className="p-3">ABHA &amp; ABDM Gateway Verification</td>
                    <td className="p-3">Aadhaar verification tokens, ABHA ID</td>
                    <td className="p-3 font-mono">New Delhi, India</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">DigiLocker / MeriPehchan</td>
                    <td className="p-3">Government Certificate Synchronization</td>
                    <td className="p-3">PM-JAY &amp; CoWIN Document URIs</td>
                    <td className="p-3 font-mono">MeitY, India</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">Google Gemini AI Cloud</td>
                    <td className="p-3">Multimodal Clinical OCR &amp; Lab Parsing</td>
                    <td className="p-3">Prescription image for transient inference</td>
                    <td className="p-3 font-mono">Enterprise Zero-Retention API</td>
                  </tr>
                  <tr>
                    <td className="p-3 font-semibold text-slate-900">Polygon Amoy Network</td>
                    <td className="p-3">Decentralized Document Hash Notarization</td>
                    <td className="p-3">One-way SHA-256 Hash (No raw PHI)</td>
                    <td className="p-3 font-mono">Public Distributed Ledger</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 6: Patient Rights */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              6. Rights of Data Principals (Patients)
            </h2>
            <p>
              Under Chapter III of the DPDPA 2023 and HIPAA, you hold complete sovereignty over your health data:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">✓ Right to Access &amp; Portability</span>
                <span>You can review all stored records and download a complete, unencrypted FHIR R4 XML/JSON export at any time.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">✓ Right to Correction &amp; Updating</span>
                <span>You may edit or update incomplete medical tags, emergency contacts, or allergy records.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">✓ Right to Erasure (&quot;Right to be Forgotten&quot;)</span>
                <span>You may trigger irreversible cryptographic deletion of your medical vault. All files and database pointers will be purged.</span>
              </div>
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-bold text-slate-900 block mb-1">✓ Right to Revoke Consent Instantly</span>
                <span>You can terminate active doctor consultation sessions with a single click, immediately invalidating access tokens.</span>
              </div>
            </div>
          </div>

          {/* Section 7: Data Protection Officer & Grievance Redressal */}
          <div className="space-y-3 text-sm text-slate-700 leading-relaxed">
            <h2 className="text-xl font-bold text-slate-900 border-b border-slate-200 pb-2">
              7. Data Protection Officer (DPO) &amp; Grievance Redressal
            </h2>
            <p>
              In compliance with Section 10 of the DPDPA 2023, MediVault has designated a formal Data Protection Officer to oversee healthcare privacy compliance and address user inquiries:
            </p>
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2 text-xs">
              <div className="font-bold text-sm text-slate-900">MediVault Data Protection &amp; Privacy Office</div>
              <div className="text-slate-600 space-y-1">
                <div><strong>Designation:</strong> Data Protection Officer (DPO) &amp; Grievance Officer</div>
                <div><strong>Entity:</strong> MediVault Chain AI Inc.</div>
                <div><strong>Official Grievance Email:</strong> <a href="mailto:privacy@medivault.app" className="text-cyan-700 font-mono font-bold hover:underline">privacy@medivault.app</a> / <a href="mailto:dpo@medivault.app" className="text-cyan-700 font-mono font-bold hover:underline">dpo@medivault.app</a></div>
                <div><strong>Response Statutory Window:</strong> Formal acknowledgment within 48 hours; full resolution within 30 days.</div>
                <div><strong>Jurisdiction:</strong> Mumbai, Maharashtra, India.</div>
              </div>
            </div>
          </div>

        </section>
      </main>

      <Footer />
    </div>
  );
}
