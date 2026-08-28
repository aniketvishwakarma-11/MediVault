# 🏥 MediVault — Master Technical Audit, Architecture & Technology Guide

> **Authoritative Technical Documentation & Master Tutor Guide**  
> *Everything you need to understand, run, develop, and master the MediVault platform.*

---

## 📑 Table of Contents
1. [Product Overview & Architectural Vision](#1-product-overview--architectural-vision)
2. [Technology Stack: Deep-Dive by Component](#2-technology-stack-deep-dive-by-component)
3. [Database Architecture & PostgreSQL Data Model](#3-database-architecture--postgresql-data-model)
4. [Module-by-Module Code Audit](#4-module-by-module-code-audit)
   - [Module 1: Authentication, Authorization & RBAC](#module-1-authentication-authorization--rbac)
   - [Module 2: Medical Document Vault & MinIO Storage Engine](#module-2-medical-document-vault--minio-storage-engine)
   - [Module 3: Multi-Provider AI Medical Intelligence & OCR](#module-3-multi-provider-ai-medical-intelligence--ocr)
   - [Module 4: Longitudinal Clinical Timeline V2](#module-4-longitudinal-clinical-timeline-v2)
   - [Module 5: Emergency QR & Break-Glass Access System](#module-5-emergency-qr--break-glass-access-system)
   - [Module 6: Patient-Doctor Consent & Cryptographic Directory](#module-6-patient-doctor-consent--cryptographic-directory)
   - [Module 7: Web3 Blockchain Notarization & Tamper-Proofing](#module-7-web3-blockchain-notarization--tamper-proofing)
5. [Frontend Architecture & Component System](#5-frontend-architecture--component-system)
6. [End-to-End System Data Flows & Lifecycles](#6-end-to-end-system-data-flows--lifecycles)
7. [Developer Runbook, Setup & Extension Guide](#7-developer-runbook-setup--extension-guide)

---

## 1. Product Overview & Architectural Vision

MediVault is a **decentralized, AI-powered Health Data Exchange and Emergency Medical Access Platform**. It is designed to bridge the severe gaps between fragmented patient health records, hospital EMR systems, emergency first-responders, and tamper-proof legal auditability.

```
                                  ┌─────────────────────────────────────────────────────────┐
                                  │                     MEDIVAULT CORE                      │
                                  └────────────────────────────┬────────────────────────────┘
                                                               │
                ┌──────────────────────────────────────────────┼──────────────────────────────────────────────┐
                │                                              │                                              │
                ▼                                              ▼                                              ▼
┌───────────────────────────────┐              ┌───────────────────────────────┐              ┌───────────────────────────────┐
│     PATIENT HEALTH VAULT      │              │     DOCTOR EMR WORKSPACE      │              │      EMERGENCY FIRST RESP.    │
│  - Multi-category doc vault   │              │  - Consent-gated patient dir  │              │  - Zero-auth public QR scan   │
│  - AI OCR & lab extraction    │              │  - Longitudinal timeline view │              │  - Blood group, allergies     │
│  - Longitudinal timeline      │              │  - E-Prescription creator     │              │  - Verified break-glass term. │
│  - Consent approval/revocation│              │  - AI Diagnostic copilot      │              │  - Instant patient alerts     │
└───────────────────────────────┘              └───────────────────────────────┘              └───────────────────────────────┘
                │                                              │                                              │
                └──────────────────────────────────────────────┼──────────────────────────────────────────────┘
                                                               │
                                  ┌────────────────────────────┴────────────────────────────┐
                                  │             SECURE BACKEND SERVICES & DB                │
                                  │  - Express 5 + Node.js (TypeScript)                     │
                                  │  - PostgreSQL 16 (Row-Level Security & Triggers)        │
                                  │  - MinIO S3 Object Storage (Hierarchical Folders)       │
                                  │  - Google Gemini 2.5 Flash + NVIDIA NIM Fallback        │
                                  │  - Solidity Verifier on Polygon Amoy Testnet            │
                                  └─────────────────────────────────────────────────────────┘
```

### Core Problems MediVault Solves:
1. **Medical Record Fragmentation**: Patients visit multiple labs, clinics, and hospitals; their records are scattered across physical paper, PDFs, and isolated portals. MediVault unifies everything into a structured longitudinal timeline.
2. **Slow Emergency Diagnostics**: In unconscious or critical trauma situations, first responders don't know the patient's blood type, allergies, or chronic conditions. MediVault's **Emergency QR Pass** gives immediate, lifesaving access in seconds.
3. **Data Privacy & IDOR Prevention**: Medical data leaks easily without granular access controls. MediVault uses cryptographic consent grants and database-level **Row-Level Security (RLS)** so doctors can only view records for which patients have granted active permission.
4. **Data Tampering & Legal Disputes**: Medical records can be altered post-incident. MediVault notarizes SHA-256 record hashes onto the **Polygon Blockchain**, creating immutable proof of existence.

---

## 2. Technology Stack: Deep-Dive by Component

| Technology | Layer | Version / Ecosystem | Role in MediVault & Why It Was Chosen |
| :--- | :--- | :--- | :--- |
| **Next.js** | Frontend Framework | `16.3.0` (App Router) | Server-side rendering (SSR), static site generation, API routing, and file-based nested routing (`/patient`, `/doctor`, `/e/[credential]`). |
| **React** | UI Library | `19.2.8` | Declarative UI rendering, hooks (`useMemo`, `useCallback`, `useState`, `useContext`), optimistic state updates. |
| **TypeScript** | Language | `^5.0` (Frontend) / `^7.0` (Backend) | Strict static typing across schemas, API contracts, controllers, and services for maximum code reliability. |
| **Tailwind CSS** | Styling | `v4` (`@tailwindcss/postcss`) | Custom utility-first dark-mode theme, glassmorphism, responsive grids, and design tokens without runtime overhead. |
| **Express.js** | Backend Framework | `5.2.1` | High-performance RESTful API orchestration, routing, middleware pipeline, streaming responses, and error handling. |
| **PostgreSQL** | Primary Database | `16+` (via `pg ^8.22.0`) | Relational persistence, JSONB document querying, custom ENUM types, `pg_trgm` fuzzy search, and triggers. |
| **Supabase** | Auth & DB BaaS | `@supabase/supabase-js ^2.112.1` | Google OAuth provider, session JWT tokens, and user profile synchronization. |
| **MinIO** | Object Storage | `minio ^8.0.7` | S3-compatible local/cloud object storage for high-resolution medical PDFs, scans, and metadata JSON files. |
| **Google Gemini AI** | Primary AI LLM | `@google/generative-ai ^0.24.1` | Multimodal clinical entity extraction, biomarker normalization, lab status classification, and plain-English patient summaries. |
| **NVIDIA NIM** | Fallback AI LLM | Llama 3 70B Instruct (OpenAI-compatible) | High-availability fallback model with automatic circuit-breaking when Gemini rate limits (429) or times out. |
| **Tesseract.js** | OCR Engine | `^7.0.0` | Client/server Optical Character Recognition to extract raw text from scanned reports, prescriptions, and lab printouts. |
| **Ethers.js & Solidity** | Web3 / Blockchain | `ethers ^6.17.0` / Solidity `^0.8.20` | Smart contract deployment and interaction on Polygon Amoy Testnet for immutable document and consent notarization. |
| **Zod** | Validation | `^4.4.3` | Runtime schema validation for query params, request bodies, UUIDs, and metadata fields. |
| **Sharp** | Image Processing | `^0.35.3` | Image manipulation, resizing, and contrast preparation before OCR processing. |
| **Bcryptjs & JWT** | Security | `bcryptjs ^3.0.3` / `jsonwebtoken ^9.0.3` | Cryptographic password hashing and authorization token signing/verification. |

---

## 3. Database Architecture & PostgreSQL Data Model

The database schema is defined in [`backend/schema.sql`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/schema.sql).

### Entity-Relationship Overview

```mermaid
erDiagram
    USERS_PROFILE ||--|| PATIENTS : "has one"
    USERS_PROFILE ||--|| DOCTORS : "has one"
    USERS_PROFILE ||--|| HOSPITALS : "has one"
    PATIENTS ||--o{ DOCUMENTS : "owns"
    DOCUMENTS ||--o{ DOCUMENT_VERSIONS : "has versions"
    DOCUMENTS ||--o{ AI_ANALYSES : "analyzed by"
    AI_ANALYSES ||--o{ MEDICAL_KNOWLEDGE : "extracts"
    PATIENTS ||--o{ CLINICAL_EVENTS : "timeline of"
    CLINICAL_EVENTS ||--o{ CLINICAL_EPISODES : "grouped into"
    PATIENTS ||--o{ CONSENT_GRANTS : "grants access"
    DOCTORS ||--o{ CONSENT_GRANTS : "receives access"
    PATIENTS ||--o{ EMERGENCY_CREDENTIALS : "has"
    PATIENTS ||--o{ EMERGENCY_PROFILES : "configures"
    EMERGENCY_CREDENTIALS ||--o{ EMERGENCY_ACCESS_SESSIONS : "authenticates"
    PATIENTS ||--o{ EMERGENCY_ACCESS_LOGS : "logs audits"
```

### Table Breakdown:
1. **`public.users_profile`**: Base identity table linked to `auth.users(id)` storing `email`, `full_name`, `role` (`'patient' | 'doctor' | 'hospital' | 'admin'`), phone, and avatar URL.
2. **`public.patients`**: Patient health profile storing `date_of_birth`, `gender`, `blood_group`, `emergency_contact_name`, `emergency_contact_phone`, `vitals_json`, `allergies_json`, and `chronic_conditions_json`.
3. **`public.doctors`**: Healthcare provider profile storing `license_number`, `specialization`, `hospital_name`, and `verification_status` (`'pending' | 'verified' | 'rejected'`).
4. **`public.documents`**: Medical files metadata storing `patient_id`, `document_category` (`Blood Report`, `Prescription`, `MRI`, `CT Scan`, `X-Ray`, `Discharge Summary`, `ECG`, `Pathology`, `Other`), `file_size_bytes`, `checksum_sha256`, and `storage_path`.
5. **`public.ai_analyses`**: Stores model version, OCR raw text, clinical summary, raw response JSONB, and execution latency.
6. **`public.medical_knowledge`**: Granular extracted biomarkers (e.g., `Hemoglobin`, `HbA1c`, `Creatinine`) with `value`, `unit`, `reference_range`, and `status` (`'normal' | 'abnormal' | 'critical'`).
7. **`public.clinical_events`**: Durable longitudinal events generated from reports (e.g., `CONSULTATION`, `DIAGNOSIS`, `LAB_TEST`, `PRESCRIPTION`, `IMAGING`).
8. **`public.consent_grants`**: Formal consent records linking a `patient_id` to a `grantee_id` (doctor/hospital), including `status` (`'PENDING' | 'APPROVED' | 'DENIED' | 'REVOKED' | 'EXPIRED'`), `scope`, and `consent_hash`.
9. **`public.emergency_credentials`**: Stores SHA-256 hashed tokens for QR codes, credential versioning, and revocation timestamps.
10. **`public.emergency_access_sessions`**: Doctor break-glass sessions with reason codes, access levels, and expiration timers.
11. **`public.audit_logs`**: Immutable audit logs capturing every view, search, upload, and break-glass action with actor ID, IP hash, and timestamp.

---

## 4. Module-by-Module Code Audit

---

### Module 1: Authentication, Authorization & RBAC

- **Code Location**: [`backend/src/middleware/auth.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/middleware/auth.ts), [`frontend/src/context/AuthContext.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/context/AuthContext.tsx)

#### How It Works:
1. **Multi-Source Authentication**:
   - The user signs in via Google OAuth or Email through Supabase Auth on the frontend.
   - Supabase issues an access JWT token.
   - When requests hit Express endpoints, `authenticateJWT` extracts the Bearer token from the `Authorization` header.
2. **Authoritative Role Resolution**:
   - `authenticateJWT` resolves the user's role using a multi-tiered hierarchy:
     1. Queries the `public.doctors` table in PostgreSQL.
     2. Queries the `public.users_profile` table.
     3. Checks JWT claims (`user_metadata.role`, `app_metadata.role`).
     4. Inspects custom HTTP headers (`x-user-role`).
   - If the user is identified as a doctor, it automatically ensures a verified record exists in `public.doctors`.
3. **IDOR & Patient Access Protection**:
   - The `validatePatientAccess` middleware enforces patient isolation:
     - **Patients**: Can strictly access only their own records (`user.patient_id === targetPatientId`).
     - **Doctors**: Blocked unless they have an `APPROVED` grant in `public.consent_grants` that hasn't expired, OR an active break-glass emergency session in `public.emergency_access_sessions`.
     - **Admins**: Bypass checks for audit purposes.

---

### Module 2: Medical Document Vault & MinIO Storage Engine

- **Code Location**: [`backend/src/routes/document.routes.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/routes/document.routes.ts), [`backend/src/services/document.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/document.service.ts), [`backend/src/storage/minioStorage.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/storage/minioStorage.ts)

#### Upload & Storage Flow:
```mermaid
sequenceDiagram
    autonumber
    actor User as Patient / Doctor
    participant API as Express Document API
    participant Hash as SHA-256 Engine
    participant DB as PostgreSQL
    participant MinIO as MinIO Object Storage
    participant Queue as Async AI Job Queue

    User->>API: POST /documents/upload (multipart/form-data)
    API->>Hash: Compute SHA-256 checksum of buffer
    API->>DB: Check for duplicate document (patient_id + checksum)
    alt Duplicate Found
        API-->>User: 200 OK (Return existing doc record, isDuplicate=true)
    else Unique Document
        API->>MinIO: Upload original file to hierarchical path
        API->>MinIO: Upload metadata.json artifact
        API->>DB: INSERT into public.documents (status = 'PROCESSING')
        API->>DB: INSERT into public.audit_logs (action = 'DOCUMENT_UPLOAD')
        API->>Queue: AIJobQueue.enqueue(payload) (Non-blocking background job)
        API-->>User: 201 Created (Instant response, 0ms AI delay)
    end
```

#### MinIO Storage Hierarchy:
```
medical-records/
└── patients/
    └── John Doe - john@example.com/
        └── documents/
            └── Blood Report/
                └── Blood Report - Complete Blood Count - a1b2c3d4/
                    ├── original.pdf
                    └── metadata.json
```
- **Local Fallback**: If MinIO is temporarily unreachable, [`minioStorage.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/storage/minioStorage.ts#L71-L86) automatically saves the buffer to `./uploads/...` on the local disk without failing the user's upload.
- **Pre-signed URLs & Streaming**:
  - Secure downloads use temporary pre-signed S3 URLs (default 900-second expiration).
  - In-browser document previewing (`/documents/:id/file`) directly streams the raw byte stream with proper `Content-Type` headers.

---

### Module 3: Multi-Provider AI Medical Intelligence & OCR

- **Code Location**: [`backend/src/services/ai/medical_ai.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/ai/medical_ai.service.ts), [`gemini.provider.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/ai/providers/gemini.provider.ts), [`nvidia.provider.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/ai/providers/nvidia.provider.ts), [`ocr.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/ocr.service.ts)

#### Dual-Provider Failover Architecture:
```
                  ┌──────────────────────────────────────────────┐
                  │          OCR Text from Tesseract.js          │
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │    Primary Provider: Google Gemini 2.5/1.5   │
                  │   - Strict Medical Chief-of-Staff Prompt     │
                  │   - REST API + SDK Dual-Strategy             │
                  └──────────────┬───────────────────────────────┘
                                 │
                     ┌───────────┴───────────┐
                  Success                  Failure / 429 Rate Limit
                     │                               │
                     │                     ┌─────────▼─────────┐
                     │                     │Exponential Backoff│
                     │                     │Retries (Up to 3x) │
                     │                     └─────────┬─────────┘
                     │                               │ Retries Exhausted
                     │                               ▼
                     │                     ┌───────────────────────────┐
                     │                     │ Fallback: NVIDIA NIM      │
                     │                     │ (Llama 3 70B Instruct)    │
                     │                     └─────────┬─────────────────┘
                     │                               │
                     └───────────────┬───────────────┘
                                     ▼
                  ┌──────────────────────────────────────────────┐
                  │     JSON Sanitizer & Normalizer Service      │
                  │  - Strips markdown code blocks & comments    │
                  │  - Fixes unescaped quotes & trailing commas  │
                  │  - Normalizes biomarkers, LOINC units, status│
                  └──────────────────────┬───────────────────────┘
                                         │
                                         ▼
                  ┌──────────────────────────────────────────────┐
                  │ Database Persistence (ai_analyses & timeline)│
                  └──────────────────────────────────────────────┘
```

#### Structured Clinical Dimensions Extracted:
1. **Document Metadata**: Type, medical specialty, confidence score.
2. **Clinical Summary**: Executive 2-4 sentence doctor-level synopsis.
3. **Plain Language Explanation**: Empathetic, patient-friendly translation.
4. **Lab Results & Biomarkers**: Test name, value, unit, reference range, status (`NORMAL`, `LOW`, `HIGH`, `CRITICAL`), clinical meaning.
5. **Medications**: Drug name, dosage, frequency, route, duration, instructions.
6. **Diagnoses & Symptoms**: Primary conditions and clinical signs.
7. **Red Flags & Warning Signs**: Urgent symptoms requiring immediate care.
8. **Risk Factors & Lifestyle Advice**: Preventative recommendations.
9. **Recommended Follow-up & Repeat Tests**: Actionable next steps.
10. **Overall Health Status**: `STABLE` | `ATTENTION_REQUIRED` | `CRITICAL`.

---

### Module 4: Longitudinal Clinical Timeline V2

- **Code Location**: [`backend/src/services/timeline.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/timeline.service.ts), [`clinical-event.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/clinical-event.service.ts), [`clinical-episode.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/clinical-episode.service.ts), [`lab-trend.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/lab-trend.service.ts)

#### How the Longitudinal Timeline Works:
```
[2024-01-10: CBC Report]  ───┐
                             ├──► [Clinical Events Table] ──► [Clinical Episodes Clustering]
[2024-05-15: Doctor Visit]───┤        (Idempotent SHA-256)      - Hypertension Journey (Ongoing)
                             │                                  - Acute Bronchitis (Resolved)
[2024-08-20: Lipid Panel] ───┘                                  - Lab Trends (Cholesterol 210 -> 185)
```

1. **Deterministic Idempotency**: Each event generates a SHA-256 hash from `(patientId | eventType | date | discriminator)`. Re-running AI analysis updates existing events in-place via `ON CONFLICT (idempotency_key) DO UPDATE` without duplicating entries.
2. **Clinical Episodes**: Groups related consultations, lab tests, prescriptions, and imaging studies into episodic containers (e.g., "Type 2 Diabetes Management", "Post-Op Knee Surgery Recovery").
3. **Biomarker Trend Analysis**: Calculates historical trajectories (Baseline vs. Current, % delta, and trend classification: `IMPROVING`, `WORSENING`, `STABLE`).
4. **Evidence-Based Health Narrative**: Synthesizes an executive overview purely derived from verified database rows with zero hallucinated diagnoses.

---

### Module 5: Emergency QR & Break-Glass Access System

- **Code Location**: [`backend/src/services/emergency.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/emergency.service.ts), [`frontend/src/app/e/[credential]/page.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/app/e/%5Bcredential%5D/page.tsx), [`frontend/src/app/doctor/emergency/page.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/app/doctor/emergency/page.tsx)

#### Architecture & Cryptographic Workflow:
```
 ┌────────────────────────┐
 │ Patient Emergency Pass │
 │   (QR Code on Phone/   │
 │    Physical Card)      │
 └───────────┬────────────┘
             │
             │ Scanned by First Responder (Camera / Browser)
             ▼
 ┌────────────────────────────────────────────────────────┐
 │ GET /e/[rawToken]                                      │
 │ - Public Gateway (NO LOGIN REQUIRED)                   │
 │ - Backend computes SHA-256(rawToken)                   │
 │ - Looks up public.emergency_credentials                │
 │ - Validates status === 'ACTIVE' & expires_at > NOW()   │
 └───────────┬────────────────────────────────────────────┘
             │
             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Public Emergency Profile View                          │
 │ - Blood Group Badge (e.g. O+)                          │
 │ - Critical Allergies (Penicillin, Peanuts)             │
 │ - Emergency Contacts with One-Tap Direct Calling       │
 │ - Chronic Conditions & Resuscitation Notes             │
 │ - Emergency Helplines (112 / 108 / 911)                │
 └───────────┬────────────────────────────────────────────┘
             │
             │ Doctor needs full medical records in trauma bay?
             ▼
 ┌────────────────────────────────────────────────────────┐
 │ Break-Glass Clinical Terminal (/doctor/emergency)      │
 │ 1. Verified Doctor Logs In with Medical Credentials    │
 │ 2. Selects Emergency Justification (e.g.,              │
 │    "LIFE_THREATENING_EMERGENCY", "PATIENT_UNCONSCIOUS")│
 │ 3. Submits Break-Glass Request                         │
 │ 4. Backend creates emergency_access_sessions (2-8 hrs) │
 │ 5. Patient receives immediate in-app Alert Notification│
 │ 6. Access hash is anchored to Polygon Blockchain       │
 │ 7. Full clinical timeline unlocked for emergency care  │
 └────────────────────────────────────────────────────────┘
```

---

### Module 6: Patient-Doctor Consent & Cryptographic Directory

- **Code Location**: [`backend/src/services/consent.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/consent.service.ts), [`frontend/src/app/patient/consent/page.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/app/patient/consent/page.tsx), [`frontend/src/app/doctor/patients/page.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/app/doctor/patients/page.tsx)

#### Canonical Consent Hashing:
When a patient approves a request, MediVault computes a deterministic SHA-256 hash across a fixed-order canonical string:
```typescript
const canonical =
  `patientId=${payload.patientId}` +
  `|granteeId=${payload.granteeId}` +
  `|scope=${payload.scope}` +
  `|purpose=${payload.purpose}` +
  `|issuedAt=${payload.issuedAt}` +
  `|expiresAt=${payload.expiresAt}` +
  `|version=${payload.version}`;

const consentHash = crypto.createHash('sha256').update(canonical, 'utf8').digest('hex');
```
This guarantees that neither the doctor, the patient, nor the database administrator can alter the agreed scope or duration of consent retroactively.

---

### Module 7: Web3 Blockchain Notarization & Tamper-Proofing

- **Code Location**: [`contracts/MedicalRecordVerifier.sol`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/contracts/MedicalRecordVerifier.sol), [`backend/src/services/blockchain.service.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/services/blockchain.service.ts)

#### Solidity Smart Contract Architecture:
The smart contract [`MedicalRecordVerifier.sol`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/contracts/MedicalRecordVerifier.sol) is compiled with Solidity `^0.8.20` and deployed on the **Polygon Amoy Testnet (ChainID 80002)**:

```solidity
// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

contract MedicalRecordVerifier {
    struct NotarizedRecord {
        bytes32 documentHash;
        address patient;
        uint256 timestamp;
        string metadataURI;
        bool isNotarized;
    }

    struct ConsentGrant {
        address patient;
        address entity;
        uint256 expiresAt;
        bool active;
    }

    mapping(bytes32 => NotarizedRecord) public records;
    mapping(address => mapping(address => ConsentGrant)) public consents;

    event RecordNotarized(bytes32 indexed documentHash, address indexed patient, uint256 timestamp, string metadataURI);
    event ConsentGranted(address indexed patient, address indexed entity, uint256 expiresAt);
    event ConsentRevoked(address indexed patient, address indexed entity);

    function notarizeRecord(bytes32 documentHash, string memory metadataURI) external;
    function verifyRecord(bytes32 documentHash) external view returns (bool isNotarized, address patient, uint256 timestamp, string memory metadataURI);
    function grantConsent(address entity, uint256 durationSeconds) external;
    function revokeConsent(address entity) external;
    function checkConsent(address patient, address entity) external view returns (bool);
}
```

---

## 5. Frontend Architecture & Component System

```
frontend/src/
├── app/
│   ├── layout.tsx                     # Global Root Layout (Fonts, Theme, AuthProvider)
│   ├── page.tsx                       # Landing Page with Live Demos & Animations
│   ├── auth/                          # Authentication callback handler
│   ├── patient/                       # Patient Portal
│   │   ├── dashboard/                 # Metric counters, recent uploads, active alerts
│   │   ├── reports/                   # Document vault, filters, upload modal, viewer
│   │   ├── timeline/                  # Longitudinal clinical timeline & episodes
│   │   ├── emergency/                 # Emergency Pass generator, QR viewer, passcard
│   │   ├── consent/                   # Incoming doctor requests, active/revoked grants
│   │   ├── ai-copilot/                # Interactive patient clinical assistant
│   │   └── profile/                   # Vitals, medical history, emergency contacts
│   ├── doctor/                        # Doctor EMR Portal
│   │   ├── dashboard/                 # Clinical caseload, pending reviews, quick actions
│   │   ├── patients/                  # Consent directory, patient search & requests
│   │   ├── consultations/             # Clinical encounter manager
│   │   ├── prescriptions/             # Digital Rx creator with dosage schedules
│   │   ├── copilot/                   # AI Diagnostic & drug interaction copilot
│   │   └── emergency/                 # Break-Glass Emergency Terminal
│   ├── e/[credential]/                # Public Zero-Auth Emergency Scan Portal
│   └── components/
│       ├── DocumentViewerModal.tsx    # PDF/Image viewer with AI extraction sidebar
│       ├── EmergencyCardPass.tsx      # Printable & Apple-wallet style Pass Card
│       ├── Navbar.tsx & Footer.tsx    # Navigation headers with role badges
│       └── timeline/                  # 10 specialized timeline & journey components
├── context/
│   └── AuthContext.tsx                # Unified auth, role switching, demo mode engine
└── lib/
    ├── supabase.ts                    # Supabase client singleton
    ├── emergency-api.ts               # Typed Emergency API client
    ├── consent-api.ts                 # Typed Consent API client
    └── timeline-api.ts                # Typed Timeline API client
```

---

## 6. End-to-End System Data Flows & Lifecycles

### Complete Upload-to-Intelligence Lifecycle

```
[1. User Uploads PDF/Image]
          │
          ▼
[2. Express Multer Middleware] ──► Validates MIME Type (PDF, PNG, JPEG, WebP)
          │
          ▼
[3. DocumentService.uploadMedicalDocument]
          │
          ├─► Compute SHA-256 Checksum ──► Check Duplicate in Postgres
          ├─► Upload to MinIO S3 (original.pdf + metadata.json)
          ├─► Insert DB Row (public.documents, status='PROCESSING')
          └─► Write Immutable Audit Trail (public.audit_logs)
          │
          ▼
[4. AIJobQueue (Async In-Memory Queue)]
          │
          ├─► Step A: OCR Text Extraction (Tesseract.js / Sharp pre-processing)
          │
          ├─► Step B: Multi-Model AI Analysis
          │          ├── Try Google Gemini 2.5 Flash
          │          └── On 429/Timeout ──► Failover to NVIDIA NIM (Llama 3 70B)
          │
          ├─► Step C: JSON Sanitization & Normalization
          │
          ├─► Step D: Persistence & Clinical Event Generation
          │          ├── Insert public.ai_analyses
          │          ├── Extract Biomarkers into public.medical_knowledge
          │          ├── Generate Longitudinal Events in public.clinical_events
          │          └── Cluster into public.clinical_episodes
          │
          └─► Step E: Mark Document status = 'COMPLETED'
          │
          ▼
[5. Frontend Dashboard & Timeline Instantly Reflect New Clinical Data]
```

---

## 7. Developer Runbook, Setup & Extension Guide

### Environment Variables Setup

#### Backend (`backend/.env`):
```env
PORT=5000
NODE_ENV=development
CORS_ORIGIN=http://localhost:3000
JWT_SECRET=super_secret_jwt_key_medivault_chain_ai_2026

# PostgreSQL Database (Supabase or Local)
DATABASE_URL=postgresql://postgres:[password]@db.[ref].supabase.co:5432/postgres

# MinIO Object Storage
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=minioadmin
MINIO_SECRET_KEY=minioadmin
MINIO_BUCKET=medical-records
SIGNED_URL_EXPIRY_SECONDS=900

# AI Models & Providers
PRIMARY_MEDICAL_MODEL=gemini
PRIMARY_MEDICAL_MODEL_VERSION=gemini-1.5-flash
GEMINI_API_KEY=your_gemini_api_key_here

FALLBACK_MEDICAL_MODEL=nvidia
NVIDIA_NIM_API_KEY=your_nvidia_api_key_here
AI_MAX_RETRIES=3

# Web3 / Blockchain
POLYGON_AMOY_RPC=https://rpc-amoy.polygon.technology
```

#### Frontend (`frontend/.env.local`):
```env
NEXT_PUBLIC_API_URL=http://localhost:5000
NEXT_PUBLIC_SUPABASE_URL=https://[ref].supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

---

### How to Run Locally

```bash
# Step 1: Start MinIO Object Storage
.\minio.exe server .\minio_data --console-address ":9001"

# Step 2: Start Backend Server (with auto-migrations)
cd backend
npm install
npm run dev

# Step 3: Start Frontend Server
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

---

### How to Extend MediVault

1. **Adding a New Medical Document Category**:
   - Add the category string to `ALLOWED_CATEGORIES` in [`backend/src/types/document.ts`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/src/types/document.ts).
   - Add the category to PostgreSQL ENUM `document_category` in [`backend/schema.sql`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/backend/schema.sql).
   - Add the filter badge in [`frontend/src/app/patient/reports/page.tsx`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/frontend/src/app/patient/reports/page.tsx).

2. **Adding a New AI Provider (e.g., Anthropic Claude / OpenAI GPT-4o)**:
   - Implement `AIProvider` interface under `backend/src/services/ai/providers/`.
   - Register it in `backend/src/services/ai/providers/provider.registry.ts`.
   - Set `PRIMARY_MEDICAL_MODEL` or `FALLBACK_MEDICAL_MODEL` in `.env`.

3. **Deploying the Smart Contract to Polygon Mainnet**:
   - Compile [`contracts/MedicalRecordVerifier.sol`](file:///c:/Users/HP/OneDrive/Desktop/MediVault/contracts/MedicalRecordVerifier.sol) using Hardhat or Foundry.
   - Deploy using your wallet private key to Polygon Mainnet (`chainId 137`).
   - Update `POLYGON_AMOY_RPC` in `backend/.env` with your RPC provider URL.

---
*MediVault Documentation Engine — Generated for Developer Mastery & Architectural Excellence.*
