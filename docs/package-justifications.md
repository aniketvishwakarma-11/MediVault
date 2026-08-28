# Package Justifications - Medical Document Management Module

This document provides technical justifications for every package installed and utilized within the Medical Document Management Module of **MediVault Chain AI**.

---

## 1. Production Dependencies

### `minio`
- **Purpose**: Official SDK for interacting with MinIO and AWS S3-compatible object storage servers.
- **Why it is used**: Stores, retrieves, lists, and deletes encrypted medical document objects and metadata files. Enables generating secure, time-bounded pre-signed URLs without making the bucket public.

### `multer`
- **Purpose**: Middleware for handling `multipart/form-data` uploads in Node.js/Express.
- **Why it is used**: Buffers and streams incoming file uploads from HTTP POST requests, enforcing strict file size limits and initial content checks before passing files to storage handlers.

### `uuid`
- **Purpose**: Cryptographically strong RFC4122 UUID generator.
- **Why it is used**: Generates immutable unique identifiers (UUIDv4) for document records in PostgreSQL and constructs collision-free, randomized object storage paths (`patients/{patientId}/{documentId}/original.ext`). Prevents original filename exposure and path traversal vulnerabilities.

### `mime-types`
- **Purpose**: MIME type dictionary and file extension lookup utility.
- **Why it is used**: Validates incoming file MIME types against strict medical document whitelist rules (PDF, PNG, JPEG, WEBP) and maps MIME types to safe, canonical file extensions.

### `sharp`
- **Purpose**: High-performance Node.js image processing library powered by libvips.
- **Why it is used**: Reads and inspects raw image streams to verify image integrity, extract dimensions/format, and generate optimized thumbnail preview images for medical scans (X-Ray, MRI, CT Scan) without locking the main thread.

### `file-type`
- **Purpose**: Detects file type by checking true magic byte headers of Buffer/Stream.
- **Why it is used**: Security critical. Prevents file spoofing attacks where malicious executables or scripts are renamed with `.pdf` or `.png` extensions. Validates the binary header of every uploaded document.

### `zod`
- **Purpose**: TypeScript-first schema declaration and validation library.
- **Why it is used**: Enforces strict runtime type validation for API request bodies, multipart metadata fields, route query parameters, UUID formats, and document categories before processing requests.

### `helmet`
- **Purpose**: Express middleware that sets security-focused HTTP response headers.
- **Why it is used**: Mitigates common web application vulnerabilities like cross-site scripting (XSS), clickjacking, MIME-type sniffing, and drive-by downloads.

### `express-rate-limit`
- **Purpose**: Rate limiting middleware for Express.
- **Why it is used**: Prevents Denial of Service (DoS) attacks, brute-force requests, and automated storage flooding by restricting the number of document upload and download requests per client IP within a configurable time window.

---

## 2. Dev Dependencies

### `@types/multer`, `@types/uuid`, `@types/mime-types`, `@types/sharp`, `@types/express-rate-limit`
- **Purpose**: TypeScript type definitions.
- **Why it is used**: Provides full type safety, autocomplete, compile-time type checking, and interface definitions across all controller, service, repository, and middleware files.
