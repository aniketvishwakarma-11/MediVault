# MediVault Storage Architecture

## Storage Provider
MinIO (AWS S3-Compatible Object Storage)

## Bucket Configuration
- **Bucket Name**: `medical-records` (configurable via `MINIO_BUCKET`)
- **Access Policy**: `PRIVATE` (Public access strictly blocked)

## Object Key Hierarchy
```
medical-records/
└── patients/
    └── {patientId}/
        └── {documentId}/
            ├── original.pdf (or original.png / jpeg / webp)
            └── metadata.json
```

## Security Strategy
1. **Isolated Path Names**: Raw storage keys use cryptographically generated UUIDs. Original filenames are never used in storage keys to prevent path traversal (`../`) and file overwrites.
2. **Pre-Signed Temporary URLs**: Direct HTTP object requests to MinIO are denied. Files are accessed via temporary pre-signed GET URLs with a 15-minute default expiration window.
3. **Magic Byte Verification**: Headers are inspected for signature signatures (`%PDF`, `\x89PNG`, `0xFFD8FF`, `RIFF...WEBP`) prior to storage streaming.
4. **Duplicate Deduplication**: SHA-256 hash checks prevent duplicate files from creating redundant storage objects for the same patient.
