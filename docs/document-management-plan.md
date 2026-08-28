# MediVault Chain AI - Medical Document Management Plan

## Executive Summary
This document defines the production architecture, folder structure, database schema, security model, storage layout, API design, and lifecycle management for the Medical Document Management Module of **MediVault Chain AI**.

---

## 1. Current Folder Structure
```
MediVault/
├── .gitignore
├── MediVault_Project_Description.md
├── MediVault_Project_Docs/
├── auth.txt
├── frontend/ (Next.js, React, Tailwind, TypeScript)
└── backend/
    ├── package.json
    ├── package-lock.json
    ├── schema.sql
    ├── tsconfig.json
    └── src/ (empty)
```

---

## 2. Required New Folders (`backend/src/`)
```
backend/src/
├── config/         # Environment variables & MinIO/PostgreSQL connection initializers
├── controllers/    # Express controllers handling HTTP requests and responses
├── services/       # Core business logic (upload, download, metadata, hashing, storage)
├── repositories/   # Data access layer for PostgreSQL database queries
├── routes/         # Express router endpoints
├── middleware/     # Auth, RBAC, Multer file upload, Zod validation, rate limiter
├── validators/     # Zod validation schemas for input payloads & queries
├── utils/          # SHA-256 hashing, response formatting, logger, custom error handlers
├── storage/        # MinIO client wrapper, bucket initialization, pre-signed URL generator
└── types/          # TypeScript interfaces, enums, and request definitions
```

---

## 3. Required Packages & Justification

| Package | Purpose & Justification |
| :--- | :--- |
| `minio` | Official S3-compatible client for storing encrypted medical files in MinIO. |
| `multer` | Express middleware for stream processing `multipart/form-data` uploads. |
| `uuid` & `@types/uuid` | Cryptographically secure UUIDv4 generation for document IDs and isolated storage keys. |
| `mime-types` & `@types/mime-types` | Precise MIME type resolution and validation. |
| `sharp` & `@types/sharp` | High-performance image processing for magic byte check and future thumbnail generation. |
| `crypto` | Native Node.js cryptographic module for generating SHA-256 document checksums. |
| `file-type` | Content inspection (magic byte verification) to prevent extension spoofing attacks. |
| `zod` | Runtime type safety and payload validation for metadata, IDs, and search queries. |
| `helmet` | HTTP header security middleware to prevent clickjacking, XSS, and MIME-sniffing. |
| `express-rate-limit` | Protection against DDoS and burst upload attacks. |

---

## 4. Environment Variables (`backend/.env`)
```env
# Server Configuration
PORT=5000
NODE_ENV=development

# MinIO Object Storage
MINIO_ENDPOINT=127.0.0.1
MINIO_PORT=9000
MINIO_ACCESS_KEY=medivault_minio_admin
MINIO_SECRET_KEY=medivault_minio_secret_key
MINIO_BUCKET=medical-records
MINIO_USE_SSL=false

# Document Upload Limits
MAX_FILE_SIZE_MB=15
SIGNED_URL_EXPIRY_SECONDS=900

# PostgreSQL Database
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/medivault

# Authentication & Security
JWT_SECRET=super_secret_jwt_key_medivault_chain_ai_2026
```

---

## 5. Database Schema & Migration (`public.documents`)

### Schema Definition
```sql
CREATE TABLE IF NOT EXISTS public.documents (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    uploaded_by UUID NOT NULL REFERENCES public.profiles(id),
    document_name VARCHAR(255) NOT NULL,
    original_filename VARCHAR(255) NOT NULL,
    storage_key VARCHAR(512) UNIQUE NOT NULL,
    bucket_name VARCHAR(100) NOT NULL DEFAULT 'medical-records',
    mime_type VARCHAR(100) NOT NULL,
    file_extension VARCHAR(20) NOT NULL,
    file_size BIGINT NOT NULL,
    document_category VARCHAR(100) NOT NULL,
    hospital_name VARCHAR(255),
    doctor_name VARCHAR(255),
    visit_date DATE,
    checksum_sha256 VARCHAR(64) NOT NULL,
    upload_status VARCHAR(50) DEFAULT 'COMPLETED',
    is_deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    blockchain_hash VARCHAR(128),
    blockchain_tx VARCHAR(128),
    ocr_completed BOOLEAN DEFAULT FALSE,
    embedding_completed BOOLEAN DEFAULT FALSE,
    metadata_json JSONB
);

-- Performance & Query Indexes
CREATE INDEX IF NOT EXISTS idx_documents_patient_id ON public.documents(patient_id);
CREATE INDEX IF NOT EXISTS idx_documents_storage_key ON public.documents(storage_key);
CREATE INDEX IF NOT EXISTS idx_documents_checksum ON public.documents(checksum_sha256);
CREATE INDEX IF NOT EXISTS idx_documents_category ON public.documents(document_category);
CREATE INDEX IF NOT EXISTS idx_documents_visit_date ON public.documents(visit_date);
CREATE INDEX IF NOT EXISTS idx_documents_created_at ON public.documents(created_at);
CREATE INDEX IF NOT EXISTS idx_documents_patient_checksum ON public.documents(patient_id, checksum_sha256) WHERE is_deleted = false;
```

---

## 6. Security Considerations
1. **Private MinIO Bucket**: Object access is set to `PRIVATE`. Raw MinIO paths are never exposed. Access is strictly via temporary (15 min) pre-signed URLs.
2. **Patient Ownership & Consent Validation**: Requests strictly verify `auth.uid()` ownership. Doctors or hospitals can only view documents if valid patient consent exists.
3. **Magic Byte File Inspection**: Checks file header signatures via `file-type` to detect disguised binaries or malware executables.
4. **Duplicate Prevention**: SHA-256 hash match check prevents double uploading for the same patient.
5. **Path Traversal Shield**: Filenames are discarded upon upload; storage keys are auto-generated UUID paths (`patients/{patientId}/{documentId}/original.{ext}`).
6. **Soft Delete**: Deletion flags `is_deleted = true` to preserve compliance and auditability.
7. **Audit Logging**: Every access, upload, metadata update, and soft delete emits an immutable record into `public.audit_logs`.

---

## 7. Supported Document Categories
- `Prescription`
- `Blood Report`
- `MRI`
- `CT Scan`
- `X-Ray`
- `ECG`
- `Discharge Summary`
- `Insurance`
- `Vaccination`
- `Prescription History`
- `Surgery`
- `Dental`
- `Eye`
- `Other`

---

## 8. API Specifications

| Method | Endpoint | Description | Access |
| :--- | :--- | :--- | :--- |
| `POST` | `/documents/upload` | Upload medical document & metadata | Authenticated (Patient/Doctor/Hospital) |
| `GET` | `/documents` | List patient documents (paginated/filtered) | Patient / Authorized Provider |
| `GET` | `/documents/categories` | Get allowed category taxonomy | Public / Authenticated |
| `GET` | `/documents/recent` | Fetch latest documents | Authenticated |
| `GET` | `/documents/search` | Search documents (category, doctor, date) | Authenticated |
| `GET` | `/documents/patient/:patientId` | List documents for specific patient | Authorized Doctor / Hospital |
| `GET` | `/documents/:id` | Fetch single document & pre-signed URL | Owner / Authorized Provider |
| `PATCH` | `/documents/:id` | Update document metadata | Document Owner / Uploader |
| `DELETE` | `/documents/:id` | Soft delete document | Document Owner / Admin |

---

## 9. Storage Hierarchy Architecture
```
medical-records (MinIO Bucket)
└── patients/
    └── {patientId}/
        └── {documentId}/
            ├── original.pdf (or .png, .jpg, .webp)
            ├── metadata.json
            └── thumbnail.jpg (Reserved for Phase 23)
```

---

## 10. File Lifecycle Workflow
```
[Client]
   │
   ├── (1) POST /documents/upload (Multipart File + JSON Metadata)
   ▼
[Auth & RBAC Middleware] ──(Validates JWT & Patient Permissions)──► [Validation Error]
   │
   ▼
[Multer & File Inspection Middleware] ──(Validates Size, Extension & Magic Bytes)
   │
   ▼
[Upload Service]
   ├── (2) Compute SHA-256 Hash
   ├── (3) Check PostgreSQL for Duplicate Hash (patient_id + checksum)
   ├── (4) Generate Storage Key (patients/{patientId}/{documentId}/original.ext)
   ├── (5) Stream File & metadata.json to MinIO Storage
   ├── (6) Execute Transaction: INSERT INTO public.documents & public.audit_logs
   │
   ▼
[HTTP 201 Created Response] (Standard JSON Format)
```

---

## 11. Extension Points (Future Phase Hooks)
- **OCR Pipeline**: Async queue hook on document creation to extract medical text.
- **Qdrant Vector RAG**: Async hook to index raw text into vector database for natural language medical Q&A.
- **Polygon Amoy Blockchain**: Async job to record `checksum_sha256` and transaction hash on-chain for tamper-proof verification.
- **Virus Scanner & Thumbnail Generator**: Inline stream hooks in storage strategy.
