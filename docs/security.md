# MediVault Document Management - Security Documentation

## 1. Authentication & Role-Based Access Control (RBAC)
- All document mutation and access routes require cryptographically verified JWT bearer tokens.
- Role permissions are strictly enforced:
  - **Patients**: Can access and manage their own documents (`auth.uid() = patient.user_id`).
  - **Doctors / Hospitals**: Access is granted only when an approved patient consent record exists in `public.consent_requests`.

## 2. File Verification & Anti-Spoofing
- **Extension & MIME Whitelist**: Only PDF, PNG, JPEG, WEBP files are permitted.
- **Magic Byte Content Inspection**: Buffers are inspected at the binary level (`validateMagicBytes`) to verify file header signatures (`%PDF`, `\x89PNG`, `0xFFD8FF`, `RIFF...WEBP`). Executables disguised as images or PDFs are immediately rejected.
- **File Size Enforcement**: Strict request limits enforced via Multer stream limits (`MAX_FILE_SIZE_MB`, default 15MB).

## 3. Storage Key Privacy & Path Traversal Prevention
- Original client filenames are stripped before saving to storage.
- Storage keys follow randomized UUID subpath layouts (`patients/{patientId}/{documentId}/original.ext`).
- MinIO buckets are configured for private access. Object links are generated dynamically server-side using pre-signed temporary URLs (15-minute expiration).

## 4. Integrity & Duplicate Protection
- Every uploaded document generates a deterministic SHA-256 cryptographic checksum.
- Database checks prevent identical documents from being double-stored per patient.

## 5. Network & HTTP Security
- **Helmet**: Secures response headers against XSS, clickjacking, and MIME sniffing.
- **Rate Limiting**: Protects endpoints against brute-force and DoS upload floods (30 upload requests per 15 minutes per IP).
- **Audit Logs**: Comprehensive event recording in `public.audit_logs` for all upload, access, view, update, and soft delete operations.
