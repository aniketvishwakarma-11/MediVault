# MediVault Document Management - Database Schema Documentation

## Table: `public.documents`

| Column | Data Type | Constraints | Description |
| :--- | :--- | :--- | :--- |
| `id` | `UUID` | `PRIMARY KEY`, DEFAULT `uuid_generate_v4()` | Unique document record identifier |
| `patient_id` | `UUID` | `NOT NULL`, FK to `public.patients(id)` | Associated patient identifier |
| `uploaded_by` | `UUID` | `NOT NULL`, FK to `public.profiles(id)` | User identity who uploaded the file |
| `document_name` | `VARCHAR(255)` | `NOT NULL` | User-defined title for the medical document |
| `original_filename` | `VARCHAR(255)` | `NOT NULL` | Original client filename |
| `storage_key` | `VARCHAR(512)` | `UNIQUE`, `NOT NULL` | MinIO object key (`patients/{patientId}/{documentId}/original.ext`) |
| `bucket_name` | `VARCHAR(100)` | `NOT NULL`, DEFAULT `'medical-records'` | MinIO target bucket name |
| `mime_type` | `VARCHAR(100)` | `NOT NULL` | Validated MIME type |
| `file_extension` | `VARCHAR(20)` | `NOT NULL` | Extracted file extension (`pdf`, `png`, `jpeg`, `webp`) |
| `file_size` | `BIGINT` | `NOT NULL` | Exact size in bytes |
| `document_category` | `VARCHAR(100)` | `NOT NULL` | Medical category taxonomy value |
| `hospital_name` | `VARCHAR(255)` | Optional | Name of associated hospital/clinic |
| `doctor_name` | `VARCHAR(255)` | Optional | Name of prescribing or attending doctor |
| `visit_date` | `DATE` | Optional | Date of medical visit/report |
| `checksum_sha256` | `VARCHAR(64)` | `NOT NULL` | Cryptographic SHA-256 file checksum hex string |
| `upload_status` | `VARCHAR(50)` | DEFAULT `'COMPLETED'` | Status flag (`PENDING`, `COMPLETED`, `FAILED`) |
| `is_deleted` | `BOOLEAN` | DEFAULT `FALSE` | Soft delete flag |
| `created_at` | `TIMESTAMPTZ` | DEFAULT `CURRENT_TIMESTAMP` | Document creation timestamp |
| `updated_at` | `TIMESTAMPTZ` | DEFAULT `CURRENT_TIMESTAMP` | Document last modified timestamp |
| `blockchain_hash` | `VARCHAR(128)` | Optional | Polygon Amoy on-chain proof hash (Future extension) |
| `blockchain_tx` | `VARCHAR(128)` | Optional | Blockchain transaction ID (Future extension) |
| `ocr_completed` | `BOOLEAN` | DEFAULT `FALSE` | AI OCR raw text extraction status |
| `embedding_completed` | `BOOLEAN` | DEFAULT `FALSE` | Qdrant vector embedding status |
| `metadata_json` | `JSONB` | Optional | Complete structured JSON metadata object |

## Database Indexes
- `idx_documents_patient_id` on `patient_id`
- `idx_documents_storage_key` on `storage_key`
- `idx_documents_checksum` on `checksum_sha256`
- `idx_documents_category` on `document_category`
- `idx_documents_visit_date` on `visit_date`
- `idx_documents_created_at` on `created_at`
- `idx_documents_patient_checksum` on `(patient_id, checksum_sha256)` WHERE `is_deleted = false`
