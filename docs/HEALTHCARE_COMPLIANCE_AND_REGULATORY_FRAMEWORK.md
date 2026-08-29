# 🛡️ MediVault Healthcare Compliance & Regulatory Governance Framework

This document outlines the complete statutory, regulatory, and technical compliance framework that **MediVault** (as a Personal Health Record / Health Locker, Clinical AI, and Hospital Telemedicine Platform) is legally mandated to implement and maintain.

---

## 🏛️ 1. Statutory Regulatory Bodies & Applicable Laws

### A. Primary Indian Jurisdiction (Operating Base & Data Residency)

| Regulation / Act | Governing Authority | Scope for MediVault | Penalty for Non-Compliance |
| :--- | :--- | :--- | :--- |
| **Digital Personal Data Protection Act (DPDPA 2023)** | Data Protection Board of India (DPBI) / MeitY | Governs processing of patient digital health data, explicit consent mechanisms, data fiduciary obligations, and patient rights. | Up to **₹250 Crore** for failure to prevent security breaches. |
| **Ayushman Bharat Digital Mission (ABDM)** | National Health Authority (NHA) / MoHFW | Governs ABHA issuance (M1), Health Information Provider (M2), Health Information User (M3), and Unified Health Interface (UHI). | Revocation of API keys, exclusion from national health registry. |
| **CERT-In Cyber Security Directions (April 2022)** | Ministry of Electronics & IT (MeitY) | Mandatory **6-hour reporting** of cybersecurity incidents, mandatory **180-day log retention** within India. | Fine up to ₹1 Lakh or imprisonment under Section 70B(7) IT Act. |
| **Information Technology (SPDI) Rules, 2011** | Ministry of Electronics & IT (MeitY) | Classifies medical records, biometric data, and physical/physiological health conditions as **Sensitive Personal Data or Information (SPDI)**. | Civil damages under Section 43A of IT Act. |
| **Electronic Health Record (EHR) Standards 2016** | Ministry of Health & Family Welfare (MoHFW) | Defines clinical data interchange standards: **HL7 FHIR R4**, SNOMED CT, LOINC, and DICOM imaging standards. | Ineligibility for government hospital tenders and insurance integrations. |
| **Telemedicine Practice Guidelines (2020)** | National Medical Commission (NMC) | Regulates doctor-patient digital consultations, prescription formats, and prohibited drug schedules (Schedule X). | Medical license suspension of attending physicians. |
| **Medical Device Rules (CDSCO MDR 2017)** | Central Drugs Standard Control Organisation | Governs whether Clinical AI / Decision Support Systems constitute **Software as a Medical Device (SaMD)**. | Seizure, criminal penalties for unauthorized medical diagnostics. |

---

### B. Global Interoperability & Export Standards (For International Healthcare)

| Standard | Governing Authority | Key Mandate |
| :--- | :--- | :--- |
| **HIPAA (Health Insurance Portability and Accountability Act)** | US Department of Health & Human Services (HHS / OCR) | **Privacy Rule** (protecting 18 PHI identifiers), **Security Rule** (technical, administrative, physical safeguards), **Breach Notification Rule** (60-day notice). |
| **GDPR (General Data Protection Regulation - EU)** | European Data Protection Board (EDPB) | **Article 9** (Processing of Special Categories of Data - Health data is strictly prohibited without explicit, opt-in consent). |
| **ISO/IEC 27001 & ISO 27799** | International Organization for Standardization | Information security management system specifically tailored for health informatics and medical data protection. |
| **SOC 2 Type II (Healthcare)** | AICPA | Trust Services Criteria: Security, Availability, Processing Integrity, Confidentiality, and Privacy. |

---

## 📑 2. Master Compliance Document Checklist (Required Library)

A medical system like MediVault must prepare, maintain, and publish the following **10 core compliance artifacts**:

### Category 1: Public & Patient-Facing Legal Documents

#### 1. Comprehensive Privacy Policy (DPDPA 2023 & HIPAA Aligned)
* **What it must contain:**
  * Exact description of Protected Health Information (PHI) collected (ABHA number, Aadhaar biometric verification tokens, prescriptions, blood tests, emergency contact).
  * Purpose limitation: Explains that patient data is processed **exclusively for clinical storage and emergency care**, never sold to third-party ad networks, brokers, or life insurers.
  * Third-party data fiduciaries: Discloses cloud hosting (AWS Mumbai `ap-south-1`), database (Supabase/PostgreSQL), AI processors (Google Gemini Cloud), and government gateways (ABDM/DigiLocker).
  * Rights of Data Principals: How patients can request access, correction, data portability (FHIR export), or complete account erasure ("Right to be Forgotten").
  * Contact information of the designated **Data Protection Officer (DPO)** and Grievance Redressal Officer.

#### 2. Terms of Service & Clinical Decision Support (CDS) Disclaimer
* **Mandatory AI Disclaimer (CDSCO / NMC Compliance):**
  > *"MediVault's AI Copilot, Prescription Explainer, and Lab OCR are assistive informational tools designed to aid patient comprehension. They do not constitute formal medical diagnosis, prognosis, or clinical treatment advice. Patients must always consult a licensed medical professional before altering prescription regimens or medical treatments."*
* **Emergency Care Limitations:** States that the Emergency Trauma Pass provides rapid offline paramedic triage information but is dependent on patient-input accuracy and does not replace official hospital admissions protocols.

#### 3. Granular Electronic Consent Notices (DPDPA Section 6)
* Notice must be presented in clear, plain language with multilingual support (English, Hindi, and regional languages).
* Unbundled consent: Separate checkboxes for:
  1. Storing health records in personal vault.
  2. Syncing with ABDM / ABHA national network.
  3. Sharing records with consulting physicians for a specific time window.
  4. Anonymous clinical telemetry for app improvement.

---

### Category 2: Internal Security & Governance Policies (Auditor-Ready)

#### 4. Information Security Management Policy (ISMS - ISO 27001 Aligned)
* Formally defines:
  * Authentication requirements: Multi-factor authentication (MFA) and FIDO2 / WebAuthn passwordless biometrics.
  * Encryption standard: **AES-256 GCM** for data at rest and **TLS 1.3** for data in transit.
  * Password policies for healthcare workers and administrators.
  * Clean desk / clean screen protocols for medical staff.

#### 5. Data Breach Response & Incident Notification Procedure (CERT-In Mandate)
* Protocol for detecting, containing, and escalating security breaches.
* **Statutory Timeline:**
  * Within **6 hours** of cyber incident identification: Formal electronic report sent to CERT-In (`incident@cert-in.org.in`).
  * Within **72 hours**: Formal notification to the Data Protection Board of India (DPBI) and affected patients detailing the nature of the breach, compromised records, and mitigation steps taken.

#### 6. Cryptographic Key Management & Zero-Knowledge Architecture Policy
* Documentation of client-side key derivation (PBKDF2 / WebAuthn PRF).
* Verification that private decryption keys never traverse or persist in plaintext on backend application servers or cloud databases.
* Key rotation schedules and emergency key revocation procedures.

#### 7. Role-Based Access Control (RBAC) & Principle of Least Privilege (PoLP)
* Defines exact permission matrices for:
  * `Patient`: Can only read/write own vault records.
  * `Doctor`: Can view patient records ONLY if an active, unexpired consent token exists in `public.consent_requests`.
  * `Hospital Admin`: Can view platform telemetry, doctor verification status, and audit logs, but **zero access to unencrypted patient clinical documents**.

#### 8. Data Retention, Archival & Destruction Policy
* **Audit Log Retention:** In compliance with CERT-In directions, all access logs, IP addresses, and user-agent trails must be retained in immutable storage for a minimum of **180 days** within Indian borders.
* **Patient Record Retention:** Clinical records stored until patient-initiated deletion, or as mandated by state medical councils (minimum 3 years for outpatient records, 5 years for inpatient records).
* **Sanitization Standard:** NIST SP 800-88 compliant cryptographic erasure upon account deletion.

---

### Category 3: Government Certifications & Third-Party Audit Reports

#### 9. CERT-In Empaneled Auditor VAPT Clearance Report (WASA Certificate)
* **What it is:** A comprehensive Web Application Security Assessment (WASA) and Vulnerability Assessment & Penetration Testing (VAPT) performed by a cybersecurity firm certified by the Indian Computer Emergency Response Team (CERT-In).
* **Mandatory Requirement for ABDM Production:** The National Health Authority **will NOT grant production API credentials** without a clean VAPT report with zero High or Critical vulnerabilities.
* **Audit Scope:** API gateway, client authentication, SQL injection, IDOR, SSRF, XSS, rate limiting, and cryptographic implementation.

#### 10. Business Associate Agreement (BAA) Template
* Required under HIPAA and B2B hospital contracts.
* Legally binds third-party infrastructure providers (AWS, MinIO, database hosts) to maintain strict PHI safeguards, confidentiality, and breach reporting.

---

## 🔍 3. MediVault Technical Gap Analysis & Compliance Readiness

| Compliance Area | Statutory Mandate | MediVault Implementation Status | Action Required |
| :--- | :--- | :---: | :--- |
| **Data Encryption at Rest** | AES-256 minimum (DPDPA / HIPAA) | ✅ **Compliant** | Client-side AES-256 GCM + SHA-256 file checksums. |
| **Data Encryption in Transit** | TLS 1.3 / HTTPS (EHR Standards) | ✅ **Compliant** | Strict HTTPS enforcement, HSTS headers via Helmet. |
| **Data Localization** | Indian border residency (DPDPA 2023) | ✅ **Compliant** | Cloud hosting on AWS Mumbai (`ap-south-1`). |
| **Log Retention** | 180-day immutable logging (CERT-In) | ✅ **Compliant** | `public.audit_logs` records IP, user agent, action, timestamp. |
| **Consent Management** | Time-bound, revocable consent (ABDM) | ✅ **Compliant** | 15m, 1h, 30d time-bound scopes with Polygon on-chain hash. |
| **MIME & File Anti-Spoofing** | Magic byte inspection (CERT-In) | ✅ **Compliant** | Binary buffer validation rejecting disguised executables. |
| **WebAuthn Biometrics** | FIDO2 Hardware-backed authentication | ✅ **Compliant** | Hardware TPM / Secure Enclave passwordless passkeys. |
| **VAPT Audit Certificate** | CERT-In empaneled auditor report | 🔄 **Action Needed** | Schedule commercial penetration test before NHA production cutover. |
| **Published Legal Documents** | Privacy Policy & CDS AI Disclaimer | 🔄 **Action Needed** | Publish dedicated `/privacy` and `/terms` public web routes. |

---

## 🚀 4. Action Plan for 100% Production Legal Clearance

1. **Publish Public Legal Pages:**
   * Deploy `/privacy` (DPDPA 2023, HIPAA PHI notices, DPO contact).
   * Deploy `/terms` (Clinical Decision Support AI assistive disclaimers).
2. **Designate a Data Protection Officer (DPO):**
   * Under Section 10 of DPDPA 2023, assign a designated email address (e.g. `dpo@medivault.app` or `privacy@medivault.app`) for handling data subject access requests and grievance redressal within 30 days.
3. **Engage a CERT-In Empaneled Auditor:**
   * Select a certified auditing firm from `https://www.cert-in.org.in/` to conduct the official Web Application Security Assessment (WASA).
4. **Submit ABDM Production Undertaking:**
   * Provide the clean VAPT report and complete the live NHA UAT demonstration to receive production ABDM Gateway credentials.
